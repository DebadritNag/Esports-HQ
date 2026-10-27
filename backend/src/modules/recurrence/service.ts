import type { FastifyInstance } from 'fastify';
import type { TypedSupabaseClient } from '../../plugins/supabase-clients.js';
import { AppError } from '../../utils/errors.js';
import { mapPostgrestError } from '../../utils/supabase-error.js';
import {
  buildPaginationMeta,
  toRange,
  type PaginationMeta,
  type PaginationParams,
} from '../../utils/pagination.js';
import { triggerEventReminderRegeneration } from '../../services/schedule.js';
import type { PaginationQuery } from '../../schemas/common.js';
import type {
  CreateScheduleBody,
  RecurrenceRuleResponse,
  UpdateScheduleBody,
} from './schema.js';

const RULE_COLUMNS =
  'id, organizer_id, name, days_of_week, effective_from, effective_until, registration_opens_at, registration_closes_at, check_in_at, stream_starts_at, match_starts_at, timezone, is_active, source_connection_id, created_at, updated_at';

export interface ScheduleList {
  data: RecurrenceRuleResponse[];
  meta: PaginationMeta;
}

/** List an organizer's recurrence schedules (paginated). */
export async function listSchedules(
  client: TypedSupabaseClient,
  organizerId: string,
  query: PaginationQuery,
): Promise<ScheduleList> {
  const params: PaginationParams = { limit: query.limit, offset: query.offset };
  const { from, to } = toRange(params);
  const { data, error, count } = await client
    .from('recurrence_rules')
    .select(RULE_COLUMNS, { count: 'exact' })
    .eq('organizer_id', organizerId)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) {
    throw mapPostgrestError(error, 'List schedules');
  }
  const rows = (data ?? []) as RecurrenceRuleResponse[];
  return { data: rows, meta: buildPaginationMeta(params, count ?? 0, rows.length) };
}

/**
 * Trigger service-role reminder regeneration for every event materialized from
 * a recurrence rule. Best-effort: when the service-role key is absent we skip
 * (the API process may run without it) rather than failing the user's write.
 */
async function regenerateForRule(app: FastifyInstance, ruleId: string): Promise<void> {
  if (!app.hasServiceRole) {
    app.log.warn(
      { ruleId },
      'Skipping reminder regeneration for schedule change: service-role key not configured.',
    );
    return;
  }
  const { data, error } = await app.supabase
    .from('events')
    .select('id')
    .eq('recurrence_rule_id', ruleId);
  if (error) {
    throw mapPostgrestError(error, 'Load events for schedule');
  }
  for (const row of data ?? []) {
    await triggerEventReminderRegeneration(row.id, { client: app.supabase, config: app.config });
  }
}

/** Create a recurrence schedule, then regenerate affected event reminders. */
export async function createSchedule(
  app: FastifyInstance,
  client: TypedSupabaseClient,
  organizerId: string,
  body: CreateScheduleBody,
): Promise<RecurrenceRuleResponse> {
  const { data, error } = await client
    .from('recurrence_rules')
    .insert({ ...body, organizer_id: organizerId })
    .select(RULE_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Create schedule');
  }
  if (!data) {
    throw AppError.internal('Failed to create schedule');
  }
  await regenerateForRule(app, data.id);
  return data as RecurrenceRuleResponse;
}

/** Update a recurrence schedule, then regenerate affected event reminders. */
export async function updateSchedule(
  app: FastifyInstance,
  client: TypedSupabaseClient,
  scheduleId: string,
  body: UpdateScheduleBody,
): Promise<RecurrenceRuleResponse> {
  const { data, error } = await client
    .from('recurrence_rules')
    .update(body)
    .eq('id', scheduleId)
    .select(RULE_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Update schedule');
  }
  if (!data) {
    throw AppError.notFound('Schedule not found.');
  }
  await regenerateForRule(app, data.id);
  return data as RecurrenceRuleResponse;
}

/** Delete a recurrence schedule, then regenerate affected event reminders. */
export async function deleteSchedule(
  app: FastifyInstance,
  client: TypedSupabaseClient,
  scheduleId: string,
): Promise<void> {
  // Regenerate while the affected events still reference the rule (the FK is
  // set null on delete), then remove the rule.
  await regenerateForRule(app, scheduleId);
  const { data, error } = await client
    .from('recurrence_rules')
    .delete()
    .eq('id', scheduleId)
    .select('id')
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Delete schedule');
  }
  if (!data) {
    throw AppError.notFound('Schedule not found.');
  }
}
