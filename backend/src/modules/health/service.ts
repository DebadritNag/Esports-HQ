import type { FastifyInstance } from 'fastify';
import { createAnonClient } from '../../plugins/supabase-clients.js';
import type { Database } from '../../types/database.types.js';

export interface ReminderCounters {
  due: number;
  delivered: number;
  failed: number;
  delayed: number;
}

export interface ReadinessReport {
  status: 'ok' | 'degraded';
  database: {
    reachable: boolean;
    detail?: string;
  };
  serviceRole: {
    available: boolean;
  };
  reminders: ReminderCounters | { available: false };
  timestamp: string;
}

type ReminderJobStatus = Database['public']['Enums']['reminder_job_status'];

/**
 * Liveness: trivial, no external dependencies.
 */
export function liveness(): { status: 'ok' } {
  return { status: 'ok' };
}

/**
 * Readiness: pings the database and, when a service-role client is available,
 * computes reminder job counters. Degrades cleanly (never throws) so the probe
 * can report partial availability.
 */
export async function readiness(app: FastifyInstance): Promise<ReadinessReport> {
  const timestamp = new Date().toISOString();
  const serviceRoleAvailable = app.hasServiceRole;

  const database = await pingDatabase(app);
  const reminders = serviceRoleAvailable
    ? await reminderCounters(app)
    : { available: false as const };

  const status: ReadinessReport['status'] = database.reachable ? 'ok' : 'degraded';

  return {
    status,
    database,
    serviceRole: { available: serviceRoleAvailable },
    reminders,
    timestamp,
  };
}

async function pingDatabase(app: FastifyInstance): Promise<ReadinessReport['database']> {
  try {
    // Lightweight connectivity probe against a small public table. Uses an
    // anon client so it works without the service-role key; RLS may limit
    // visibility but a successful (even empty) response confirms reachability.
    const client = createAnonClient(app.config);
    const { error } = await client.from('organizers').select('id').limit(1);
    if (error) {
      return { reachable: false, detail: error.message };
    }
    return { reachable: true };
  } catch (err) {
    return {
      reachable: false,
      detail: err instanceof Error ? err.message : 'unknown error',
    };
  }
}

async function reminderCounters(
  app: FastifyInstance,
): Promise<ReminderCounters | { available: false }> {
  try {
    const client = app.supabase;
    const nowIso = new Date().toISOString();

    const [due, delivered, failed, delayed] = await Promise.all([
      countJobs(client, 'pending'),
      countJobs(client, 'delivered'),
      countJobs(client, 'failed'),
      countDelayed(client, nowIso),
    ]);

    if (due === null || delivered === null || failed === null || delayed === null) {
      return { available: false };
    }
    return { due, delivered, failed, delayed };
  } catch {
    return { available: false };
  }
}

async function countJobs(
  client: FastifyInstance['supabase'],
  status: ReminderJobStatus,
): Promise<number | null> {
  const { count, error } = await client
    .from('reminder_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', status);
  return error ? null : (count ?? 0);
}

async function countDelayed(
  client: FastifyInstance['supabase'],
  nowIso: string,
): Promise<number | null> {
  const { count, error } = await client
    .from('reminder_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
    .lt('scheduled_for', nowIso);
  return error ? null : (count ?? 0);
}
