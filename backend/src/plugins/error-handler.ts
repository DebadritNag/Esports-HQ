import fp from 'fastify-plugin';
import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { serializeError } from '../utils/api-error.js';
import { ErrorCode } from '../utils/errors.js';

/**
 * Pull a ZodError out of a Fastify validation error, if present. In
 * fastify-type-provider-zod v2 the validator returns the raw ZodError, which
 * Fastify attaches to `error.validation`.
 */
function extractZodError(error: unknown): ZodError | undefined {
  if (error instanceof ZodError) {
    return error;
  }
  if (typeof error === 'object' && error !== null) {
    const candidate = error as FastifyError & { validation?: unknown };
    if (candidate.validation instanceof ZodError) {
      return candidate.validation;
    }
  }
  return undefined;
}

/**
 * Global error handler + not-found handler producing the standard envelope
 * `{ error: { code, message, requestId, details? } }`. Stacks and SQL are
 * hidden when NODE_ENV=production. `request.id` is surfaced as `requestId`.
 */
async function errorHandlerPlugin(app: FastifyInstance): Promise<void> {
  const hideInternal = app.config.NODE_ENV === 'production';

  app.setErrorHandler((error: unknown, request: FastifyRequest, reply: FastifyReply) => {
    const requestId = request.id;

    const zodError = extractZodError(error);
    const normalized: unknown = zodError ?? error;
    const { statusCode, body } = serializeError(normalized, { requestId, hideInternal });

    if (statusCode >= 500) {
      request.log.error({ err: error, requestId }, 'request failed');
    } else {
      request.log.info({ requestId, statusCode, code: body.error.code }, 'request error');
    }

    reply.status(statusCode).send(body);
  });

  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    reply.status(404).send({
      error: {
        code: ErrorCode.NOT_FOUND,
        message: `Route ${request.method} ${request.url} not found`,
        requestId: request.id,
      },
    });
  });
}

export default fp(errorHandlerPlugin, {
  name: 'error-handler',
  dependencies: ['supabase'],
  fastify: '4.x',
});
