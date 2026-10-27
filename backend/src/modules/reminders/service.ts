import type { TypedSupabaseClient } from '../../plugins/supabase-clients.js';
import { AppError } from '../../utils/errors.js';
import { mapPostgrestError } from '../../utils/supabase-error.js';
import {
  buildPaginationMeta,
  toRange,
  type PaginationMeta,
  type PaginationParams,
} from '../../utils/pagination.js';
import type {
  CreateSubscriptionBody,
  DeliveryResponse,
  ListDeliveriesQuery,
  ListRemindersQuery,
  ReminderJobResponse,
  SubscriptionResponse,
} from './schema.js';

const REMINDER_JOB_COLUMNS =
  'id, user_id, event_id, reminder_type, status, scheduled_for, delivered_at, attempt_count, last_attempt_at, last_error, next_attempt_at, created_at, updated_at';
// SECURITY: `keys` is intentionally never selected — push credentials must not
// leave the database through any API projection or response.
const SUBSCRIPTION_COLUMNS =
  'id, user_id, channel, endpoint, is_active, user_agent, last_used_at, created_at, updated_at';
const DELIVERY_COLUMNS =
  'id, user_id, subscription_id, reminder_job_id, channel, status, provider_reference, error_category, error_detail, attempted_at';

export interface ReminderJobList {
  data: ReminderJobResponse[];
  meta: PaginationMeta;
}

/** List the authenticated user's reminder jobs (RLS-scoped). */
export async function listReminders(
  client: TypedSupabaseClient,
  query: ListRemindersQuery,
): Promise<ReminderJobList> {
  const params: PaginationParams = { limit: query.limit, offset: query.offset };
  const { from, to } = toRange(params);
  let builder = client
    .from('reminder_jobs')
    .select(REMINDER_JOB_COLUMNS, { count: 'exact' })
    .order('scheduled_for', { ascending: true })
    .range(from, to);
  if (query.status) {
    builder = builder.eq('status', query.status);
  }
  if (query.event_id) {
    builder = builder.eq('event_id', query.event_id);
  }
  const { data, error, count } = await builder;
  if (error) {
    throw mapPostgrestError(error, 'List reminders');
  }
  const rows = (data ?? []) as ReminderJobResponse[];
  return { data: rows, meta: buildPaginationMeta(params, count ?? 0, rows.length) };
}

export interface SubscriptionList {
  data: SubscriptionResponse[];
  meta: PaginationMeta;
}

/** Create a push subscription. `keys` is persisted but never returned. */
export async function createSubscription(
  client: TypedSupabaseClient,
  userId: string,
  body: CreateSubscriptionBody,
): Promise<SubscriptionResponse> {
  const { data, error } = await client
    .from('notification_subscriptions')
    .insert({
      user_id: userId,
      channel: body.channel,
      endpoint: body.endpoint,
      keys: body.keys,
      ...(body.user_agent !== undefined ? { user_agent: body.user_agent } : {}),
    })
    // SECURITY: projection excludes `keys`.
    .select(SUBSCRIPTION_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Create subscription');
  }
  if (!data) {
    throw AppError.internal('Failed to create subscription');
  }
  return data as SubscriptionResponse;
}

/** Deactivate (soft-delete) a push subscription owned by the user. */
export async function deleteSubscription(
  client: TypedSupabaseClient,
  id: string,
): Promise<void> {
  const { data, error } = await client
    .from('notification_subscriptions')
    .update({ is_active: false })
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Delete subscription');
  }
  if (!data) {
    throw AppError.notFound('Subscription not found.');
  }
}

export interface DeliveryList {
  data: DeliveryResponse[];
  meta: PaginationMeta;
}

/** List the authenticated user's notification deliveries (RLS-scoped). */
export async function listDeliveries(
  client: TypedSupabaseClient,
  query: ListDeliveriesQuery,
): Promise<DeliveryList> {
  const params: PaginationParams = { limit: query.limit, offset: query.offset };
  const { from, to } = toRange(params);
  let builder = client
    .from('notification_deliveries')
    .select(DELIVERY_COLUMNS, { count: 'exact' })
    .order('attempted_at', { ascending: false })
    .range(from, to);
  if (query.status) {
    builder = builder.eq('status', query.status);
  }
  const { data, error, count } = await builder;
  if (error) {
    throw mapPostgrestError(error, 'List deliveries');
  }
  const rows = (data ?? []) as DeliveryResponse[];
  return { data: rows, meta: buildPaginationMeta(params, count ?? 0, rows.length) };
}
