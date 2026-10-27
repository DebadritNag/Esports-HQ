import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../utils/errors.js';

declare module 'fastify' {
  interface FastifyInstance {
    /**
     * Route guard: verifies the bearer token, attaches `request.user`,
     * `request.accessToken` and `request.userClient`. Throws 401 on failure.
     */
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}

function extractBearer(header: string | undefined): string | undefined {
  if (!header) {
    return undefined;
  }
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1]?.trim() : undefined;
}

/**
 * Auth plugin. Registers an `authenticate` decorator used as a preHandler on
 * protected routes. Reads the Authorization bearer token, validates it via
 * `supabase.auth.getUser`, and sets up the per-request RLS client.
 */
async function authPlugin(app: FastifyInstance): Promise<void> {
  app.decorate('authenticate', async function authenticate(
    request: FastifyRequest,
  ): Promise<void> {
    const token = extractBearer(request.headers.authorization);
    if (!token) {
      throw AppError.unauthorized('Missing or malformed Authorization bearer token.');
    }

    const client = app.userClient(token);
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) {
      throw AppError.unauthorized('Invalid or expired access token.');
    }

    request.user = data.user;
    request.accessToken = token;
    request.userClient = client;
  });
}

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['supabase'],
  fastify: '4.x',
});
