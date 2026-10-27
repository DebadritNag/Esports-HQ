import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { getConfig, type AppConfig } from './config/index.js';
import supabasePlugin from './plugins/supabase.js';
import authPlugin from './plugins/auth.js';
import errorHandlerPlugin from './plugins/error-handler.js';
import swaggerPlugin from './plugins/swagger.js';
import rateLimitPlugin from './plugins/rate-limit.js';
import { healthRoutes } from './modules/health/routes.js';
import { profilesRoutes } from './modules/profiles/routes.js';
import { organizersRoutes } from './modules/organizers/routes.js';
import { recurrenceRoutes } from './modules/recurrence/routes.js';
import { eventsRoutes } from './modules/events/routes.js';
import { remindersRoutes } from './modules/reminders/routes.js';
import { integrationsRoutes } from './modules/integrations/routes.js';
import { teamsRoutes } from './modules/teams/routes.js';
import { strategiesRoutes } from './modules/strategies/routes.js';
import { statisticsRoutes } from './modules/statistics/routes.js';
import { achievementsRoutes } from './modules/achievements/routes.js';

export interface BuildAppOptions {
  config?: AppConfig;
}

/**
 * Construct and wire the Fastify application. Registers core plugins (supabase,
 * auth, error-handler, swagger, rate-limit, cors), the Zod type provider, then
 * module routes. Health routes are mounted at the root and under /api/v1.
 */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? getConfig();

  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      // Never log Authorization headers or cookies.
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
    genReqId: () => cryptoRandomId(),
    disableRequestLogging: config.NODE_ENV === 'test',
  });

  // Zod type provider for request validation + response serialization.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Core plugins. supabase must come first (others depend on app.config).
  await app.register(supabasePlugin, { config });
  await app.register(errorHandlerPlugin);
  await app.register(authPlugin);
  await app.register(swaggerPlugin);
  await app.register(rateLimitPlugin);
  await app.register(fastifyCors, { origin: true });

  // Root-level health for simple liveness checks.
  await app.register(healthRoutes);

  // Versioned API surface. Module routes register inside this encapsulated
  // plugin so they all share the /api/v1 prefix.
  await app.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(profilesRoutes);
      await api.register(organizersRoutes);
      await api.register(recurrenceRoutes);
      await api.register(eventsRoutes);
      await api.register(remindersRoutes);
      await api.register(integrationsRoutes);
      await api.register(teamsRoutes);
      await api.register(strategiesRoutes);
      await api.register(statisticsRoutes);
      await api.register(achievementsRoutes);
    },
    { prefix: '/api/v1' },
  );

  await app.ready();
  return app;
}

function cryptoRandomId(): string {
  // Node 22 exposes crypto.randomUUID globally.
  return globalThis.crypto.randomUUID();
}
