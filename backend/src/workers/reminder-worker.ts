/**
 * Reminder worker — standalone process (npm run worker:reminder).
 *
 * This process is intentionally SEPARATE from the Fastify HTTP API: it never
 * runs inside the API and the API boots without it. On a fixed interval
 * (REMINDER_POLL_INTERVAL_MS) it:
 *   1. atomically claims due reminder jobs (claim_due_reminder_jobs),
 *   2. dispatches each via the notification-dispatch service,
 *   3. marks jobs delivered or failed (with exponential backoff +
 *      next_attempt_at on failure, using utils/backoff), and
 *   4. periodically expires stale jobs and requeues jobs stuck in processing.
 *
 * It installs SIGTERM/SIGINT handlers for graceful shutdown (it finishes the
 * in-flight batch, stops the interval, and exits 0). If the service-role key
 * is absent it logs a clear message and exits cleanly — a worker cannot do any
 * privileged work without it.
 *
 * Security: it never logs tokens, secrets, or notification payload bodies.
 */

import { pino, type Logger } from 'pino';
import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { getConfig, hasServiceRole, type AppConfig } from '../config/index.js';
import { createServiceClient, type TypedSupabaseClient } from '../plugins/supabase-clients.js';
import {
  claimDueReminderJobs,
  expireStaleReminderJobs,
  requeueStuckReminderJobs,
  type ReminderJobRow,
} from '../services/reminder-service.js';
import { dispatchReminder } from '../services/notification-dispatch.js';
import { computeBackoff } from '../utils/backoff.js';
import type { Database } from '../types/database.types.js';

type ReminderJobUpdate = Database['public']['Tables']['reminder_jobs']['Update'];

const COMPONENT = 'reminder-worker';
/** Run the maintenance RPCs (expire/requeue) at most this often. */
const MAINTENANCE_INTERVAL_MS = 60_000;
/** Max delivery attempts before a job is marked permanently failed. */
const MAX_ATTEMPTS = 6;

export interface ReminderWorkerDeps {
  config?: AppConfig;
  client?: TypedSupabaseClient;
  logger?: Logger;
  /** Dispatch override (tests inject a fake). */
  dispatch?: typeof dispatchReminder;
  /** Deterministic clock for tests. */
  now?: () => Date;
}

export interface ReminderWorker {
  /** Process a single poll cycle (claim + dispatch). Returns a summary. */
  runOnce(): Promise<{ claimed: number; delivered: number; failed: number }>;
  /** Run the expire + requeue maintenance RPCs. */
  runMaintenance(): Promise<{ expired: number; requeued: number }>;
  /** Start the polling loop (used by the entrypoint, not by unit tests). */
  start(): void;
  /** Stop the loop and wait for the in-flight cycle to settle. */
  stop(): Promise<void>;
}

/**
 * Build a human-readable, non-secret worker identity used for job locking
 * (`claim_due_reminder_jobs.p_worker`). Combines the host and a short random
 * suffix so concurrent workers never collide.
 */
function workerName(): string {
  let host = 'worker';
  try {
    host = hostname();
  } catch {
    // hostname() can throw in restricted sandboxes — fall back to a constant.
  }
  return `${COMPONENT}@${host}#${randomUUID().slice(0, 8)}`;
}

/**
 * Create a reminder worker. Pure of side effects until `start()` / `runOnce()`
 * is called, which makes it unit-testable with a mocked service client.
 */
