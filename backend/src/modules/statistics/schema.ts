import { z } from 'zod';
import { paginationQuerySchema } from '../../schemas/common.js';

/** A matches row. */
export const matchSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid().nullable(),
  organizer_id: z.string().uuid().nullable(),
  title: z.string().nullable(),
  round_label: z.string().nullable(),
  map_name: z.string().nullable(),
  status: z.string(),
  scheduled_at: z.string().nullable(),
  started_at: z.string().nullable(),
  ended_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const listMatchesQuerySchema = paginationQuerySchema.extend({
  event_id: z.string().uuid().optional(),
  organizer_id: z.string().uuid().optional(),
  status: z.string().min(1).optional(),
});

const isoTimestamp = z.string().datetime({ offset: true });

export const createMatchSchema = z.object({
  event_id: z.string().uuid().nullable().optional(),
  organizer_id: z.string().uuid().nullable().optional(),
  title: z.string().max(200).nullable().optional(),
  round_label: z.string().max(120).nullable().optional(),
  map_name: z.string().max(120).nullable().optional(),
  status: z.string().min(1).max(40).optional(),
  scheduled_at: isoTimestamp.nullable().optional(),
  started_at: isoTimestamp.nullable().optional(),
  ended_at: isoTimestamp.nullable().optional(),
});

export const updateMatchSchema = createMatchSchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field must be provided.',
  });

/** A match_participants row. */
export const matchParticipantSchema = z.object({
  id: z.string().uuid(),
  match_id: z.string().uuid(),
  team_id: z.string().uuid().nullable(),
  user_id: z.string().uuid().nullable(),
  slot_label: z.string().nullable(),
  placement: z.number().int().nullable(),
  created_at: z.string(),
});

export const createParticipantSchema = z
  .object({
    team_id: z.string().uuid().nullable().optional(),
    user_id: z.string().uuid().nullable().optional(),
    slot_label: z.string().max(120).nullable().optional(),
    placement: z.number().int().min(0).nullable().optional(),
  })
  .refine((body) => body.team_id || body.user_id, {
    message: 'Either team_id or user_id is required.',
  });

/** A match_statistics row. */
export const matchStatisticSchema = z.object({
  id: z.string().uuid(),
  match_id: z.string().uuid(),
  participant_id: z.string().uuid().nullable(),
  team_id: z.string().uuid().nullable(),
  user_id: z.string().uuid().nullable(),
  kills: z.number().int(),
  knocks: z.number().int(),
  damage: z.number().int(),
  placement_points: z.number().int(),
  survival_seconds: z.number().int(),
  extra: z.unknown(),
  created_at: z.string(),
});

export const createStatisticSchema = z.object({
  participant_id: z.string().uuid().nullable().optional(),
  team_id: z.string().uuid().nullable().optional(),
  user_id: z.string().uuid().nullable().optional(),
  kills: z.number().int().min(0).optional(),
  knocks: z.number().int().min(0).optional(),
  damage: z.number().int().min(0).optional(),
  placement_points: z.number().int().min(0).optional(),
  survival_seconds: z.number().int().min(0).optional(),
  extra: z.record(z.unknown()).optional(),
});

export type MatchResponse = z.infer<typeof matchSchema>;
export type ListMatchesQuery = z.infer<typeof listMatchesQuerySchema>;
export type CreateMatchBody = z.infer<typeof createMatchSchema>;
export type UpdateMatchBody = z.infer<typeof updateMatchSchema>;
export type MatchParticipantResponse = z.infer<typeof matchParticipantSchema>;
export type CreateParticipantBody = z.infer<typeof createParticipantSchema>;
export type MatchStatisticResponse = z.infer<typeof matchStatisticSchema>;
export type CreateStatisticBody = z.infer<typeof createStatisticSchema>;
