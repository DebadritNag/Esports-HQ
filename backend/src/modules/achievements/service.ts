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
  AchievementEvidenceResponse,
  AchievementResponse,
  CreateAchievementBody,
  CreateEvidenceBody,
  ListAchievementsQuery,
  UpdateAchievementBody,
} from './schema.js';

const ACHIEVEMENT_COLUMNS =
  'id, scope, title, description, placement, event_id, team_id, user_id, awarded_at, created_by, created_at, updated_at';
const EVIDENCE_COLUMNS =
  'id, achievement_id, file_name, storage_path, content_type, size_bytes, uploaded_by, created_at';

interface List<T> {
  data: T[];
  meta: PaginationMeta;
}

export async function listAchievements(
  client: TypedSupabaseClient,
  query: ListAchievementsQuery,
): Promise<List<AchievementResponse>> {
  const params: PaginationParams = { limit: query.limit, offset: query.offset };
  const { from, to } = toRange(params);
  let builder = client
    .from('achievements')
    .select(ACHIEVEMENT_COLUMNS, { count: 'exact' })
    .order('awarded_at', { ascending: false, nullsFirst: false })
    .range(from, to);
  if (query.scope) {
    builder = builder.eq('scope', query.scope);
  }
  if (query.team_id) {
    builder = builder.eq('team_id', query.team_id);
  }
  if (query.user_id) {
    builder = builder.eq('user_id', query.user_id);
  }
  if (query.event_id) {
    builder = builder.eq('event_id', query.event_id);
  }
  const { data, error, count } = await builder;
  if (error) {
    throw mapPostgrestError(error, 'List achievements');
  }
  const rows = (data ?? []) as AchievementResponse[];
  return { data: rows, meta: buildPaginationMeta(params, count ?? 0, rows.length) };
}

export async function getAchievement(
  client: TypedSupabaseClient,
  id: string,
): Promise<AchievementResponse> {
  const { data, error } = await client
    .from('achievements')
    .select(ACHIEVEMENT_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Load achievement');
  }
  if (!data) {
    throw AppError.notFound('Achievement not found.');
  }
  return data as AchievementResponse;
}

export async function createAchievement(
  client: TypedSupabaseClient,
  userId: string,
  body: CreateAchievementBody,
): Promise<AchievementResponse> {
  const { data, error } = await client
    .from('achievements')
    .insert({ ...body, created_by: userId })
    .select(ACHIEVEMENT_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Create achievement');
  }
  if (!data) {
    throw AppError.internal('Failed to create achievement');
  }
  return data as AchievementResponse;
}

export async function updateAchievement(
  client: TypedSupabaseClient,
  id: string,
  body: UpdateAchievementBody,
): Promise<AchievementResponse> {
  const { data, error } = await client
    .from('achievements')
    .update(body)
    .eq('id', id)
    .select(ACHIEVEMENT_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Update achievement');
  }
  if (!data) {
    throw AppError.notFound('Achievement not found.');
  }
  return data as AchievementResponse;
}

export async function listEvidence(
  client: TypedSupabaseClient,
  achievementId: string,
  query: PaginationQuery,
): Promise<List<AchievementEvidenceResponse>> {
  const params: PaginationParams = { limit: query.limit, offset: query.offset };
  const { from, to } = toRange(params);
  const { data, error, count } = await client
    .from('achievement_evidence')
    .select(EVIDENCE_COLUMNS, { count: 'exact' })
    .eq('achievement_id', achievementId)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) {
    throw mapPostgrestError(error, 'List achievement evidence');
  }
  const rows = (data ?? []) as AchievementEvidenceResponse[];
  return { data: rows, meta: buildPaginationMeta(params, count ?? 0, rows.length) };
}

export async function createEvidence(
  client: TypedSupabaseClient,
  achievementId: string,
  userId: string,
  body: CreateEvidenceBody,
): Promise<AchievementEvidenceResponse> {
  const { data, error } = await client
    .from('achievement_evidence')
    .insert({
      achievement_id: achievementId,
      uploaded_by: userId,
      file_name: body.file_name,
      storage_path: body.storage_path,
      ...(body.content_type !== undefined ? { content_type: body.content_type } : {}),
      ...(body.size_bytes !== undefined ? { size_bytes: body.size_bytes } : {}),
    })
    .select(EVIDENCE_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Create achievement evidence');
  }
  if (!data) {
    throw AppError.internal('Failed to create achievement evidence');
  }
  return data as AchievementEvidenceResponse;
}
