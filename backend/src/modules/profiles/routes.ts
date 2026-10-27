import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { errorEnvelopeSchema } from '../../schemas/common.js';
import { requireAuth } from '../../utils/request-context.js';
import {
  profileSchema,
  reminderPreferenceSchema,
  updateProfileSchema,
  updateReminderPreferenceSchema,
} from './schema.js';
import {
  getMyPreferences,
  getMyProfile,
  updateMyPreferences,
  updateMyProfile,
} from './service.js';

/**
 * Profiles module: the authenticated user's own profile (`/me`) and their
 * user-default reminder preferences (`/me/preferences`). All reads/writes use
 * the per-request RLS client so a user can only touch their own rows.
 */
export async function profilesRoutes(app: FastifyInstance): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    '/me',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['profiles'],
        summary: 'Get the authenticated user profile',
        security: [{ bearerAuth: [] }],
        response: { 200: profileSchema, 401: errorEnvelopeSchema, 404: errorEnvelopeSchema },
      },
    },
    async (request) => {
      const { client, userId } = requireAuth(request);
      return getMyProfile(client, userId);
    },
  );

  typed.patch(
    '/me',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['profiles'],
        summary: 'Update the authenticated user profile',
        security: [{ bearerAuth: [] }],
        body: updateProfileSchema,
        response: { 200: profileSchema, 400: errorEnvelopeSchema, 401: errorEnvelopeSchema },
      },
    },
    async (request) => {
      const { client, userId } = requireAuth(request);
      return updateMyProfile(client, userId, request.body);
    },
  );

  typed.get(
    '/me/preferences',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['profiles'],
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
    '/me/preferences',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['profiles'],
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
}
