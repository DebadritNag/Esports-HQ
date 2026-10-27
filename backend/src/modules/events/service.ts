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
import {
  triggerEventReminderRegeneration,
  triggerUserEventReminderRegeneration,
} from '../../services/schedule.js';
import type {
  CreateEventBody,
  EventResponse,
  ListEventsQuery,
  TrackEventBody,
  TrackingResponse,
  UpdateEventBody,
} from './schema.js';

const EVENT_COLUMNS =
  'id, organizer_id, title, description, game, event_type, event_status, confirmation_status, timezone, registration_opens_at, registration_closes_at, check_in_at, stream_starts_at, match_starts_at, registration_url, stream_url, source_message_url, is_recurring_occurrence, occurrence_date, recurrence_rule_id, last_verified_at, created_by, created_at, updated_at';
const TRACKING_COLUMNS =
  'id, user_id, event_id, tracking_status, registration_status, personal_notes, created_at, updated_at';

export interface EventList {
  data: EventResponse[];
  meta: PaginationMeta;
}

/** List events (the Radar) with filters + pagination. RLS applies via client. */
export async function listEvents(
  client: TypedSupabaseClient,
  query: ListEventsQuery,
  userId: string | undefined,
): Promise<EventList> {
  const params: PaginationParams = { limit: query.limit, offset: query.offset };
  const { from, to } = toRange(params);

  // `tracked` requires knowing the caller's tracked event ids first.
  let trackedIds: string[] | undefined;
  if (query.tracked) {
    if (!userId) {
      throw AppError.unauthorized('Authentication required to filter tracked events.');
    }
    const { data, error } = await client
      .from('user_event_tracking')
      .select('event_id')
      .eq('user_id', userId);
    if (error) {
      throw mapPostgrestError(error, 'Load tracked events');
    }
    trackedIds = (data ?? []).map((row) => row.event_id);
    if (trackedIds.length === 0) {
      return { data: [], meta: buildPaginationMeta(params, 0, 0) };
    }
  }

  let builder = client
    .from('events')
    .select(EVENT_COLUMNS, { count: 'exact' })
    .order('match_starts_at', { ascending: true, nullsFirst: false })
    .range(from, to);

  if (query.organizer_id) {
    builder = builder.eq('organizer_id', query.organizer_id);
  }
  if (query.event_status) {
    builder = builder.eq('event_status', query.event_status);
  }
  if (query.confirmation_status) {
    builder = builder.eq('confirmation_status', query.confirmation_status);
  }
  if (query.event_type) {
    builder = builder.eq('event_type', query.event_type);
  }
  if (query.from) {
    builder = builder.gte('match_starts_at', query.from);
  }
  if (query.to) {
    builder = builder.lte('match_starts_at', query.to);
  }
  if (query.upcoming) {
    builder = builder.gte('match_starts_at', new Date().toISOString());
  }
  if (trackedIds) {
    builder = builder.in('id', trackedIds);
  }

  const { data, error, count } = await builder;
  if (error) {
    throw mapPostgrestError(error, 'List events');
  }
  const rows = (data ?? []) as EventResponse[];
  return { data: rows, meta: buildPaginationMeta(params, count ?? 0, rows.length) };
}

/** Get a single event by id. 404 when absent. */
export async function getEvent(
  client: TypedSupabaseClient,
  id: string,
): Promise<EventResponse> {
  const { data, error } = await client
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Load event');
  }
  if (!data) {
    throw AppError.notFound('Event not found.');
  }
  return data as EventResponse;
}

/** Create an event (RLS applies). */
export async function createEvent(
  client: TypedSupabaseClient,
  userId: string,
  body: CreateEventBody,
): Promise<EventResponse> {
  const { data, error } = await client
    .from('events')
    .insert({ ...body, created_by: userId })
    .select(EVENT_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Create event');
  }
  if (!data) {
    throw AppError.internal('Failed to create event');
  }
  return data as EventResponse;
}

