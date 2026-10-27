import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { liveness, readiness } from './service.js';

const healthResponseSchema = z.object({
  status: z.literal('ok'),
});

const reminderCountersSchema = z.object({
  due: z.number().int().nonnegative(),
  delivered: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  delayed: z.number().int().nonnegative(),
});

const readinessResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  database: z.object({
    reachable: z.boolean(),
    detail: z.string().optional(),
  }),
  serviceRole: z.object({ available: z.boolean() }),
  reminders: z.union([reminderCountersSchema, z.object({ available: z.literal(false) })]),
  timestamp: z.string(),
});

/**
 * Health routes. Registered both at the API prefix and at the root (via the
 * app factory) so liveness checks can hit a stable `/health` path.
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    '/health',
    {
      schema: {
        tags: ['health'],
        summary: 'Liveness probe',
        response: { 200: healthResponseSchema },
      },
    },
    async () => liveness(),
  );

  typed.get(
    '/ready',
    {
      schema: {
        tags: ['health'],
        summary: 'Readiness probe (DB ping + reminder counters)',
        response: { 200: readinessResponseSchema, 503: readinessResponseSchema },
      },
    },
    async (_request, reply) => {
      const report = await readiness(app);
      reply.status(report.status === 'ok' ? 200 : 503);
      return report;
    },
  );
}
