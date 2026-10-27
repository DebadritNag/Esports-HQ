import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { errorEnvelopeSchema, uuidParamSchema } from '../../schemas/common.js';
import { listResponseSchema } from '../../schemas/list.js';
import { requireAuth } from '../../utils/request-context.js';
import {
  createOrganizerSchema,
  listOrganizersQuerySchema,
  organizerFollowSchema,
  organizerSchema,
  updateOrganizerSchema,
} from './schema.js';
import {
  createOrganizer,
  followOrganizer,
  getOrganizer,
  listOrganizers,
  unfollowOrganizer,
  updateOrganizer,
} from './service.js';

/**
 * Organizers module: public, paginated discovery plus authenticated create /
 * update and follow / unfollow. Reads use the request client (anon or user);
 * writes require auth and run under RLS.
 */
export async function organizersRoutes(app: FastifyInstance): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    '/organizers',
    {
      schema: {
        tags: ['organizers'],
        summary: 'List organizers (filter by game/slug/is_verified)',
        querystring: listOrganizersQuerySchema,
        response: {
          200: listResponseSchema(organizerSchema),
          400: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const client = request.userClient ?? app.userClient('');
      return listOrganizers(client, request.query);
    },
  );

  typed.post(
    '/organizers',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['organizers'],
        summary: 'Create an organizer',
        security: [{ bearerAuth: [] }],
        body: createOrganizerSchema,
        response: {
          201: organizerSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request, reply) => {
      const { client, userId } = requireAuth(request);
      const organizer = await createOrganizer(client, userId, request.body);
      reply.status(201);
      return organizer;
    },
  );

  typed.get(
    '/organizers/:id',
    {
      schema: {
        tags: ['organizers'],
        summary: 'Get an organizer by id',
        params: uuidParamSchema,
        response: { 200: organizerSchema, 404: errorEnvelopeSchema },
      },
    },
    async (request) => {
      const client = request.userClient ?? app.userClient('');
      return getOrganizer(client, request.params.id);
    },
  );

  typed.patch(
    '/organizers/:id',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['organizers'],
        summary: 'Update an organizer',
        security: [{ bearerAuth: [] }],
        params: uuidParamSchema,
        body: updateOrganizerSchema,
        response: {
          200: organizerSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
          404: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return updateOrganizer(client, request.params.id, request.body);
    },
  );

  typed.post(
    '/organizers/:id/follow',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['organizers'],
        summary: 'Follow an organizer',
        security: [{ bearerAuth: [] }],
        params: uuidParamSchema,
        response: {
          200: organizerFollowSchema,
          401: errorEnvelopeSchema,
          404: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client, userId } = requireAuth(request);
      return followOrganizer(client, userId, request.params.id);
    },
  );

  typed.delete(
    '/organizers/:id/follow',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['organizers'],
        summary: 'Unfollow an organizer',
        security: [{ bearerAuth: [] }],
        params: uuidParamSchema,
        response: {
          200: organizerFollowSchema,
          401: errorEnvelopeSchema,
          404: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client, userId } = requireAuth(request);
      return unfollowOrganizer(client, userId, request.params.id);
    },
  );
}
