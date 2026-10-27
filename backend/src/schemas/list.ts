import { z } from 'zod';
import { paginationMetaSchema } from './common.js';

/**
 * Wrap an item schema into the standard paginated list envelope:
 * `{ data: Item[], meta: PaginationMeta }`. Every list endpoint reuses this so
 * the response shape (and its OpenAPI documentation) stays consistent.
 */
export function listResponseSchema<T extends z.ZodTypeAny>(
  item: T,
): z.ZodObject<{ data: z.ZodArray<T>; meta: typeof paginationMetaSchema }> {
  return z.object({
    data: z.array(item),
    meta: paginationMetaSchema,
  });
}
