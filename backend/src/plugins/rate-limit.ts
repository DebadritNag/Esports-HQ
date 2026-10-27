import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';
import { ErrorCode } from '../utils/errors.js';

/**
 * Global rate limiting using RATE_LIMIT_MAX / RATE_LIMIT_WINDOW. The limiter's
 * 429 response is shaped into the standard error envelope.
 */
async function rateLimitPlugin(app: FastifyInstance): Promise<void> {
  const { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW } = app.config;

  await app.register(fastifyRateLimit, {
    max: RATE_LIMIT_MAX,
    timeWindow: RATE_LIMIT_WINDOW,
    errorResponseBuilder: (request, context) => ({
      error: {
        code: ErrorCode.RATE_LIMITED,
        message: `Rate limit exceeded. Try again in ${context.after}.`,
        requestId: request.id,
        details: { max: context.max, window: RATE_LIMIT_WINDOW },
      },
    }),
  });
}

export default fp(rateLimitPlugin, {
  name: 'rate-limit',
  fastify: '4.x',
});
