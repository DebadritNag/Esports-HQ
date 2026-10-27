import type { User } from '@supabase/supabase-js';
import type { AppConfig } from '../config/index.js';
import type { TypedSupabaseClient } from '../plugins/supabase-clients.js';

declare module 'fastify' {
  interface FastifyInstance {
    /** Validated application configuration. */
    config: AppConfig;
    /**
     * Lazily-created service-role client. Throws if the service-role key is
     * not configured — guard with `app.config` / `hasServiceRole` first.
     */
    readonly supabase: TypedSupabaseClient;
    /** True when a service-role key is configured. */
    hasServiceRole: boolean;
    /** Build a per-request user-scoped client from a bearer token. */
    userClient(token: string): TypedSupabaseClient;
  }

  interface FastifyRequest {
    /** Authenticated Supabase user (set by the auth plugin). */
    user?: User;
    /** The raw bearer token for the current request, if present. */
    accessToken?: string;
    /** Per-request, RLS-scoped Supabase client (set by the auth plugin). */
    userClient?: TypedSupabaseClient;
  }
}

export {};
