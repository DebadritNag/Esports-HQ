import { z } from 'zod';
import {
  achievementScopeSchema,
  paginationQuerySchema,
} from '../../schemas/common.js';

/** An achievements row. */
export const achievementSchema = z.object({
  id: z.string().uuid(),
  scope: achievementScopeSchema,
  title: z.string(),
  description: z.string().nullable(),
  placement: z.number().int().nullable(),
  event_id: z.string().uuid().nullable(),
  team_id: z.string().uuid().nullable(),
  user_id: z.string().uuid().nullable(),
  awarded_at: z.string().nullable(),
  created_by: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const listAchievementsQuerySchema = paginationQuerySchema.extend({
  scope: achievementScopeSchema.optional(),
  team_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  event_id: z.string().uuid().optional(),
});

export const createAchievementSchema = z
  .object({
    scope: achievementScopeSchema,
    title: z.string().min(1).max(200),
    description: z.string().max(2000).nullable().optional(),
    placement: z.number().int().min(0).nullable().optional(),
    event_id: z.string().uuid().nullable().optional(),
    team_id: z.string().uuid().nullable().optional(),
    user_id: z.string().uuid().nullable().optional(),
    awarded_at: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .refine(
    (body) =>
      (body.scope === 'team' && Boolean(body.team_id)) ||
      (body.scope === 'personal' && Boolean(body.user_id)),
    {
      message: 'A team achievement needs team_id; a personal achievement needs user_id.',
    },
  );

export const updateAchievementSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).nullable(),
    placement: z.number().int().min(0).nullable(),
    awarded_at: z.string().datetime({ offset: true }).nullable(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field must be provided.',
  });

/**
 * An achievement_evidence metadata row. Bytes live in the private
 * `achievement-evidence` bucket at `achievement_id/file`; this API handles only
 * metadata and never streams the files.
 */
export const achievementEvidenceSchema = z.object({
  id: z.string().uuid(),
  achievement_id: z.string().uuid(),
  file_name: z.string(),
  storage_path: z.string(),
  content_type: z.string().nullable(),
  size_bytes: z.number().int().nullable(),
  uploaded_by: z.string().uuid().nullable(),
  created_at: z.string(),
});

export const createEvidenceSchema = z.object({
  file_name: z.string().min(1).max(255),
  storage_path: z.string().min(1).max(1000),
  content_type: z.string().max(255).nullable().optional(),
  size_bytes: z.number().int().min(0).nullable().optional(),
});

export const listQuerySchema = paginationQuerySchema;

export type AchievementResponse = z.infer<typeof achievementSchema>;
export type ListAchievementsQuery = z.infer<typeof listAchievementsQuerySchema>;
export type CreateAchievementBody = z.infer<typeof createAchievementSchema>;
export type UpdateAchievementBody = z.infer<typeof updateAchievementSchema>;
export type AchievementEvidenceResponse = z.infer<typeof achievementEvidenceSchema>;
export type CreateEvidenceBody = z.infer<typeof createEvidenceSchema>;
