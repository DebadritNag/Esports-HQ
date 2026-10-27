import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { errorEnvelopeSchema } from '../../schemas/common.js';
import { listResponseSchema } from '../../schemas/list.js';
import { requireAuth } from '../../utils/request-context.js';
import {
  createAttachmentSchema,
  createStrategyRoomSchema,
  listQuerySchema,
  strategyAttachmentSchema,
  strategyRoomSchema,
  updateStrategyRoomSchema,
} from './schema.js';
import {
  createAttachment,
  createStrategyRoom,
  deleteStrategyRoom,
  listAttachments,
  listStrategyRooms,
  updateStrategyRoom,
} from './service.js';

const teamIdParam = z.object({ teamId: z.string().uuid() });
const roomIdParam = z.object({ roomId: z.string().uuid() });

/**
 * Strategies module: strategy rooms per team plus attachment metadata. The
 * private `strategy-attachments` bucket stores the bytes under
 * `team_id/room_id/file`; this API only records/reads metadata and never
 * streams the files. RLS (team membership/role) governs access.
 */
export async function strategiesRoutes(app: FastifyInstance): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    '/teams/:teamId/strategy-rooms',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['strategies'],
        summary: 'List strategy rooms for a team',
        security: [{ bearerAuth: [] }],
        params: teamIdParam,
        querystring: listQuerySchema,
        response: { 200: listResponseSchema(strategyRoomSchema), 401: errorEnvelopeSchema },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return listStrategyRooms(client, request.params.teamId, request.query);
    },
  );

  typed.post(
    '/teams/:teamId/strategy-rooms',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['strategies'],
        summary: 'Create a strategy room',
        security: [{ bearerAuth: [] }],
        params: teamIdParam,
        body: createStrategyRoomSchema,
        response: {
          201: strategyRoomSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request, reply) => {
      const { client, userId } = requireAuth(request);
      const room = await createStrategyRoom(client, request.params.teamId, userId, request.body);
      reply.status(201);
      return room;
    },
  );

  typed.patch(
    '/strategy-rooms/:roomId',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['strategies'],
        summary: 'Update a strategy room',
        security: [{ bearerAuth: [] }],
        params: roomIdParam,
        body: updateStrategyRoomSchema,
        response: {
          200: strategyRoomSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
          404: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return updateStrategyRoom(client, request.params.roomId, request.body);
    },
  );

  typed.delete(
    '/strategy-rooms/:roomId',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['strategies'],
        summary: 'Delete a strategy room',
        security: [{ bearerAuth: [] }],
        params: roomIdParam,
        response: {
          200: z.object({ deleted: z.literal(true) }),
          401: errorEnvelopeSchema,
          404: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      await deleteStrategyRoom(client, request.params.roomId);
      return { deleted: true as const };
    },
  );

  typed.get(
    '/strategy-rooms/:roomId/attachments',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['strategies'],
        summary: 'List strategy attachment metadata',
        security: [{ bearerAuth: [] }],
        params: roomIdParam,
        querystring: listQuerySchema,
        response: {
          200: listResponseSchema(strategyAttachmentSchema),
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return listAttachments(client, request.params.roomId, request.query);
    },
  );

  typed.post(
    '/strategy-rooms/:roomId/attachments',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['strategies'],
        summary: 'Register strategy attachment metadata',
        security: [{ bearerAuth: [] }],
        params: roomIdParam,
        body: createAttachmentSchema,
        response: {
          201: strategyAttachmentSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
          404: errorEnvelopeSchema,
        },
      },
    },
    async (request, reply) => {
      const { client, userId } = requireAuth(request);
      const attachment = await createAttachment(
        client,
        request.params.roomId,
        userId,
        request.body,
      );
      reply.status(201);
      return attachment;
    },
  );
}
