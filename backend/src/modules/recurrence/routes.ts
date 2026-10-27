import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { errorEnvelopeSchema, uuidParamSchema } from '../../schemas/common.js';
import { listResponseSchema } from '../../schemas/list.js';
import { requireAuth } from '../../utils/request-context.js';
import {
  createScheduleSchema,
  listSchedulesQuerySchema,
  recurrenceRuleSchema,
  updateScheduleSchema,
} from './schema.js';
import {
  createSchedule,
  deleteSchedule,
  listSchedules,
  updateSchedule,
} from './service.js';

/**
 * Recurrence module: organizer schedules (recurrence_rules). Writes run under
 * RLS via the request client; each create/update/delete then triggers the
 * service-role reminder-regeneration wrapper for the affected events.
 */
export async function recurrenceRoutes(app: FastifyInstance): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    '/organizers/:id/schedules',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['recurrence'],
        summary: 'List an organizer recurrence schedules',
        security: [{ bearerAuth: [] }],
        params: uuidParamSchema,
        querystring: listSchedulesQuerySchema,
        response: {
          200: listResponseSchema(recurrenceRuleSchema),
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return listSchedules(client, request.params.id, request.query);
    },
  );

  typed.post(
    '/organizers/:id/schedules',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['recurrence'],
        summary: 'Create a recurrence schedule (regenerates event reminders)',
        security: [{ bearerAuth: [] }],
        params: uuidParamSchema,
        body: createScheduleSchema,
        response: {
          201: recurrenceRuleSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request, reply) => {
      const { client } = requireAuth(request);
      const rule = await createSchedule(app, client, request.params.id, request.body);
      reply.status(201);
      return rule;
    },
  );

  typed.patch(
    '/schedules/:id',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['recurrence'],
        summary: 'Update a recurrence schedule (regenerates event reminders)',
        security: [{ bearerAuth: [] }],
        params: uuidParamSchema,
        body: updateScheduleSchema,
        response: {
          200: recurrenceRuleSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
          404: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return updateSchedule(app, client, request.params.id, request.body);
    },
  );

  typed.delete(
    '/schedules/:id',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['recurrence'],
        summary: 'Delete a recurrence schedule (regenerates event reminders)',
        security: [{ bearerAuth: [] }],
        params: uuidParamSchema,
        response: {
          200: z.object({ deleted: z.literal(true) }),
          401: errorEnvelopeSchema,
          404: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      await deleteSchedule(app, client, request.params.id);
      return { deleted: true as const };
    },
  );
}
