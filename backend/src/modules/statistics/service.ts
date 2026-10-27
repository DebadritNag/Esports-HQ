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
  CreateMatchBody,
  CreateParticipantBody,
  CreateStatisticBody,
  ListMatchesQuery,
  MatchParticipantResponse,
  MatchResponse,
  MatchStatisticResponse,
  UpdateMatchBody,
} from './schema.js';

const MATCH_COLUMNS =
  'id, event_id, organizer_id, title, round_label, map_name, status, scheduled_at, started_at, ended_at, created_at, updated_at';
const PARTICIPANT_COLUMNS =
  'id, match_id, team_id, user_id, slot_label, placement, created_at';
const STATISTIC_COLUMNS =
  'id, match_id, participant_id, team_id, user_id, kills, knocks, damage, placement_points, survival_seconds, extra, created_at';

interface List<T> {
  data: T[];
  meta: PaginationMeta;
}

export async function listMatches(
  client: TypedSupabaseClient,
  query: ListMatchesQuery,
): Promise<List<MatchResponse>> {
  const params: PaginationParams = { limit: query.limit, offset: query.offset };
  const { from, to } = toRange(params);
  let builder = client
    .from('matches')
    .select(MATCH_COLUMNS, { count: 'exact' })
    .order('scheduled_at', { ascending: false, nullsFirst: false })
    .range(from, to);
  if (query.event_id) {
    builder = builder.eq('event_id', query.event_id);
  }
  if (query.organizer_id) {
    builder = builder.eq('organizer_id', query.organizer_id);
  }
  if (query.status) {
    builder = builder.eq('status', query.status);
  }
  const { data, error, count } = await builder;
  if (error) {
    throw mapPostgrestError(error, 'List matches');
  }
  const rows = (data ?? []) as MatchResponse[];
  return { data: rows, meta: buildPaginationMeta(params, count ?? 0, rows.length) };
}

export async function getMatch(
  client: TypedSupabaseClient,
  id: string,
): Promise<MatchResponse> {
  const { data, error } = await client
    .from('matches')
    .select(MATCH_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Load match');
  }
  if (!data) {
    throw AppError.notFound('Match not found.');
  }
  return data as MatchResponse;
}

export async function createMatch(
  client: TypedSupabaseClient,
  body: CreateMatchBody,
): Promise<MatchResponse> {
  const { data, error } = await client
    .from('matches')
    .insert(body)
    .select(MATCH_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Create match');
  }
  if (!data) {
    throw AppError.internal('Failed to create match');
  }
  return data as MatchResponse;
}

export async function updateMatch(
  client: TypedSupabaseClient,
  id: string,
  body: UpdateMatchBody,
): Promise<MatchResponse> {
  const { data, error } = await client
    .from('matches')
    .update(body)
    .eq('id', id)
    .select(MATCH_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Update match');
  }
  if (!data) {
    throw AppError.notFound('Match not found.');
  }
  return data as MatchResponse;
}

export async function listParticipants(
  client: TypedSupabaseClient,
  matchId: string,
  query: PaginationQuery,
): Promise<List<MatchParticipantResponse>> {
  const params: PaginationParams = { limit: query.limit, offset: query.offset };
  const { from, to } = toRange(params);
  const { data, error, count } = await client
    .from('match_participants')
    .select(PARTICIPANT_COLUMNS, { count: 'exact' })
    .eq('match_id', matchId)
    .order('placement', { ascending: true, nullsFirst: false })
    .range(from, to);
  if (error) {
    throw mapPostgrestError(error, 'List match participants');
  }
  const rows = (data ?? []) as MatchParticipantResponse[];
  return { data: rows, meta: buildPaginationMeta(params, count ?? 0, rows.length) };
}

export async function createParticipant(
  client: TypedSupabaseClient,
  matchId: string,
  body: CreateParticipantBody,
): Promise<MatchParticipantResponse> {
  const { data, error } = await client
    .from('match_participants')
    .insert({ match_id: matchId, ...body })
    .select(PARTICIPANT_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Create match participant');
  }
  if (!data) {
    throw AppError.internal('Failed to create match participant');
  }
  return data as MatchParticipantResponse;
}

export async function listStatistics(
  client: TypedSupabaseClient,
  matchId: string,
  query: PaginationQuery,
): Promise<List<MatchStatisticResponse>> {
  const params: PaginationParams = { limit: query.limit, offset: query.offset };
  const { from, to } = toRange(params);
  const { data, error, count } = await client
    .from('match_statistics')
    .select(STATISTIC_COLUMNS, { count: 'exact' })
    .eq('match_id', matchId)
    .order('created_at', { ascending: true })
    .range(from, to);
  if (error) {
    throw mapPostgrestError(error, 'List match statistics');
  }
  const rows = (data ?? []) as MatchStatisticResponse[];
  return { data: rows, meta: buildPaginationMeta(params, count ?? 0, rows.length) };
}

export async function createStatistic(
  client: TypedSupabaseClient,
  matchId: string,
  body: CreateStatisticBody,
): Promise<MatchStatisticResponse> {
  const { extra, ...rest } = body;
  const insert = {
    match_id: matchId,
    ...rest,
    ...(extra !== undefined ? { extra: extra as never } : {}),
  };
  const { data, error } = await client
    .from('match_statistics')
    .insert(insert)
    .select(STATISTIC_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Create match statistic');
  }
  if (!data) {
    throw AppError.internal('Failed to create match statistic');
  }
  return data as MatchStatisticResponse;
}
