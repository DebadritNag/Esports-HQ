import { z } from 'zod';
import {
  deliveryStatusSchema,
  notificationChannelSchema,
  paginationQuerySchema,
  reminderJobStatusSchema,
  reminderTypeSchema,
} from '../../schemas/common.js';
import {
  reminderPreferenceSchema,
  updateReminderPreferenceSchema,
} from '../profiles/schema.js';

/** A reminder_jobs row as returned to the owning user. */
export const reminderJobSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  event_id: z.string().uuid(),
  reminder_type: reminderTypeSchema,
  status: reminderJobStatusSchema,
  scheduled_for: z.string(),
  delivered_at: z.string().nullable(),
  attempt_count: z.number().int(),
  last_attempt_at: z.string().nullable(),
  last_error: z.string().nullable(),
  next_attempt_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

/** GET /reminders filters + pagination. */
export const listRemindersQuerySchema = paginationQuerySchema.extend({
  status: reminderJobStatusSchema.optional(),
  event_id: z.string().uuid().optional(),
});

/**
 * A notification_subscriptions row — NOTE: the `keys` column is deliberately
 * omitted so push credentials never reach any API response or OpenAPI schema.
 */
export const subscriptionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  channel: notificationChannelSchema,
  endpoint: z.string(),
  is_active: z.boolean(),
  user_agent: z.string().nullable(),
  last_used_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

/** POST /reminders/subscriptions body. `keys` is accepted but never returned. */
export const createSubscriptionSchema = z.object({
  channel: notificationChannelSchema,
  endpoint: z.string().min(1).max(2000),
  /** Channel credentials (web-push p256dh/auth). Stored, never returned. */
  keys: z.record(z.string()),
  user_agent: z.string().max(500).nullable().optional(),
});

/** A notification_deliveries row as returned to the owning user. */
export const deliverySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  subscription_id: z.string().uuid().nullable(),
  reminder_job_id: z.string().uuid().nullable(),
  channel: notificationChannelSchema,
  status: deliveryStatusSchema,
  provider_reference: z.string().nullable(),
  error_category: z.string().nullable(),
  error_detail: z.string().nullable(),
  attempted_at: z.string(),
});

/** GET /reminders/deliveries filters + pagination. */
export const listDeliveriesQuerySchema = paginationQuerySchema.extend({
  status: deliveryStatusSchema.optional(),
});

export { reminderPreferenceSchema, updateReminderPreferenceSchema };

export type ReminderJobResponse = z.infer<typeof reminderJobSchema>;
export type ListRemindersQuery = z.infer<typeof listRemindersQuerySchema>;
export type SubscriptionResponse = z.infer<typeof subscriptionSchema>;
export type CreateSubscriptionBody = z.infer<typeof createSubscriptionSchema>;
export type DeliveryResponse = z.infer<typeof deliverySchema>;
export type ListDeliveriesQuery = z.infer<typeof listDeliveriesQuerySchema>;
