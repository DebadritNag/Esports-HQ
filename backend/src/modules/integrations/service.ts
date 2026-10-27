import type { FastifyInstance } from 'fastify';
import { hasDiscord } from '../../config/index.js';
import type { TypedSupabaseClient } from '../../plugins/supabase-clients.js';
import { AppError } from '../../utils/errors.js';
import { mapPostgrestError } from '../../utils/supabase-error.js';
import {
  buildPaginationMeta,
  toRange,
  type PaginationMeta,
  type PaginationParams,
} from '../../utils/pagination.js';
import { parseAnnouncement } from './sources/announcement-parser.js';
import { createIcalAdapter } from './sources/ical-adapter.js';
import type {
  CreateDiscordIntegrationBody,
  ImportAnnouncementBody,
  ImportIcalBody,
  ListIntegrationsQuery,
  SourceConnectionResponse,
} from './schema.js';

// SECURITY: vault_secret_id is selected only so we can report its PRESENCE as a
// boolean. Its value is never placed in a response.
const CONNECTION_COLUMNS =
  'id, organizer_id, source_type, source_url, external_source_id, connection_status, config, vault_secret_id, last_checked_at, last_success_at, last_error, created_at, updated_at';

interface ConnectionRow {
  id: string;
  organizer_id: string;
  source_type: SourceConnectionResponse['source_type'];
  source_url: string | null;
  external_source_id: string | null;
  connection_status: SourceConnectionResponse['connection_status'];
  config: unknown;
  vault_secret_id: string | null;
  last_checked_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

function toConnectionResponse(row: ConnectionRow): SourceConnectionResponse {
  const { vault_secret_id, ...rest } = row;
  return { ...rest, has_vault_secret: vault_secret_id !== null };
}

export interface IntegrationList {
  data: SourceConnectionResponse[];
  meta: PaginationMeta;
}

/**
 * List source connections visible to the caller (RLS restricts to the
 * organizers they can see). Vault secret contents are never exposed.
 */
export async function listIntegrations(
  client: TypedSupabaseClient,
  query: ListIntegrationsQuery,
): Promise<IntegrationList> {
  const params: PaginationParams = { limit: query.limit, offset: query.offset };
  const { from, to } = toRange(params);
  let builder = client
    .from('source_connections')
    .select(CONNECTION_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (query.organizer_id) {
    builder = builder.eq('organizer_id', query.organizer_id);
  }
  const { data, error, count } = await builder;
  if (error) {
    throw mapPostgrestError(error, 'List integrations');
  }
  const rows = (data ?? []) as unknown as ConnectionRow[];
  return {
    data: rows.map(toConnectionResponse),
    meta: buildPaginationMeta(params, count ?? 0, rows.length),
  };
}

/**
 * Register a Discord integration.
 *
 * Writing the bot token into Vault requires the service-role client AND a
 * configured DISCORD_BOT_TOKEN. When Vault wiring is absent we return 501 with
 * a clear message — never a fake success.
 */
export async function createDiscordIntegration(
  app: FastifyInstance,
  client: TypedSupabaseClient,
  userId: string,
  body: CreateDiscordIntegrationBody,
): Promise<SourceConnectionResponse> {
  if (!app.hasServiceRole || !hasDiscord(app.config)) {
    throw AppError.notImplemented(
      'Discord integration requires DISCORD_BOT_TOKEN and a wired Vault (service-role) to store the token reference. Vault is not wired in this environment.',
    );
  }

  // Vault write path (service-role) would store the token reference here and
  // set vault_secret_id. That path is intentionally not reachable until Vault
  // is wired; the guard above returns 501 before we get here.
  const { data, error } = await client
    .from('source_connections')
    .insert({
      organizer_id: body.organizer_id,
      source_type: 'discord',
      connection_status: 'pending',
      config: { guild_id: body.guild_id, channel_id: body.channel_id },
      created_by: userId,
    })
    .select(CONNECTION_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Create Discord integration');
  }
  if (!data) {
    throw AppError.internal('Failed to create Discord integration');
  }
  return toConnectionResponse(data as unknown as ConnectionRow);
}

/** Delete a source connection (RLS restricts to permitted callers). */
export async function deleteIntegration(
  client: TypedSupabaseClient,
  id: string,
): Promise<void> {
  const { data, error } = await client
    .from('source_connections')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Delete integration');
  }
  if (!data) {
    throw AppError.notFound('Integration not found.');
  }
}

/**
 * Parse a pasted announcement. Returns the candidate + needs_review; never
 * auto-confirms and never writes an event.
 */
export function importAnnouncement(body: ImportAnnouncementBody): {
  candidate: Record<string, unknown>;
  errors: string[];
  ambiguities: string[];
  needs_review: boolean;
} {
  const result = parseAnnouncement({
    text: body.text,
    sourceTimestamp: body.source_timestamp ? new Date(body.source_timestamp) : undefined,
    organizerTimezone: body.organizer_timezone,
    sourceUrl: body.source_url,
  });
  return {
    candidate: result.candidate as Record<string, unknown>,
    errors: result.errors,
    ambiguities: result.ambiguities,
    needs_review: result.needsReview,
  };
}

/**
 * Parse an ICS payload via the ical adapter. Returns one candidate per VEVENT;
 * needs_review is true when the feed yields no usable candidates.
 */
export async function importIcal(body: ImportIcalBody): Promise<{
  candidates: {
    candidate: Record<string, unknown>;
    errors: string[];
    ambiguities: string[];
    needs_review: boolean;
  }[];
  needs_review: boolean;
}> {
  const adapter = createIcalAdapter('ical');
  const context = {
    payload: body.ics,
    organizerTimezone: body.organizer_timezone,
    sourceUrl: body.source_url,
  };
  const parsed = await adapter.parse(body.ics, context);
  if (!parsed.ok) {
    if (parsed.kind === 'unsupported') {
      throw AppError.unsupported(parsed.reason);
    }
    throw AppError.badRequest(`Failed to parse ICS: ${parsed.message}`);
  }

  const candidates = parsed.value.map((item) => {
    const hasTitle = typeof item.candidate.title === 'string' && item.candidate.title.length > 0;
    const hasDate = typeof item.candidate.eventDate === 'string';
    const needsReview = !hasTitle || !hasDate;
    return {
      candidate: item.candidate as unknown as Record<string, unknown>,
      errors: [] as string[],
      ambiguities: [] as string[],
      needs_review: needsReview,
    };
  });

  return {
    candidates,
    needs_review: candidates.length === 0 || candidates.some((c) => c.needs_review),
  };
}
