import { z } from 'zod';
import { paginationQuerySchema } from '../../schemas/common.js';

/** A strategy_rooms row. */
export const strategyRoomSchema = z.object({
  id: z.string().uuid(),
  team_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  content: z.unknown(),
  created_by: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const createStrategyRoomSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  content: z.unknown().optional(),
});

export const updateStrategyRoomSchema = z
  .object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).nullable(),
    content: z.unknown(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field must be provided.',
  });

/**
 * A strategy_attachments metadata row. This is metadata only — the attachment
 * bytes live in the private `strategy-attachments` bucket and are never
 * streamed through this API.
 */
export const strategyAttachmentSchema = z.object({
  id: z.string().uuid(),
  strategy_room_id: z.string().uuid(),
  team_id: z.string().uuid(),
  file_name: z.string(),
  storage_path: z.string(),
  content_type: z.string().nullable(),
  size_bytes: z.number().int().nullable(),
  uploaded_by: z.string().uuid().nullable(),
  created_at: z.string(),
});

/**
 * Register attachment metadata. `storage_path` must be scoped to
 * `team_id/room_id/file` in the private bucket (enforced by convention + RLS).
 */
export const createAttachmentSchema = z.object({
  file_name: z.string().min(1).max(255),
  storage_path: z.string().min(1).max(1000),
  content_type: z.string().max(255).nullable().optional(),
  size_bytes: z.number().int().min(0).nullable().optional(),
});

export const listQuerySchema = paginationQuerySchema;

export type StrategyRoomResponse = z.infer<typeof strategyRoomSchema>;
export type CreateStrategyRoomBody = z.infer<typeof createStrategyRoomSchema>;
export type UpdateStrategyRoomBody = z.infer<typeof updateStrategyRoomSchema>;
export type StrategyAttachmentResponse = z.infer<typeof strategyAttachmentSchema>;
export type CreateAttachmentBody = z.infer<typeof createAttachmentSchema>;
