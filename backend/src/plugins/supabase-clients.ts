import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types.js';
import { getConfig, hasServiceRole, type AppConfig } from '../config/index.js';
import { AppError } from '../utils/errors.js';

/** A Supabase client fully typed against the generated Database schema. */
export type TypedSupabaseClient = SupabaseClient<Database>;

const NON_PERSISTING_AUTH = {
  autoRefreshToken: false,
  persistSession: false,
  detectSessionInUrl: false,
} as const;

/**
 * Create the privileged service-role client. Used only by workers and
 * privileged server-side operations — never per-request. Throws a clear
 * AppError if the service-role key is not configured.
 */
export function createServiceClient(config: AppConfig = getConfig()): TypedSupabaseClient {
  if (!hasServiceRole(config)) {
    throw AppError.serviceUnavailable(
      'Service-role operations are unavailable: SUPABASE_SERVICE_ROLE_KEY is not configured.',
    );
  }
  return createClient<Database>(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY as string, {
    auth: NON_PERSISTING_AUTH,
  });
}

/**
 * Create a per-request client scoped to a user's JWT so RLS applies. The token
 * is sent via the global Authorization header on every request.
 */
export function createUserClient(
  token: string,
  config: AppConfig = getConfig(),
): TypedSupabaseClient {
  return createClient<Database>(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    auth: NON_PERSISTING_AUTH,
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });
}

/**
 * Create an anonymous client (no user context). Useful for liveness/readiness
 * probes that only need to confirm connectivity.
 */
export function createAnonClient(config: AppConfig = getConfig()): TypedSupabaseClient {
  return createClient<Database>(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    auth: NON_PERSISTING_AUTH,
  });
}
