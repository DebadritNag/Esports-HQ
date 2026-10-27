import type { FastifyRequest } from 'fastify';
import type { TypedSupabaseClient } from '../plugins/supabase-clients.js';
import { AppError } from './errors.js';

export interface AuthContext {
  userId: string;
  client: TypedSupabaseClient;
}

/**
 * Extract the authenticated user id + RLS-scoped client that the auth plugin
 * attached. Routes guarded by `app.authenticate` always have these set; this
 * helper narrows the optional types and throws a 401 defensively otherwise.
 */
export function requireAuth(request: FastifyRequest): AuthContext {
  if (!request.user || !request.userClient) {
    throw AppError.unauthorized('Authentication required.');
  }
  return { userId: request.user.id, client: request.userClient };
}
