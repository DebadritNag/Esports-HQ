import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { errorEnvelopeSchema, uuidParamSchema } from '../../schemas/common.js';
import { listResponseSchema } from '../../schemas/list.js';
import { requireAuth } from '../../utils/request-context.js';
import {
  createEventSchema,
  eventSchema,
  listEventsQuerySchema,
  trackEventSchema,
  trackingSchema,
  updateEventSchema,
} from './schema.js';
import {
  cancelEvent,
  confirmEvent,
  createEvent,
  getEvent,
  listEvents,
  trackEvent,
  untrackEvent,
  updateEvent,
} from './service.js';

/**
 * Events module (the Radar): filtered, paginated discovery plus authenticated
 * create/update and the cancel / confirm / track lifecycle actions. Reads use
 * the request client; writes require auth. Confirm and track trigger the
 * service-role reminder regeneration wrappers.
 */
export async function eventsRoutes(app: FastifyInstance): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    '/events',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['events'],
        summary: 'List events with filters (the Radar)',
        security: [{ bearerAuth: [] }],
        querystring: listEventsQuerySchema,
        response: {
          200: listResponseSchema(eventSchema),
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client, userId } = requireAuth(request);
      return listEvents(client, request.query, userId);
    },
  );

  typed.post(
    '/events',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['events'],
        summary: 'Create an event',
        security: [{ bearerAuth: [] }],
        body: createEventSchema,
        response: {
          201: eventSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request, reply) => {
      const { client, userId } = requireAuth(request);
      const event = await createEvent(client, userId, request.body);
      reply.status(201);
      return event;
    },
  );

  typed.get(
    '/events/:id',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['events'],
        summary: 'Get an event by id',
        security: [{ bearerAuth: [] }],
        params: uuidParamSchema,
        response: {
          200: eventSchema,
          401: errorEnvelopeSchema,
          404: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return getEvent(client, request.params.id);
    },
  );

  typed.patch(
    '/events/:id',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['events'],
        summary: 'Update an event',
        security: [{ bearerAuth: [] }],
        params: uuidParamSchema,
        body: updateEventSchema,
        response: {
          200: eventSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
          404: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return updateEvent(client, request.params.id, request.body);
    },
  );

  typed.post(
    '/events/:id/cancel',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['events'],
        summary: 'Cancel an event',
        security: [{ bearerAuth: [] }],
        params: uuidParamSchema,
        response: {
          200: eventSchema,
          401: errorEnvelopeSchema,
          404: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return cancelEvent(client, request.params.id);
    },
  );

  typed.post(
    '/events/:id/confirm',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['events'],
        summary: 'Confirm an event (regenerates reminders)',
        security: [{ bearerAuth: [] }],
        params: uuidParamSchema,
        response: {
          200: eventSchema,
          401: errorEnvelopeSchema,
          404: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return confirmEvent(app, client, request.params.id);
    },
  );

  typed.post(
    '/events/:id/track',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['events'],
        summary: 'Track an event (regenerates reminder jobs)',
        security: [{ bearerAuth: [] }],
        params: uuidParamSchema,
        body: trackEventSchema,
        response: {
          200: trackingSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client, userId } = requireAuth(request);
      return trackEvent(app, client, userId, request.params.id, request.body);
    },
  );

  typed.delete(
    '/events/:id/track',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['events'],
        summary: 'Untrack an event (regenerates reminder jobs)',
        security: [{ bearerAuth: [] }],
        params: uuidParamSchema,
        response: {
          200: z.object({ tracked: z.literal(false) }),
          401: errorEnvelopeSchema,
          404: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client, userId } = requireAuth(request);
      await untrackEvent(app, client, userId, request.params.id);
      return { tracked: false as const };
    },
  );
}
