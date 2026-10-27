import type { TypedSupabaseClient } from '../../plugins/supabase-clients.js';
import { AppError } from '../../utils/errors.js';
import { mapPostgrestError } from '../../utils/supabase-error.js';
import {
  buildPaginationMeta,
  toRange,
  type PaginationMeta,
  type PaginationParams,
} from '../../utils/pagination.js';
import type {
  CreateOrganizerBody,
  ListOrganizersQuery,
  OrganizerFollowResponse,
  OrganizerResponse,
  UpdateOrganizerBody,
} from './schema.js';

const ORGANIZER_COLUMNS =
  'id, name, slug, game, description, website_url, discord_invite_url, timezone, default_registration_time, default_stream_time, is_verified, created_by, created_at, updated_at';
const FOLLOW_COLUMNS = 'id, organizer_id, user_id, is_active, created_at';

export interface OrganizerList {
  data: OrganizerResponse[];
  meta: PaginationMeta;
}

/** List organizers with optional game/slug/is_verified filters + pagination. */
export async function listOrganizers(
  client: TypedSupabaseClient,
  query: ListOrganizersQuery,
): Promise<OrganizerList> {
  const params: PaginationParams = { limit: query.limit, offset: query.offset };
  const { from, to } = toRange(params);

  let builder = client
    .from('organizers')
    .select(ORGANIZER_COLUMNS, { count: 'exact' })
    .order('name', { ascending: true })
    .range(from, to);

  if (query.game) {
    builder = builder.eq('game', query.game);
  }
  if (query.slug) {
    builder = builder.eq('slug', query.slug);
  }
  if (query.is_verified !== undefined) {
    builder = builder.eq('is_verified', query.is_verified);
  }

  const { data, error, count } = await builder;
  if (error) {
    throw mapPostgrestError(error, 'List organizers');
  }
  const rows = (data ?? []) as OrganizerResponse[];
  return { data: rows, meta: buildPaginationMeta(params, count ?? 0, rows.length) };
}

/** Get a single organizer by id. 404 when absent. */
export async function getOrganizer(
  client: TypedSupabaseClient,
  id: string,
): Promise<OrganizerResponse> {
  const { data, error } = await client
    .from('organizers')
    .select(ORGANIZER_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Load organizer');
  }
  if (!data) {
    throw AppError.notFound('Organizer not found.');
  }
  return data as OrganizerResponse;
}

/** Create an organizer, stamping the caller as created_by (RLS applies). */
export async function createOrganizer(
  client: TypedSupabaseClient,
  userId: string,
  body: CreateOrganizerBody,
): Promise<OrganizerResponse> {
  const { data, error } = await client
    .from('organizers')
    .insert({ ...body, created_by: userId })
    .select(ORGANIZER_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Create organizer');
  }
  if (!data) {
    throw AppError.internal('Failed to create organizer');
  }
  return data as OrganizerResponse;
}

/** Patch an organizer (RLS restricts to permitted callers). */
export async function updateOrganizer(
  client: TypedSupabaseClient,
  id: string,
  body: UpdateOrganizerBody,
): Promise<OrganizerResponse> {
  const { data, error } = await client
    .from('organizers')
    .update(body)
    .eq('id', id)
    .select(ORGANIZER_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Update organizer');
  }
  if (!data) {
    throw AppError.notFound('Organizer not found.');
  }
  return data as OrganizerResponse;
}

/** Follow an organizer — upsert the (user, organizer) row to is_active=true. */
export async function followOrganizer(
  client: TypedSupabaseClient,
  userId: string,
  organizerId: string,
): Promise<OrganizerFollowResponse> {
  const { data, error } = await client
    .from('organizer_follows')
    .upsert(
      { user_id: userId, organizer_id: organizerId, is_active: true },
      { onConflict: 'user_id,organizer_id' },
    )
    .select(FOLLOW_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Follow organizer');
  }
  if (!data) {
    throw AppError.internal('Failed to follow organizer');
  }
  return data as OrganizerFollowResponse;
}

/** Unfollow — upsert the row to is_active=false (soft unfollow). */
export async function unfollowOrganizer(
  client: TypedSupabaseClient,
  userId: string,
  organizerId: string,
): Promise<OrganizerFollowResponse> {
  const { data, error } = await client
    .from('organizer_follows')
    .upsert(
      { user_id: userId, organizer_id: organizerId, is_active: false },
      { onConflict: 'user_id,organizer_id' },
    )
    .select(FOLLOW_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Unfollow organizer');
  }
  if (!data) {
    throw AppError.internal('Failed to unfollow organizer');
  }
  return data as OrganizerFollowResponse;
}
