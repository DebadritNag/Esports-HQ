import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  errorEnvelopeSchema,
  paginationQuerySchema,
  uuidParamSchema,
} from '../../schemas/common.js';
import { listResponseSchema } from '../../schemas/list.js';
import { requireAuth } from '../../utils/request-context.js';
import {
  createMatchSchema,
  createParticipantSchema,
  createStatisticSchema,
  listMatchesQuerySchema,
  matchParticipantSchema,
  matchSchema,
  matchStatisticSchema,
  updateMatchSchema,
} from './schema.js';
import {
  createMatch,
  createParticipant,
  createStatistic,
  getMatch,
  listMatches,
  listParticipants,
  listStatistics,
  updateMatch,
} from './service.js';

const matchIdParam = z.object({ matchId: z.string().uuid() });

/**
 * Statistics module: matches, participants, and per-participant statistics
 * (kills/knocks/damage/placement_points/survival_seconds/extra). Reads and
 * writes are RLS-scoped — the deployed policies restrict writes to authorized
 * team roles.
 */
export async function statisticsRoutes(app: FastifyInstance): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    '/matches',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['statistics'],
        summary: 'List matches',
        security: [{ bearerAuth: [] }],
        querystring: listMatchesQuerySchema,
        response: { 200: listResponseSchema(matchSchema), 401: errorEnvelopeSchema },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return listMatches(client, request.query);
    },
  );

  typed.post(
    '/matches',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['statistics'],
        summary: 'Create a match',
        security: [{ bearerAuth: [] }],
        body: createMatchSchema,
        response: { 201: matchSchema, 400: errorEnvelopeSchema, 401: errorEnvelopeSchema },
      },
    },
    async (request, reply) => {
      const { client } = requireAuth(request);
      const match = await createMatch(client, request.body);
      reply.status(201);
      return match;
    },
  );

  typed.get(
    '/matches/:id',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['statistics'],
        summary: 'Get a match by id',
        security: [{ bearerAuth: [] }],
        params: uuidParamSchema,
        response: { 200: matchSchema, 401: errorEnvelopeSchema, 404: errorEnvelopeSchema },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return getMatch(client, request.params.id);
    },
  );

  typed.patch(
    '/matches/:id',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['statistics'],
        summary: 'Update a match',
        security: [{ bearerAuth: [] }],
        params: uuidParamSchema,
        body: updateMatchSchema,
        response: {
          200: matchSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
          404: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return updateMatch(client, request.params.id, request.body);
    },
  );

  typed.get(
    '/matches/:matchId/participants',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['statistics'],
        summary: 'List match participants',
        security: [{ bearerAuth: [] }],
        params: matchIdParam,
        querystring: paginationQuerySchema,
        response: { 200: listResponseSchema(matchParticipantSchema), 401: errorEnvelopeSchema },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return listParticipants(client, request.params.matchId, request.query);
    },
  );

  typed.post(
    '/matches/:matchId/participants',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['statistics'],
        summary: 'Add a match participant',
        security: [{ bearerAuth: [] }],
        params: matchIdParam,
        body: createParticipantSchema,
        response: {
          201: matchParticipantSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request, reply) => {
      const { client } = requireAuth(request);
      const participant = await createParticipant(client, request.params.matchId, request.body);
      reply.status(201);
      return participant;
    },
  );

  typed.get(
    '/matches/:matchId/statistics',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['statistics'],
        summary: 'List match statistics',
        security: [{ bearerAuth: [] }],
        params: matchIdParam,
        querystring: paginationQuerySchema,
        response: { 200: listResponseSchema(matchStatisticSchema), 401: errorEnvelopeSchema },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return listStatistics(client, request.params.matchId, request.query);
    },
  );

  typed.post(
    '/matches/:matchId/statistics',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['statistics'],
        summary: 'Record a match statistic',
        security: [{ bearerAuth: [] }],
        params: matchIdParam,
        body: createStatisticSchema,
        response: {
          201: matchStatisticSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request, reply) => {
      const { client } = requireAuth(request);
      const statistic = await createStatistic(client, request.params.matchId, request.body);
      reply.status(201);
      return statistic;
    },
  );
}
