import { z } from 'zod';
import { paginationQuerySchema } from '../../schemas/common.js';

/** A recurrence_rules row as returned to clients. */
export const recurrenceRuleSchema = z.object({
  id: z.string().uuid(),
  organizer_id: z.string().uuid(),
  name: z.string(),
  days_of_week: z.array(z.number().int().min(1).max(7)),
  effective_from: z.string(),
  effective_until: z.string().nullable(),
  registration_opens_at: z.string().nullable(),
  registration_closes_at: z.string().nullable(),
  check_in_at: z.string().nullable(),
  stream_starts_at: z.string().nullable(),
  match_starts_at: z.string().nullable(),
  timezone: z.string(),
  is_active: z.boolean(),
  source_connection_id: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const timeOfDay = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Expected HH:mm or HH:mm:ss');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

/** GET /organizers/:id/schedules query (pagination only). */
export const listSchedulesQuerySchema = paginationQuerySchema;

/** POST /organizers/:id/schedules body. */
export const createScheduleSchema = z.object({
  name: z.string().min(1).max(120),
  days_of_week: z.array(z.number().int().min(1).max(7)).min(1).max(7),
  effective_from: isoDate.optional(),
  effective_until: isoDate.nullable().optional(),
  registration_opens_at: timeOfDay.nullable().optional(),
  registration_closes_at: timeOfDay.nullable().optional(),
  check_in_at: timeOfDay.nullable().optional(),
  stream_starts_at: timeOfDay.nullable().optional(),
  match_starts_at: timeOfDay.nullable().optional(),
  timezone: z.string().min(1).max(100).optional(),
  is_active: z.boolean().optional(),
});

/** PATCH /schedules/:id body. */
export const updateScheduleSchema = createScheduleSchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field must be provided.',
  });

export type RecurrenceRuleResponse = z.infer<typeof recurrenceRuleSchema>;
export type CreateScheduleBody = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleBody = z.infer<typeof updateScheduleSchema>;
