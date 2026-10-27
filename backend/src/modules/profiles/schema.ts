import { z } from 'zod';

/** A profile row as returned to the caller (mirrors the `profiles` table). */
export const profileSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  display_name: z.string().nullable(),
  avatar_path: z.string().nullable(),
  timezone: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

/** PATCH /me body — only user-editable columns, all optional. */
export const updateProfileSchema = z
  .object({
    username: z.string().min(1).max(50),
    display_name: z.string().min(1).max(100).nullable(),
    avatar_path: z.string().min(1).max(500).nullable(),
    timezone: z.string().min(1).max(100),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field must be provided.',
  });

/** A reminder-preferences row (user-default: event_id & organizer_id null). */
export const reminderPreferenceSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  event_id: z.string().uuid().nullable(),
  organizer_id: z.string().uuid().nullable(),
  registration_reminders_enabled: z.boolean(),
  registration_lead_minutes: z.number().int(),
  check_in_reminders_enabled: z.boolean(),
  check_in_lead_minutes: z.number().int(),
  stream_reminders_enabled: z.boolean(),
  stream_lead_minutes: z.number().int(),
  match_reminders_enabled: z.boolean(),
  match_lead_minutes: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});

const leadMinutes = z.number().int().min(0).max(10080);

/** PATCH /me/preferences body — the user-default preference fields. */
export const updateReminderPreferenceSchema = z
  .object({
    registration_reminders_enabled: z.boolean(),
    registration_lead_minutes: leadMinutes,
    check_in_reminders_enabled: z.boolean(),
    check_in_lead_minutes: leadMinutes,
    stream_reminders_enabled: z.boolean(),
    stream_lead_minutes: leadMinutes,
    match_reminders_enabled: z.boolean(),
    match_lead_minutes: leadMinutes,
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field must be provided.',
  });

export type ProfileResponse = z.infer<typeof profileSchema>;
export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
export type ReminderPreferenceResponse = z.infer<typeof reminderPreferenceSchema>;
export type UpdateReminderPreferenceBody = z.infer<typeof updateReminderPreferenceSchema>;
