import type { TypedSupabaseClient } from '../../plugins/supabase-clients.js';
import { AppError } from '../../utils/errors.js';
import { mapPostgrestError } from '../../utils/supabase-error.js';
import {
  buildPaginationMeta,
  toRange,
  type PaginationMeta,
  type PaginationParams,
} from '../../utils/pagination.js';
import type { PaginationQuery } from '../../schemas/common.js';
import type {
  AddMemberBody,
  CreateAnnouncementBody,
  CreateInvitationBody,
  CreateTeamBody,
  ListTeamsQuery,
  TeamAnnouncementResponse,
  TeamInvitationResponse,
  TeamMemberResponse,
  TeamResponse,
  UpdateMemberBody,
  UpdateTeamBody,
} from './schema.js';

const TEAM_COLUMNS =
  'id, name, slug, tag, game, bio, logo_path, owner_id, created_at, updated_at';
const MEMBER_COLUMNS = 'id, team_id, user_id, role, jersey_number, joined_at';
// SECURITY: `token` is intentionally not selected — invite tokens are secrets.
const INVITATION_COLUMNS =
  'id, team_id, invited_by, invited_user_id, invited_email, role, status, expires_at, responded_at, created_at';
const ANNOUNCEMENT_COLUMNS = 'id, team_id, author_id, title, body, created_at, updated_at';

interface List<T> {
  data: T[];
  meta: PaginationMeta;
}

function paginate(query: PaginationQuery): { params: PaginationParams; from: number; to: number } {
  const params: PaginationParams = { limit: query.limit, offset: query.offset };
  const { from, to } = toRange(params);
  return { params, from, to };
}

export async function listTeams(
  client: TypedSupabaseClient,
  query: ListTeamsQuery,
): Promise<List<TeamResponse>> {
  const { params, from, to } = paginate(query);
  let builder = client
    .from('teams')
    .select(TEAM_COLUMNS, { count: 'exact' })
    .order('name', { ascending: true })
    .range(from, to);
  if (query.game) {
    builder = builder.eq('game', query.game);
  }
  if (query.slug) {
    builder = builder.eq('slug', query.slug);
  }
  const { data, error, count } = await builder;
  if (error) {
    throw mapPostgrestError(error, 'List teams');
  }
  const rows = (data ?? []) as TeamResponse[];
  return { data: rows, meta: buildPaginationMeta(params, count ?? 0, rows.length) };
}

export async function getTeam(client: TypedSupabaseClient, id: string): Promise<TeamResponse> {
  const { data, error } = await client
    .from('teams')
    .select(TEAM_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Load team');
  }
  if (!data) {
    throw AppError.notFound('Team not found.');
  }
  return data as TeamResponse;
}

export async function createTeam(
  client: TypedSupabaseClient,
  userId: string,
  body: CreateTeamBody,
): Promise<TeamResponse> {
  const { data, error } = await client
    .from('teams')
    .insert({ ...body, owner_id: userId })
    .select(TEAM_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Create team');
  }
  if (!data) {
    throw AppError.internal('Failed to create team');
  }
  return data as TeamResponse;
}

export async function updateTeam(
  client: TypedSupabaseClient,
  id: string,
  body: UpdateTeamBody,
): Promise<TeamResponse> {
  const { data, error } = await client
    .from('teams')
    .update(body)
    .eq('id', id)
    .select(TEAM_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Update team');
  }
  if (!data) {
    throw AppError.notFound('Team not found.');
  }
  return data as TeamResponse;
}

export async function deleteTeam(client: TypedSupabaseClient, id: string): Promise<void> {
  const { data, error } = await client
    .from('teams')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Delete team');
  }
  if (!data) {
    throw AppError.notFound('Team not found.');
  }
}

export async function listMembers(
  client: TypedSupabaseClient,
  teamId: string,
  query: PaginationQuery,
): Promise<List<TeamMemberResponse>> {
  const { params, from, to } = paginate(query);
  const { data, error, count } = await client
    .from('team_members')
    .select(MEMBER_COLUMNS, { count: 'exact' })
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true })
    .range(from, to);
  if (error) {
    throw mapPostgrestError(error, 'List team members');
  }
  const rows = (data ?? []) as TeamMemberResponse[];
  return { data: rows, meta: buildPaginationMeta(params, count ?? 0, rows.length) };
}

