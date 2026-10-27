import { z } from 'zod';
import { paginationQuerySchema } from '../../schemas/common.js';

/** Organizer row as returned to clients (mirrors the `organizers` table). */
export const organizerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  game: z.string(),
  description: z.string().nullable(),
  website_url: z.string().nullable(),
  discord_invite_url: z.string().nullable(),
  timezone: z.string(),
  default_registration_time: z.string().nullable(),
  default_stream_time: z.string().nullable(),
  is_verified: z.boolean(),
  created_by: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

/** GET /organizers query filters + pagination. */
export const listOrganizersQuerySchema = paginationQuerySchema.extend({
  game: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  is_verified: z.coerce.boolean().optional(),
});

const timeOfDay = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Expected HH:mm or HH:mm:ss');

/** POST /organizers body. */
export const createOrganizerSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  game: z.string().min(1).max(60).optional(),
  description: z.string().max(2000).nullable().optional(),
  website_url: z.string().url().max(500).nullable().optional(),
  discord_invite_url: z.string().url().max(500).nullable().optional(),
  timezone: z.string().min(1).max(100).optional(),
  default_registration_time: timeOfDay.nullable().optional(),
  default_stream_time: timeOfDay.nullable().optional(),
});

/** PATCH /organizers/:id body. */
export const updateOrganizerSchema = createOrganizerSchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field must be provided.',
  });

/** An organizer_follows row (returned by follow/unfollow). */
export const organizerFollowSchema = z.object({
  id: z.string().uuid(),
  organizer_id: z.string().uuid(),
  user_id: z.string().uuid(),
  is_active: z.boolean(),
  created_at: z.string(),
});

export type OrganizerResponse = z.infer<typeof organizerSchema>;
export type ListOrganizersQuery = z.infer<typeof listOrganizersQuerySchema>;
export type CreateOrganizerBody = z.infer<typeof createOrganizerSchema>;
export type UpdateOrganizerBody = z.infer<typeof updateOrganizerSchema>;
export type OrganizerFollowResponse = z.infer<typeof organizerFollowSchema>;
