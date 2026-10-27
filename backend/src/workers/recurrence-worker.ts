/**
 * Recurrence worker — standalone process (npm run worker:recurrence).
 *
 * Separate from the Fastify HTTP API. On a fixed interval it rolls the
 * recurrence horizon forward by calling `generate_recurrence_occurrences`
 * (via the schedule service), materializing occurrence events for the next
 * RECURRENCE_HORIZON_DAYS. It logs the number of occurrences generated.
 *
 * Installs SIGTERM/SIGINT handlers for graceful shutdown (finishes the
 * in-flight run, stops the interval, exits 0). If the service-role key is
 * absent it logs a clear message and exits cleanly.
 *
 * In production, Supabase Cron is the primary scheduler for this RPC; this
 * standalone worker is the alternative for hosts without Supabase Cron.
 */

import { pino, type Logger } from 'pino';
import { getConfig, hasServiceRole, type AppConfig } from '../config/index.js';
import { createServiceClient, type TypedSupabaseClient } from '../plugins/supabase-clients.js';
import { runRecurrenceGeneration } from '../services/schedule.js';

const COMPONENT = 'recurrence-worker';
/** Default cadence: roll the horizon forward hourly. */
const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

export interface RecurrenceWorkerDeps {
  config?: AppConfig;
  client?: TypedSupabaseClient;
  logger?: Logger;
  /** Generation cadence override (defaults to hourly). */
  intervalMs?: number;
}

export interface RecurrenceWorker {
  /** Run a single generation pass; returns occurrences generated. */
  runOnce(): Promise<number>;
  start(): void;
  stop(): Promise<void>;
}

export function createRecurrenceWorker(deps: RecurrenceWorkerDeps = {}): RecurrenceWorker {
  const config = deps.config ?? getConfig();
  const logger = deps.logger ?? pino({ level: config.LOG_LEVEL, name: COMPONENT });
  const client = deps.client ?? createServiceClient(config);
  const intervalMs = deps.intervalMs ?? DEFAULT_INTERVAL_MS;

  let timer: NodeJS.Timeout | undefined;
  let running = false;
  let stopped = false;
  let inFlight: Promise<unknown> = Promise.resolve();

  async function runOnce(): Promise<number> {
    const count = await runRecurrenceGeneration(config.RECURRENCE_HORIZON_DAYS, {
      client,
      config,
    });
    logger.info(
      { generated: count, horizonDays: config.RECURRENCE_HORIZON_DAYS },
      'recurrence generation complete',
    );
    return count;
  }

  function schedule(): void {
    if (stopped) {
      return;
    }
    timer = setTimeout(() => {
      if (running || stopped) {
        schedule();
        return;
      }
      running = true;
      inFlight = runOnce()
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          logger.error({ err: message }, 'recurrence generation failed');
        })
        .finally(() => {
          running = false;
          schedule();
        });
    }, intervalMs);
    timer.unref?.();
  }

  function start(): void {
    logger.info({ intervalMs, horizonDays: config.RECURRENCE_HORIZON_DAYS }, 'recurrence worker started');
    // Run immediately on start so a freshly-deployed worker fills the horizon,
    // then fall into the interval cadence.
    running = true;
    inFlight = runOnce()
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        logger.error({ err: message }, 'initial recurrence generation failed');
      })
      .finally(() => {
        running = false;
        schedule();
      });
  }

  async function stop(): Promise<void> {
    stopped = true;
    if (timer) {
      clearTimeout(timer);
    }
    await inFlight;
    logger.info('recurrence worker stopped');
  }

  return { runOnce, start, stop };
}

async function main(): Promise<void> {
  const config = getConfig();
  const logger = pino({ level: config.LOG_LEVEL, name: COMPONENT });

  if (!hasServiceRole(config)) {
    logger.warn(
      'SUPABASE_SERVICE_ROLE_KEY is not configured — the recurrence worker requires it. ' +
        'Exiting cleanly (set the key to enable occurrence generation).',
    );
    process.exit(0);
  }

  const worker = createRecurrenceWorker({ config, logger });
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

function isEntrypoint(): boolean {
  const entry = process.argv[1];
  return typeof entry === 'string' && /recurrence-worker\.(ts|js)$/.test(entry.replace(/\\/g, '/'));
}

if (isEntrypoint()) {
  void main();
}