export async function addMember(
  client: TypedSupabaseClient,
  teamId: string,
  body: AddMemberBody,
): Promise<TeamMemberResponse> {
  const { data, error } = await client
    .from('team_members')
    .insert({
      team_id: teamId,
      user_id: body.user_id,
      ...(body.role ? { role: body.role } : {}),
      ...(body.jersey_number !== undefined ? { jersey_number: body.jersey_number } : {}),
    })
    .select(MEMBER_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Add team member');
  }
  if (!data) {
    throw AppError.internal('Failed to add team member');
  }
  return data as TeamMemberResponse;
}

export async function updateMember(
  client: TypedSupabaseClient,
  teamId: string,
  memberId: string,
  body: UpdateMemberBody,
): Promise<TeamMemberResponse> {
  const { data, error } = await client
    .from('team_members')
    .update(body)
    .eq('id', memberId)
    .eq('team_id', teamId)
    .select(MEMBER_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Update team member');
  }
  if (!data) {
    throw AppError.notFound('Team member not found.');
  }
  return data as TeamMemberResponse;
}

export async function removeMember(
  client: TypedSupabaseClient,
  teamId: string,
  memberId: string,
): Promise<void> {
  const { data, error } = await client
    .from('team_members')
    .delete()
    .eq('id', memberId)
    .eq('team_id', teamId)
    .select('id')
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Remove team member');
  }
  if (!data) {
    throw AppError.notFound('Team member not found.');
  }
}

export async function listInvitations(
  client: TypedSupabaseClient,
  teamId: string,
  query: PaginationQuery,
): Promise<List<TeamInvitationResponse>> {
  const { params, from, to } = paginate(query);
  const { data, error, count } = await client
    .from('team_invitations')
    .select(INVITATION_COLUMNS, { count: 'exact' })
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) {
    throw mapPostgrestError(error, 'List invitations');
  }
  const rows = (data ?? []) as TeamInvitationResponse[];
  return { data: rows, meta: buildPaginationMeta(params, count ?? 0, rows.length) };
}

export async function createInvitation(
  client: TypedSupabaseClient,
  teamId: string,
  userId: string,
  body: CreateInvitationBody,
): Promise<TeamInvitationResponse> {
  const { data, error } = await client
    .from('team_invitations')
    .insert({
      team_id: teamId,
      invited_by: userId,
      ...(body.invited_user_id ? { invited_user_id: body.invited_user_id } : {}),
      ...(body.invited_email ? { invited_email: body.invited_email } : {}),
      ...(body.role ? { role: body.role } : {}),
    })
    // SECURITY: projection excludes `token`.
    .select(INVITATION_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Create invitation');
  }
  if (!data) {
    throw AppError.internal('Failed to create invitation');
  }
  return data as TeamInvitationResponse;
}

export async function listAnnouncements(
  client: TypedSupabaseClient,
  teamId: string,
  query: PaginationQuery,
): Promise<List<TeamAnnouncementResponse>> {
  const { params, from, to } = paginate(query);
  const { data, error, count } = await client
    .from('team_announcements')
    .select(ANNOUNCEMENT_COLUMNS, { count: 'exact' })
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) {
    throw mapPostgrestError(error, 'List announcements');
  }
  const rows = (data ?? []) as TeamAnnouncementResponse[];
  return { data: rows, meta: buildPaginationMeta(params, count ?? 0, rows.length) };
}

export async function createAnnouncement(
  client: TypedSupabaseClient,
  teamId: string,
  userId: string,
  body: CreateAnnouncementBody,
): Promise<TeamAnnouncementResponse> {
  const { data, error } = await client
    .from('team_announcements')
    .insert({
      team_id: teamId,
      author_id: userId,
      title: body.title,
      ...(body.body !== undefined ? { body: body.body } : {}),
    })
    .select(ANNOUNCEMENT_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Create announcement');
  }
  if (!data) {
    throw AppError.internal('Failed to create announcement');
  }
  return data as TeamAnnouncementResponse;
}
