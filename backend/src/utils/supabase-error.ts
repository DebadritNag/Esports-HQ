import type { PostgrestError } from '@supabase/supabase-js';
import { AppError } from './errors.js';

/**
 * Translate a PostgREST/Postgres error into a typed {@link AppError} without
 * leaking SQL or stack detail to clients. RLS denials surface as 403, unique
 * violations as 409, missing-row lookups as 404; everything else is a 500 whose
 * underlying cause is attached only as the (non-serialized) error cause.
 */
export function mapPostgrestError(error: PostgrestError, context: string): AppError {
  switch (error.code) {
    // insufficient_privilege — RLS policy rejected the operation.
    case '42501':
      return AppError.forbidden('You do not have access to this resource.');
    // unique_violation
    case '23505':
      return AppError.conflict('That resource already exists.');
    // foreign_key_violation
    case '23503':
      return AppError.badRequest('A referenced resource does not exist.');
    // check_violation / not_null_violation
    case '23514':
    case '23502':
      return AppError.badRequest('The request violates a data constraint.');
    // no rows returned by .single()
    case 'PGRST116':
      return AppError.notFound('Resource not found.');
    default:
      return AppError.internal(`${context} failed`, error);
  }
}
