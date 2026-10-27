import { z } from 'zod';
import {
  connectionStatusSchema,
  paginationQuerySchema,
  sourceTypeSchema,
} from '../../schemas/common.js';

/**
 * A source_connections row as returned to clients. NOTE: `vault_secret_id`
 * contents are never exposed — we return only its presence as a boolean flag.
 */
export const sourceConnectionSchema = z.object({
  id: z.string().uuid(),
  organizer_id: z.string().uuid(),
  source_type: sourceTypeSchema,
  source_url: z.string().nullable(),
  external_source_id: z.string().nullable(),
  connection_status: connectionStatusSchema,
  config: z.unknown(),
  has_vault_secret: z.boolean(),
  last_checked_at: z.string().nullable(),
  last_success_at: z.string().nullable(),
  last_error: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

/** GET /integrations query (filter by organizer + pagination). */
export const listIntegrationsQuerySchema = paginationQuerySchema.extend({
  organizer_id: z.string().uuid().optional(),
});

/** POST /integrations/discord body. */
export const createDiscordIntegrationSchema = z.object({
  organizer_id: z.string().uuid(),
  guild_id: z.string().min(1).max(64),
  channel_id: z.string().min(1).max(64),
});

/** POST /imports/announcement body. */
export const importAnnouncementSchema = z.object({
  organizer_id: z.string().uuid().optional(),
  text: z.string().min(1).max(10000),
  source_timestamp: z.string().datetime({ offset: true }).optional(),
  organizer_timezone: z.string().min(1).max(100).optional(),
  source_url: z.string().url().max(1000).optional(),
});

/** POST /imports/ical body. */
export const importIcalSchema = z.object({
  organizer_id: z.string().uuid().optional(),
  ics: z.string().min(1).max(1_000_000),
  organizer_timezone: z.string().min(1).max(100).optional(),
  source_url: z.string().url().max(1000).optional(),
});

/** A parsed candidate returned by the import endpoints (never auto-confirmed). */
export const importCandidateSchema = z.object({
  candidate: z.record(z.unknown()),
  errors: z.array(z.string()),
  ambiguities: z.array(z.string()),
  needs_review: z.boolean(),
});

export const importAnnouncementResponseSchema = importCandidateSchema;

export const importIcalResponseSchema = z.object({
  candidates: z.array(importCandidateSchema),
  needs_review: z.boolean(),
});

export type SourceConnectionResponse = z.infer<typeof sourceConnectionSchema>;
export type ListIntegrationsQuery = z.infer<typeof listIntegrationsQuerySchema>;
export type CreateDiscordIntegrationBody = z.infer<typeof createDiscordIntegrationSchema>;
export type ImportAnnouncementBody = z.infer<typeof importAnnouncementSchema>;
export type ImportIcalBody = z.infer<typeof importIcalSchema>;
