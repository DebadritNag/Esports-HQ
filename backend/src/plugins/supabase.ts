import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { getConfig, hasServiceRole, type AppConfig } from '../config/index.js';
import {
  createServiceClient,
  createUserClient,
  type TypedSupabaseClient,
} from './supabase-clients.js';

export interface SupabasePluginOptions {
  config?: AppConfig;
}

/**
 * Decorates the Fastify instance with Supabase access:
 *  - `app.config`          validated configuration
 *  - `app.hasServiceRole`  whether privileged ops are available
 *  - `app.supabase`        lazily-built service-role client (throws if absent)
 *  - `app.userClient(tok)` per-request RLS-scoped client factory
 */
async function supabasePlugin(
  app: FastifyInstance,
  options: SupabasePluginOptions,
): Promise<void> {
  const config = options.config ?? getConfig();

  if (!app.hasDecorator('config')) {
    app.decorate('config', config);
  }
  app.decorate('hasServiceRole', hasServiceRole(config));

  let serviceClient: TypedSupabaseClient | undefined;
  app.decorate('supabase', {
    getter(): TypedSupabaseClient {
      if (!serviceClient) {
        serviceClient = createServiceClient(config);
      }
      return serviceClient;
    },
  } as unknown as TypedSupabaseClient);

  app.decorate('userClient', (token: string): TypedSupabaseClient =>
    createUserClient(token, config),
  );
}

export default fp(supabasePlugin, {
  name: 'supabase',
  fastify: '4.x',
});