/** Patch an event (RLS applies). */
export async function updateEvent(
  client: TypedSupabaseClient,
  id: string,
  body: UpdateEventBody,
): Promise<EventResponse> {
  const { data, error } = await client
    .from('events')
    .update(body)
    .eq('id', id)
    .select(EVENT_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Update event');
  }
  if (!data) {
    throw AppError.notFound('Event not found.');
  }
  return data as EventResponse;
}

/** Cancel an event (event_status=cancelled). */
export async function cancelEvent(
  client: TypedSupabaseClient,
  id: string,
): Promise<EventResponse> {
  const { data, error } = await client
    .from('events')
    .update({ event_status: 'cancelled' })
    .eq('id', id)
    .select(EVENT_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Cancel event');
  }
  if (!data) {
    throw AppError.notFound('Event not found.');
  }
  return data as EventResponse;
}

/**
 * Best-effort service-role reminder regeneration for a whole event. Skips (with
 * a warning) when the service-role key is not configured.
 */
async function regenerateEvent(app: FastifyInstance, eventId: string): Promise<void> {
  if (!app.hasServiceRole) {
    app.log.warn({ eventId }, 'Skipping reminder regeneration: service-role key not configured.');
    return;
  }
  await triggerEventReminderRegeneration(eventId, {
    client: app.supabase,
    config: app.config,
  });
}

/**
 * Confirm an event (confirmation_status=confirmed), then regenerate reminders
 * for the whole event (including the match milestone) via the service role.
 */
export async function confirmEvent(
  app: FastifyInstance,
  client: TypedSupabaseClient,
  id: string,
): Promise<EventResponse> {
  const { data, error } = await client
    .from('events')
    .update({ confirmation_status: 'confirmed' })
    .eq('id', id)
    .select(EVENT_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Confirm event');
  }
  if (!data) {
    throw AppError.notFound('Event not found.');
  }
  await regenerateEvent(app, data.id);
  return data as EventResponse;
}

/**
 * Track an event — upsert user_event_tracking, then regenerate reminder jobs
 * for this user+event via the service role.
 */
export async function trackEvent(
  app: FastifyInstance,
  client: TypedSupabaseClient,
  userId: string,
  eventId: string,
  body: TrackEventBody,
): Promise<TrackingResponse> {
  const { data, error } = await client
    .from('user_event_tracking')
    .upsert(
      {
        user_id: userId,
        event_id: eventId,
        ...(body.tracking_status ? { tracking_status: body.tracking_status } : {}),
        ...(body.registration_status ? { registration_status: body.registration_status } : {}),
        ...(body.personal_notes !== undefined ? { personal_notes: body.personal_notes } : {}),
      },
      { onConflict: 'user_id,event_id' },
    )
    .select(TRACKING_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Track event');
  }
  if (!data) {
    throw AppError.internal('Failed to track event');
  }
  await regenerateUserEvent(app, userId, eventId);
  return data as TrackingResponse;
}

/** Untrack an event — remove the tracking row, then regenerate reminder jobs. */
export async function untrackEvent(
  app: FastifyInstance,
  client: TypedSupabaseClient,
  userId: string,
  eventId: string,
): Promise<void> {
  const { data, error } = await client
    .from('user_event_tracking')
    .delete()
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .select('id')
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Untrack event');
  }
  if (!data) {
    throw AppError.notFound('Tracking not found.');
  }
  await regenerateUserEvent(app, userId, eventId);
}

/** Best-effort service-role reminder regeneration for one user+event. */
async function regenerateUserEvent(
  app: FastifyInstance,
  userId: string,
  eventId: string,
): Promise<void> {
  if (!app.hasServiceRole) {
    app.log.warn(
      { userId, eventId },
      'Skipping reminder-job regeneration: service-role key not configured.',
    );
    return;
  }
  await triggerUserEventReminderRegeneration(userId, eventId, {
    client: app.supabase,
    config: app.config,
  });
}
