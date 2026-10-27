import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { errorEnvelopeSchema, uuidParamSchema } from '../../schemas/common.js';
import { listResponseSchema } from '../../schemas/list.js';
import { requireAuth } from '../../utils/request-context.js';
import {
  achievementEvidenceSchema,
  achievementSchema,
  createAchievementSchema,
  createEvidenceSchema,
  listAchievementsQuerySchema,
  listQuerySchema,
  updateAchievementSchema,
} from './schema.js';
import {
  createAchievement,
  createEvidence,
  getAchievement,
  listAchievements,
  listEvidence,
  updateAchievement,
} from './service.js';

const achievementIdParam = z.object({ achievementId: z.string().uuid() });

/**
 * Achievements module: personal/team achievements plus evidence metadata. The
 * private `achievement-evidence` bucket stores bytes under `achievement_id/file`;
 * this API handles metadata only. RLS governs who may read/write.
 */
export async function achievementsRoutes(app: FastifyInstance): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    '/achievements',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['achievements'],
        summary: 'List achievements',
        security: [{ bearerAuth: [] }],
        querystring: listAchievementsQuerySchema,
        response: { 200: listResponseSchema(achievementSchema), 401: errorEnvelopeSchema },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return listAchievements(client, request.query);
    },
  );

  typed.post(
    '/achievements',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['achievements'],
        summary: 'Create an achievement',
        security: [{ bearerAuth: [] }],
        body: createAchievementSchema,
        response: {
          201: achievementSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request, reply) => {
      const { client, userId } = requireAuth(request);
      const achievement = await createAchievement(client, userId, request.body);
      reply.status(201);
      return achievement;
    },
  );

  typed.get(
    '/achievements/:id',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['achievements'],
        summary: 'Get an achievement by id',
        security: [{ bearerAuth: [] }],
        params: uuidParamSchema,
        response: {
          200: achievementSchema,
          401: errorEnvelopeSchema,
          404: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return getAchievement(client, request.params.id);
    },
  );

  typed.patch(
    '/achievements/:id',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['achievements'],
        summary: 'Update an achievement',
        security: [{ bearerAuth: [] }],
        params: uuidParamSchema,
        body: updateAchievementSchema,
        response: {
          200: achievementSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
          404: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return updateAchievement(client, request.params.id, request.body);
    },
  );

  typed.get(
    '/achievements/:achievementId/evidence',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['achievements'],
        summary: 'List achievement evidence metadata',
        security: [{ bearerAuth: [] }],
        params: achievementIdParam,
        querystring: listQuerySchema,
        response: {
          200: listResponseSchema(achievementEvidenceSchema),
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return listEvidence(client, request.params.achievementId, request.query);
    },
  );

  typed.post(
    '/achievements/:achievementId/evidence',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['achievements'],
        summary: 'Register achievement evidence metadata',
        security: [{ bearerAuth: [] }],
        params: achievementIdParam,
        body: createEvidenceSchema,
        response: {
          201: achievementEvidenceSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request, reply) => {
      const { client, userId } = requireAuth(request);
      const evidence = await createEvidence(
        client,
        request.params.achievementId,
        userId,
        request.body,
      );
      reply.status(201);
      return evidence;
    },
  );
}
