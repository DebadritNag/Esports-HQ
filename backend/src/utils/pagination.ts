/**
 * Limit/offset pagination helpers shared across list endpoints.
 */

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface RawPaginationQuery {
  limit?: number | string | null;
  offset?: number | string | null;
}

/** Clamp/normalize raw limit & offset query values into safe bounds. */
export function parsePagination(
  query: RawPaginationQuery = {},
  options: { defaultLimit?: number; maxLimit?: number } = {},
): PaginationParams {
  const defaultLimit = options.defaultLimit ?? DEFAULT_LIMIT;
  const maxLimit = options.maxLimit ?? MAX_LIMIT;

  const limit = clampInt(query.limit, defaultLimit, 1, maxLimit);
  const offset = clampInt(query.offset, 0, 0, Number.MAX_SAFE_INTEGER);

  return { limit, offset };
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  count: number;
  hasMore: boolean;
}

/** Build pagination metadata for a page of results. */
export function buildPaginationMeta(
  params: PaginationParams,
  total: number,
  count: number,
): PaginationMeta {
  const safeTotal = Math.max(0, Math.floor(total));
  return {
    total: safeTotal,
    limit: params.limit,
    offset: params.offset,
    count,
    hasMore: params.offset + count < safeTotal,
  };
}

/** Inclusive Postgrest range end index for a page (offset..rangeEnd). */
export function toRange(params: PaginationParams): { from: number; to: number } {
  return { from: params.offset, to: params.offset + params.limit - 1 };
}

function clampInt(
  value: number | string | null | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const floored = Math.floor(parsed);
  if (floored < min) {
    return min;
  }
  if (floored > max) {
    return max;
  }
  return floored;
}
