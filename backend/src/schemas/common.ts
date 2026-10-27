import { z } from 'zod';
import { Constants } from '../types/database.types.js';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../utils/pagination.js';

/**
 * Shared Zod schemas. Enum mirrors are derived from the generated
 * `Constants` so they can never drift from the database definitions.
 */

const enums = Constants.public.Enums;

function enumSchema<T extends readonly [string, ...string[]]>(values: T): z.ZodEnum<[...T]> {
  return z.enum(values as unknown as [...T]);
}

export const sourceTypeSchema = enumSchema(enums.source_type);
export const connectionStatusSchema = enumSchema(enums.connection_status);
export const eventTypeSchema = enumSchema(enums.event_type);
export const eventStatusSchema = enumSchema(enums.event_status);
export const confirmationStatusSchema = enumSchema(enums.confirmation_status);
export const trackingStatusSchema = enumSchema(enums.tracking_status);
export const registrationStatusSchema = enumSchema(enums.registration_status);
export const reminderTypeSchema = enumSchema(enums.reminder_type);
export const reminderJobStatusSchema = enumSchema(enums.reminder_job_status);
export const notificationChannelSchema = enumSchema(enums.notification_channel);
export const deliveryStatusSchema = enumSchema(enums.delivery_status);
export const teamRoleSchema = enumSchema(enums.team_role);
export const invitationStatusSchema = enumSchema(enums.invitation_status);
export const achievementScopeSchema = enumSchema(enums.achievement_scope);

/** UUID path param, e.g. `{ id: string }`. */
export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

export type UuidParam = z.infer<typeof uuidParamSchema>;

/** Standard pagination query: limit (1..MAX) + offset (>=0). */
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Pagination metadata returned alongside list payloads. */
export const paginationMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
  count: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

/** The standard error envelope schema (for OpenAPI documentation). */
export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
    details: z.unknown().optional(),
  }),
});
