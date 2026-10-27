import { z } from 'zod';
import {
  confirmationStatusSchema,
  eventStatusSchema,
  eventTypeSchema,
  paginationQuerySchema,
  registrationStatusSchema,
  trackingStatusSchema,
} from '../../schemas/common.js';

/** An events row as returned to clients (mirrors the `events` table). */
export const eventSchema = z.object({
  id: z.string().uuid(),
  organizer_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  game: z.string(),
  event_type: eventTypeSchema,
  event_status: eventStatusSchema,
  confirmation_status: confirmationStatusSchema,
  timezone: z.string(),
  registration_opens_at: z.string().nullable(),
  registration_closes_at: z.string().nullable(),
  check_in_at: z.string().nullable(),
  stream_starts_at: z.string().nullable(),
  match_starts_at: z.string().nullable(),
  registration_url: z.string().nullable(),
  stream_url: z.string().nullable(),
  source_message_url: z.string().nullable(),
  is_recurring_occurrence: z.boolean(),
  occurrence_date: z.string().nullable(),
  recurrence_rule_id: z.string().uuid().nullable(),
  last_verified_at: z.string().nullable(),
  created_by: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

/** GET /events filters + pagination (the Radar). */
export const listEventsQuerySchema = paginationQuerySchema.extend({
  organizer_id: z.string().uuid().optional(),
  event_status: eventStatusSchema.optional(),
  confirmation_status: confirmationStatusSchema.optional(),
  event_type: eventTypeSchema.optional(),
  /** ISO timestamp lower bound on match_starts_at. */
  from: z.string().datetime({ offset: true }).optional(),
  /** ISO timestamp upper bound on match_starts_at. */
  to: z.string().datetime({ offset: true }).optional(),
  /** When true, only events tracked by the authenticated user. */
  tracked: z.coerce.boolean().optional(),
  /** When true, only events with an upcoming milestone (match in the future). */
  upcoming: z.coerce.boolean().optional(),
});

const isoTimestamp = z.string().datetime({ offset: true });

/** POST /events body. */
export const createEventSchema = z.object({
  organizer_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
  game: z.string().min(1).max(60).optional(),
  event_type: eventTypeSchema.optional(),
  event_status: eventStatusSchema.optional(),
  timezone: z.string().min(1).max(100).optional(),
  registration_opens_at: isoTimestamp.nullable().optional(),
  registration_closes_at: isoTimestamp.nullable().optional(),
  check_in_at: isoTimestamp.nullable().optional(),
  stream_starts_at: isoTimestamp.nullable().optional(),
  match_starts_at: isoTimestamp.nullable().optional(),
  registration_url: z.string().url().max(1000).nullable().optional(),
  stream_url: z.string().url().max(1000).nullable().optional(),
  source_message_url: z.string().url().max(1000).nullable().optional(),
});

/** PATCH /events/:id body. */
export const updateEventSchema = createEventSchema
  .omit({ organizer_id: true })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field must be provided.',
  });

/** A user_event_tracking row (returned by track/untrack). */
export const trackingSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  event_id: z.string().uuid(),
  tracking_status: trackingStatusSchema,
  registration_status: registrationStatusSchema,
  personal_notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

/** POST /events/:id/track body (optional status fields). */
export const trackEventSchema = z
  .object({
    tracking_status: trackingStatusSchema,
    registration_status: registrationStatusSchema,
    personal_notes: z.string().max(2000).nullable(),
  })
  .partial();

export type EventResponse = z.infer<typeof eventSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
export type CreateEventBody = z.infer<typeof createEventSchema>;
export type UpdateEventBody = z.infer<typeof updateEventSchema>;
export type TrackingResponse = z.infer<typeof trackingSchema>;
export type TrackEventBody = z.infer<typeof trackEventSchema>;
