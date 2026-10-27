/**
 * Reminder service layer: thin, typed wrappers over the hosted reminder-engine
 * RPCs. Every wrapper requires the service-role client (worker / privileged
 * context) and throws a typed {@link AppError} when the service-role key is
 * absent, so callers degrade cleanly rather than making unauthenticated calls.
 *
 * The RPCs themselves are the source of truth; these wrappers only marshal
 * arguments, normalize return shapes (notably `resolve_reminder_preference`,
 * which returns an array — we take `[0]`), and surface Postgres errors as
 * AppErrors.
 */

import { getConfig, hasServiceRole, type AppConfig } from '../config/index.js';
import { AppError } from '../utils/errors.js';
import {
  createServiceClient,
  type TypedSupabaseClient,
} from '../plugins/supabase-clients.js';
import type { Database } from '../types/database.types.js';

type Functions = Database['public']['Functions'];
type ReminderJobRow = Functions['claim_due_reminder_jobs']['Returns'][number];
type ResolvedPreferenceRow = Functions['resolve_reminder_preference']['Returns'][number];

/** Resolve a usable service-role client or throw a typed AppError. */
function requireServiceClient(
  client: TypedSupabaseClient | undefined,
  config: AppConfig,
): TypedSupabaseClient {
  if (client) {
    return client;
  }
  if (!hasServiceRole(config)) {
    throw AppError.serviceUnavailable(
      'Reminder service requires the service-role client (SUPABASE_SERVICE_ROLE_KEY not configured).',
    );
  }
  return createServiceClient(config);
}

/** Translate a Supabase/Postgres RPC error into an AppError (no SQL leaked). */
function rpcError(rpc: string, error: { message?: string } | null): AppError {
  return AppError.internal(`RPC ${rpc} failed`, error ?? undefined);
}

/** Options shared by every wrapper (lets tests inject a client/config). */
export interface ReminderServiceOptions {
  client?: TypedSupabaseClient;
  config?: AppConfig;
}

/**
 * Regenerate all reminder jobs for an event (e.g. after a schedule change).
 * Returns the number of jobs regenerated.
 */
export async function regenerateEventReminders(
  eventId: string,
  options: ReminderServiceOptions = {},
): Promise<number> {
  const config = options.config ?? getConfig();
  const client = requireServiceClient(options.client, config);
  const { data, error } = await client.rpc('regenerate_event_reminders', {
    p_event_id: eventId,
  });
  if (error) {
    throw rpcError('regenerate_event_reminders', error);
  }
  return data ?? 0;
}

/**
 * Regenerate reminder jobs for a single user + event pair (e.g. after that
 * user changes their preferences). Returns the number of jobs regenerated.
 */
export async function regenerateReminderJobs(
  userId: string,
  eventId: string,
  options: ReminderServiceOptions = {},
): Promise<number> {
  const config = options.config ?? getConfig();
  const client = requireServiceClient(options.client, config);
  const { data, error } = await client.rpc('regenerate_reminder_jobs', {
    p_user_id: userId,
    p_event_id: eventId,
  });
  if (error) {
    throw rpcError('regenerate_reminder_jobs', error);
  }
  return data ?? 0;
}

/**
 * Resolve the effective reminder preference for a user + event. The RPC
 * returns an array; we normalize to the single row (`[0]`) or null.
 */
export async function resolveReminderPreference(
  userId: string,
  eventId: string,
  options: ReminderServiceOptions = {},
): Promise<ResolvedPreferenceRow | null> {
  const config = options.config ?? getConfig();
  const client = requireServiceClient(options.client, config);
  const { data, error } = await client.rpc('resolve_reminder_preference', {
    p_user_id: userId,
    p_event_id: eventId,
  });
  if (error) {
    throw rpcError('resolve_reminder_preference', error);
  }
  // RPC returns an array — take the first row.
  return Array.isArray(data) && data.length > 0 ? (data[0] as ResolvedPreferenceRow) : null;
}

/**
 * Atomically claim up to `limit` due reminder jobs for a worker. Returns the
 * claimed rows (locked to the worker). Default limit is the configured batch.
 */
export async function claimDueReminderJobs(
  worker: string,
  limit?: number,
  options: ReminderServiceOptions = {},
): Promise<ReminderJobRow[]> {
  const config = options.config ?? getConfig();
  const client = requireServiceClient(options.client, config);
  const args: Functions['claim_due_reminder_jobs']['Args'] = {
    p_worker: worker,
    p_limit: limit ?? config.REMINDER_BATCH_SIZE,
  };
  const { data, error } = await client.rpc('claim_due_reminder_jobs', args);
  if (error) {
    throw rpcError('claim_due_reminder_jobs', error);
  }
  return data ?? [];
}

/** Expire reminder jobs whose scheduled window has passed. Returns the count. */
export async function expireStaleReminderJobs(
  options: ReminderServiceOptions = {},
): Promise<number> {
  const config = options.config ?? getConfig();
  const client = requireServiceClient(options.client, config);
  const { data, error } = await client.rpc('expire_stale_reminder_jobs');
  if (error) {
    throw rpcError('expire_stale_reminder_jobs', error);
  }
  return data ?? 0;
}

/**
 * Requeue jobs that have been stuck in `processing` beyond `stuckMinutes`
 * (a crashed worker left them locked). Returns the number requeued.
 */
export async function requeueStuckReminderJobs(
  stuckMinutes?: number,
  options: ReminderServiceOptions = {},
): Promise<number> {
  const config = options.config ?? getConfig();
  const client = requireServiceClient(options.client, config);
  const args: Functions['requeue_stuck_reminder_jobs']['Args'] =
    stuckMinutes === undefined ? {} : { p_stuck_minutes: stuckMinutes };
  const { data, error } = await client.rpc('requeue_stuck_reminder_jobs', args);
  if (error) {
    throw rpcError('requeue_stuck_reminder_jobs', error);
  }
  return data ?? 0;
}

/**
 * Roll the recurrence horizon forward, materializing occurrence events for the
 * next `horizonDays`. Returns the number of occurrences generated.
 */
export async function generateRecurrenceOccurrences(
  horizonDays?: number,
  options: ReminderServiceOptions = {},
): Promise<number> {
  const config = options.config ?? getConfig();
  const client = requireServiceClient(options.client, config);
  const args: Functions['generate_recurrence_occurrences']['Args'] =
    horizonDays === undefined
      ? { p_horizon_days: config.RECURRENCE_HORIZON_DAYS }
      : { p_horizon_days: horizonDays };
  const { data, error } = await client.rpc('generate_recurrence_occurrences', args);
  if (error) {
    throw rpcError('generate_recurrence_occurrences', error);
  }
  return data ?? 0;
}

export type { ReminderJobRow, ResolvedPreferenceRow };
