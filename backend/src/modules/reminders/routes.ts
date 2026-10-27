import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { errorEnvelopeSchema, uuidParamSchema } from '../../schemas/common.js';
import { listResponseSchema } from '../../schemas/list.js';
import { requireAuth } from '../../utils/request-context.js';
import {
  getMyPreferences,
  updateMyPreferences,
} from '../profiles/service.js';
import {
  createSubscriptionSchema,
  deliverySchema,
  listDeliveriesQuerySchema,
  listRemindersQuerySchema,
  reminderJobSchema,
  reminderPreferenceSchema,
  subscriptionSchema,
  updateReminderPreferenceSchema,
} from './schema.js';
import {
  createSubscription,
  deleteSubscription,
  listDeliveries,
  listReminders,
} from './service.js';

/**
 * Reminders module: the user's reminder jobs, reminder preferences, push
 * subscriptions, and delivery log. All reads/writes are RLS-scoped.
 *
 * SECURITY: notification_subscriptions.keys is never selected or returned by
 * any handler or response schema here.
 */
export async function remindersRoutes(app: FastifyInstance): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    '/reminders',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['reminders'],
        summary: 'List the authenticated user reminder jobs',
        security: [{ bearerAuth: [] }],
        querystring: listRemindersQuerySchema,
        response: {
          200: listResponseSchema(reminderJobSchema),
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return listReminders(client, request.query);
    },
  );

  typed.get(
    '/reminders/preferences',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['reminders'],
        summary: 'Get the user-default reminder preferences',
        security: [{ bearerAuth: [] }],
        response: {
          200: reminderPreferenceSchema,
          401: errorEnvelopeSchema,
          404: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client, userId } = requireAuth(request);
      return getMyPreferences(client, userId);
    },
  );

  typed.patch(
    '/reminders/preferences',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['reminders'],
        summary: 'Update (upsert) the user-default reminder preferences',
        security: [{ bearerAuth: [] }],
        body: updateReminderPreferenceSchema,
        response: {
          200: reminderPreferenceSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client, userId } = requireAuth(request);
      return updateMyPreferences(client, userId, request.body);
    },
  );

  typed.post(
    '/reminders/subscriptions',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['reminders'],
        summary: 'Register a push/email notification subscription',
        security: [{ bearerAuth: [] }],
        body: createSubscriptionSchema,
        response: {
          201: subscriptionSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request, reply) => {
      const { client, userId } = requireAuth(request);
      const subscription = await createSubscription(client, userId, request.body);
      reply.status(201);
      return subscription;
    },
  );

  typed.delete(
    '/reminders/subscriptions/:id',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['reminders'],
        summary: 'Deactivate a notification subscription',
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
      await deleteSubscription(client, request.params.id);
      return { deleted: true as const };
    },
  );

  typed.get(
    '/reminders/deliveries',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['reminders'],
        summary: 'List the authenticated user notification deliveries',
        security: [{ bearerAuth: [] }],
        querystring: listDeliveriesQuerySchema,
        response: {
          200: listResponseSchema(deliverySchema),
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return listDeliveries(client, request.query);
    },
  );
}