export function createReminderWorker(deps: ReminderWorkerDeps = {}): ReminderWorker {
  const config = deps.config ?? getConfig();
  const logger =
    deps.logger ?? pino({ level: config.LOG_LEVEL, name: COMPONENT });
  const client = deps.client ?? createServiceClient(config);
  const dispatch = deps.dispatch ?? dispatchReminder;
  const now = deps.now ?? (() => new Date());
  const worker = workerName();

  let pollTimer: NodeJS.Timeout | undefined;
  let maintenanceTimer: NodeJS.Timeout | undefined;
  let running = false;
  let stopped = false;
  /** Tracks the in-flight cycle so stop() can await it. */
  let inFlight: Promise<unknown> = Promise.resolve();

  /** Mark a job delivered. */
  async function markDelivered(job: ReminderJobRow): Promise<void> {
    const update: ReminderJobUpdate = {
      status: 'delivered',
      delivered_at: now().toISOString(),
      last_attempt_at: now().toISOString(),
      last_error: null,
      next_attempt_at: null,
    };
    const { error } = await client.from('reminder_jobs').update(update).eq('id', job.id);
    if (error) {
      logger.error({ jobId: job.id, err: error.message }, 'failed to mark job delivered');
    }
  }

  /**
   * Mark a job failed. If attempts remain, keep it `pending` with a backed-off
   * `next_attempt_at`; once MAX_ATTEMPTS is exhausted, mark it `failed`.
   */
  async function markFailed(job: ReminderJobRow, reason: string): Promise<void> {
    const attempts = (job.attempt_count ?? 0) + 1;
    const exhausted = attempts >= MAX_ATTEMPTS;
    const update: ReminderJobUpdate = {
      status: exhausted ? 'failed' : 'pending',
      attempt_count: attempts,
      last_attempt_at: now().toISOString(),
      // Store a short, non-secret reason only.
      last_error: reason.slice(0, 500),
      locked_at: null,
      locked_by: null,
      next_attempt_at: exhausted
        ? null
        : new Date(now().getTime() + computeBackoff(attempts)).toISOString(),
    };
    const { error } = await client.from('reminder_jobs').update(update).eq('id', job.id);
    if (error) {
      logger.error({ jobId: job.id, err: error.message }, 'failed to mark job failed');
    }
  }

  async function processJob(job: ReminderJobRow): Promise<boolean> {
    try {
      const summary = await dispatch(
        {
          userId: job.user_id,
          reminderJobId: job.id,
          // Payload body is intentionally generic + non-secret; the client app
          // renders the real event details from the reminder_job_id link.
          payload: {
            title: 'Free Fire HQ reminder',
            body: `You have a ${job.reminder_type.replace(/_/g, ' ')} reminder.`,
            data: { reminderType: job.reminder_type, eventId: job.event_id },
          },
        },
        { client, config },
      );
      const anySent = summary.outcomes.some((o) => o.status === 'sent');
      const allSkipped =
        summary.outcomes.length > 0 && summary.outcomes.every((o) => o.status === 'skipped');

      if (anySent || summary.outcomes.length === 0 || allSkipped) {
        // No subscriptions or all providers unavailable: treat as delivered so
        // we don't retry forever against a user with no active subscription.
        await markDelivered(job);
        return true;
      }
      await markFailed(job, 'All delivery attempts failed.');
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown dispatch error';
      logger.error({ jobId: job.id, reminderType: job.reminder_type }, 'dispatch error');
      await markFailed(job, message);
      return false;
    }
  }

  async function runOnce(): Promise<{ claimed: number; delivered: number; failed: number }> {
    const jobs = await claimDueReminderJobs(worker, config.REMINDER_BATCH_SIZE, {
      client,
      config,
    });
    let delivered = 0;
    let failed = 0;
    for (const job of jobs) {
      const ok = await processJob(job);
      if (ok) {
        delivered += 1;
      } else {
        failed += 1;
      }
    }
    if (jobs.length > 0) {
      logger.info({ claimed: jobs.length, delivered, failed }, 'reminder cycle complete');
    }
    return { claimed: jobs.length, delivered, failed };
  }

  async function runMaintenance(): Promise<{ expired: number; requeued: number }> {
    const expired = await expireStaleReminderJobs({ client, config });
    const requeued = await requeueStuckReminderJobs(undefined, { client, config });
    if (expired > 0 || requeued > 0) {
      logger.info({ expired, requeued }, 'reminder maintenance complete');
    }
    return { expired, requeued };
  }

  function schedulePoll(): void {
    if (stopped) {
      return;
    }
    pollTimer = setTimeout(() => {
      if (running || stopped) {
        schedulePoll();
        return;
      }
      running = true;
      inFlight = runOnce()
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          logger.error({ err: message }, 'reminder cycle failed');
        })
        .finally(() => {
          running = false;
          schedulePoll();
        });
    }, config.REMINDER_POLL_INTERVAL_MS);
    // Do not keep the event loop alive solely for the timer.
    pollTimer.unref?.();
  }

  function scheduleMaintenance(): void {
    if (stopped) {
      return;
    }
    maintenanceTimer = setTimeout(() => {
      runMaintenance()
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          logger.error({ err: message }, 'reminder maintenance failed');
        })
        .finally(() => scheduleMaintenance());
    }, MAINTENANCE_INTERVAL_MS);
    maintenanceTimer.unref?.();
  }

  function start(): void {
    logger.info(
      { worker, pollIntervalMs: config.REMINDER_POLL_INTERVAL_MS, batch: config.REMINDER_BATCH_SIZE },
      'reminder worker started',
    );
    schedulePoll();
    scheduleMaintenance();
  }

  async function stop(): Promise<void> {
    stopped = true;
    if (pollTimer) {
      clearTimeout(pollTimer);
    }
    if (maintenanceTimer) {
      clearTimeout(maintenanceTimer);
    }
    // Let the in-flight cycle finish so we don't orphan claimed jobs.
    await inFlight;
    logger.info('reminder worker stopped');
  }

  return { runOnce, runMaintenance, start, stop };
}

/** Entrypoint: exits cleanly (code 0) with a clear log when no service role. */
async function main(): Promise<void> {
  const config = getConfig();
  const logger = pino({ level: config.LOG_LEVEL, name: COMPONENT });

  if (!hasServiceRole(config)) {
    logger.warn(
      'SUPABASE_SERVICE_ROLE_KEY is not configured — the reminder worker requires it. ' +
        'Exiting cleanly (set the key to enable background reminder delivery).',
    );
    process.exit(0);
  }

  const worker = createReminderWorker({ config, logger });
  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info({ signal }, 'received shutdown signal');
    worker
      .stop()
      .then(() => process.exit(0))
      .catch((err: unknown) => {
        logger.error({ err: err instanceof Error ? err.message : String(err) }, 'shutdown error');
        process.exit(1);
      });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  worker.start();
}

/**
 * Only auto-run when this file is the process entrypoint (run via
 * `npm run worker:reminder`), never when imported by a test. We match on the
 * entry filename rather than URL equality, which is brittle across platforms.
 */
function isEntrypoint(): boolean {
  const entry = process.argv[1];
  return typeof entry === 'string' && /reminder-worker\.(ts|js)$/.test(entry.replace(/\\/g, '/'));
}

if (isEntrypoint()) {
  void main();
}
