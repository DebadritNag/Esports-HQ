import { z } from 'zod';
import {
  invitationStatusSchema,
  paginationQuerySchema,
  teamRoleSchema,
} from '../../schemas/common.js';

/** A teams row. */
export const teamSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  tag: z.string().nullable(),
  game: z.string(),
  bio: z.string().nullable(),
  logo_path: z.string().nullable(),
  owner_id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const listTeamsQuerySchema = paginationQuerySchema.extend({
  game: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
});

export const createTeamSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  tag: z.string().min(1).max(10).nullable().optional(),
  game: z.string().min(1).max(60).optional(),
  bio: z.string().max(2000).nullable().optional(),
  logo_path: z.string().max(500).nullable().optional(),
});

export const updateTeamSchema = createTeamSchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field must be provided.',
  });

/** A team_members row. */
export const teamMemberSchema = z.object({
  id: z.string().uuid(),
  team_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: teamRoleSchema,
  jersey_number: z.number().int().nullable(),
  joined_at: z.string(),
});

export const addMemberSchema = z.object({
  user_id: z.string().uuid(),
  role: teamRoleSchema.optional(),
  jersey_number: z.number().int().min(0).max(999).nullable().optional(),
});

export const updateMemberSchema = z
  .object({
    role: teamRoleSchema,
    jersey_number: z.number().int().min(0).max(999).nullable(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field must be provided.',
  });

/** A team_invitations row. `token` is never returned. */
export const teamInvitationSchema = z.object({
  id: z.string().uuid(),
  team_id: z.string().uuid(),
  invited_by: z.string().uuid(),
  invited_user_id: z.string().uuid().nullable(),
  invited_email: z.string().nullable(),
  role: teamRoleSchema,
  status: invitationStatusSchema,
  expires_at: z.string(),
  responded_at: z.string().nullable(),
  created_at: z.string(),
});

export const createInvitationSchema = z
  .object({
    invited_user_id: z.string().uuid().optional(),
    invited_email: z.string().email().max(255).optional(),
    role: teamRoleSchema.optional(),
  })
  .refine((body) => body.invited_user_id || body.invited_email, {
    message: 'Either invited_user_id or invited_email is required.',
  });

/** A team_announcements row. */
export const teamAnnouncementSchema = z.object({
  id: z.string().uuid(),
  team_id: z.string().uuid(),
  author_id: z.string().uuid().nullable(),
  title: z.string(),
  body: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(10000).nullable().optional(),
});

export type TeamResponse = z.infer<typeof teamSchema>;
export type ListTeamsQuery = z.infer<typeof listTeamsQuerySchema>;
export type CreateTeamBody = z.infer<typeof createTeamSchema>;
export type UpdateTeamBody = z.infer<typeof updateTeamSchema>;
export type TeamMemberResponse = z.infer<typeof teamMemberSchema>;
export type AddMemberBody = z.infer<typeof addMemberSchema>;
export type UpdateMemberBody = z.infer<typeof updateMemberSchema>;
export type TeamInvitationResponse = z.infer<typeof teamInvitationSchema>;
export type CreateInvitationBody = z.infer<typeof createInvitationSchema>;
export type TeamAnnouncementResponse = z.infer<typeof teamAnnouncementSchema>;
export type CreateAnnouncementBody = z.infer<typeof createAnnouncementSchema>;
