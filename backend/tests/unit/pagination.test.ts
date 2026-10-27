import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  buildPaginationMeta,
  parsePagination,
  toRange,
} from '../../src/utils/pagination.js';

describe('pagination', () => {
  it('applies defaults when values are absent', () => {
    expect(parsePagination({})).toEqual({ limit: DEFAULT_LIMIT, offset: 0 });
    expect(parsePagination()).toEqual({ limit: DEFAULT_LIMIT, offset: 0 });
  });

  it('parses string query values', () => {
    expect(parsePagination({ limit: '15', offset: '30' })).toEqual({ limit: 15, offset: 30 });
  });

  it('clamps limit to [1, MAX_LIMIT]', () => {
    expect(parsePagination({ limit: 0 }).limit).toBe(1);
    expect(parsePagination({ limit: -5 }).limit).toBe(1);
    expect(parsePagination({ limit: MAX_LIMIT + 50 }).limit).toBe(MAX_LIMIT);
  });

  it('clamps offset to >= 0 and ignores invalid input', () => {
    expect(parsePagination({ offset: -10 }).offset).toBe(0);
    expect(parsePagination({ offset: 'abc' }).offset).toBe(0);
    expect(parsePagination({ limit: 'xyz' }).limit).toBe(DEFAULT_LIMIT);
  });

  it('builds meta with hasMore', () => {
    const params = { limit: 10, offset: 0 };
    const meta = buildPaginationMeta(params, 25, 10);
    expect(meta).toEqual({ total: 25, limit: 10, offset: 0, count: 10, hasMore: true });

    const lastPage = buildPaginationMeta({ limit: 10, offset: 20 }, 25, 5);
    expect(lastPage.hasMore).toBe(false);
  });

  it('computes an inclusive postgrest range', () => {
    expect(toRange({ limit: 10, offset: 0 })).toEqual({ from: 0, to: 9 });
    expect(toRange({ limit: 25, offset: 50 })).toEqual({ from: 50, to: 74 });
  });
});
