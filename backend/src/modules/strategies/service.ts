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
  CreateAttachmentBody,
  CreateStrategyRoomBody,
  StrategyAttachmentResponse,
  StrategyRoomResponse,
  UpdateStrategyRoomBody,
} from './schema.js';

const ROOM_COLUMNS =
  'id, team_id, name, description, content, created_by, created_at, updated_at';
const ATTACHMENT_COLUMNS =
  'id, strategy_room_id, team_id, file_name, storage_path, content_type, size_bytes, uploaded_by, created_at';

interface List<T> {
  data: T[];
  meta: PaginationMeta;
}

export async function listStrategyRooms(
  client: TypedSupabaseClient,
  teamId: string,
  query: PaginationQuery,
): Promise<List<StrategyRoomResponse>> {
  const params: PaginationParams = { limit: query.limit, offset: query.offset };
  const { from, to } = toRange(params);
  const { data, error, count } = await client
    .from('strategy_rooms')
    .select(ROOM_COLUMNS, { count: 'exact' })
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) {
    throw mapPostgrestError(error, 'List strategy rooms');
  }
  const rows = (data ?? []) as StrategyRoomResponse[];
  return { data: rows, meta: buildPaginationMeta(params, count ?? 0, rows.length) };
}

export async function createStrategyRoom(
  client: TypedSupabaseClient,
  teamId: string,
  userId: string,
  body: CreateStrategyRoomBody,
): Promise<StrategyRoomResponse> {
  const { data, error } = await client
    .from('strategy_rooms')
    .insert({
      team_id: teamId,
      created_by: userId,
      name: body.name,
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.content !== undefined ? { content: body.content as never } : {}),
    })
    .select(ROOM_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Create strategy room');
  }
  if (!data) {
    throw AppError.internal('Failed to create strategy room');
  }
  return data as StrategyRoomResponse;
}

export async function updateStrategyRoom(
  client: TypedSupabaseClient,
  roomId: string,
  body: UpdateStrategyRoomBody,
): Promise<StrategyRoomResponse> {
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.description !== undefined) patch.description = body.description;
  if (body.content !== undefined) patch.content = body.content;

  const { data, error } = await client
    .from('strategy_rooms')
    .update(patch as never)
    .eq('id', roomId)
    .select(ROOM_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Update strategy room');
  }
  if (!data) {
    throw AppError.notFound('Strategy room not found.');
  }
  return data as StrategyRoomResponse;
}

export async function deleteStrategyRoom(
  client: TypedSupabaseClient,
  roomId: string,
): Promise<void> {
  const { data, error } = await client
    .from('strategy_rooms')
    .delete()
    .eq('id', roomId)
    .select('id')
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Delete strategy room');
  }
  if (!data) {
    throw AppError.notFound('Strategy room not found.');
  }
}

export async function listAttachments(
  client: TypedSupabaseClient,
  roomId: string,
  query: PaginationQuery,
): Promise<List<StrategyAttachmentResponse>> {
  const params: PaginationParams = { limit: query.limit, offset: query.offset };
  const { from, to } = toRange(params);
  const { data, error, count } = await client
    .from('strategy_attachments')
    .select(ATTACHMENT_COLUMNS, { count: 'exact' })
    .eq('strategy_room_id', roomId)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) {
    throw mapPostgrestError(error, 'List strategy attachments');
  }
  const rows = (data ?? []) as StrategyAttachmentResponse[];
  return { data: rows, meta: buildPaginationMeta(params, count ?? 0, rows.length) };
}

/**
 * Register attachment metadata. We look up the room's team_id so the stored
 * row stays consistent; the bytes themselves are not handled here.
 */
export async function createAttachment(
  client: TypedSupabaseClient,
  roomId: string,
  userId: string,
  body: CreateAttachmentBody,
): Promise<StrategyAttachmentResponse> {
  const { data: room, error: roomError } = await client
    .from('strategy_rooms')
    .select('id, team_id')
    .eq('id', roomId)
    .maybeSingle();
  if (roomError) {
    throw mapPostgrestError(roomError, 'Load strategy room');
  }
  if (!room) {
    throw AppError.notFound('Strategy room not found.');
  }

  const { data, error } = await client
    .from('strategy_attachments')
    .insert({
      strategy_room_id: roomId,
      team_id: room.team_id,
      uploaded_by: userId,
      file_name: body.file_name,
      storage_path: body.storage_path,
      ...(body.content_type !== undefined ? { content_type: body.content_type } : {}),
      ...(body.size_bytes !== undefined ? { size_bytes: body.size_bytes } : {}),
    })
    .select(ATTACHMENT_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Create strategy attachment');
  }
  if (!data) {
    throw AppError.internal('Failed to create strategy attachment');
  }
  return data as StrategyAttachmentResponse;
}
