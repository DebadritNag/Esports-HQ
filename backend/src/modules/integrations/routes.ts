import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { errorEnvelopeSchema, uuidParamSchema } from '../../schemas/common.js';
import { listResponseSchema } from '../../schemas/list.js';
import { requireAuth } from '../../utils/request-context.js';
import {
  createDiscordIntegrationSchema,
  importAnnouncementResponseSchema,
  importAnnouncementSchema,
  importIcalResponseSchema,
  importIcalSchema,
  listIntegrationsQuerySchema,
  sourceConnectionSchema,
} from './schema.js';
import {
  createDiscordIntegration,
  deleteIntegration,
  importAnnouncement,
  importIcal,
  listIntegrations,
} from './service.js';

/**
 * Integrations module: source connections (never exposing Vault secrets), the
 * Discord registration endpoint (501 until Vault is wired), connection delete,
 * and the announcement / ICS import endpoints (which never auto-confirm).
 */
export async function integrationsRoutes(app: FastifyInstance): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    '/integrations',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['integrations'],
        summary: 'List source connections for the caller organizers',
        security: [{ bearerAuth: [] }],
        querystring: listIntegrationsQuerySchema,
        response: {
          200: listResponseSchema(sourceConnectionSchema),
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return listIntegrations(client, request.query);
    },
  );

  typed.post(
    '/integrations/discord',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['integrations'],
        summary: 'Register a Discord integration (501 when Vault is not wired)',
        security: [{ bearerAuth: [] }],
        body: createDiscordIntegrationSchema,
        response: {
          201: sourceConnectionSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
          501: errorEnvelopeSchema,
        },
      },
    },
    async (request, reply) => {
      const { client, userId } = requireAuth(request);
      const connection = await createDiscordIntegration(app, client, userId, request.body);
      reply.status(201);
      return connection;
    },
  );

  typed.delete(
    '/integrations/:id',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['integrations'],
        summary: 'Delete a source connection',
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
      await deleteIntegration(client, request.params.id);
      return { deleted: true as const };
    },
  );

  typed.post(
    '/imports/announcement',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['integrations'],
        summary: 'Parse a pasted announcement (never auto-confirms)',
        security: [{ bearerAuth: [] }],
        body: importAnnouncementSchema,
        response: {
          200: importAnnouncementResponseSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      requireAuth(request);
      return importAnnouncement(request.body);
    },
  );

  typed.post(
    '/imports/ical',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['integrations'],
        summary: 'Parse an ICS payload via the ical adapter',
        security: [{ bearerAuth: [] }],
        body: importIcalSchema,
        response: {
          200: importIcalResponseSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
          422: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      requireAuth(request);
      return importIcal(request.body);
    },
  );
}
