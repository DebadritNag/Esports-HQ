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
  addMemberSchema,
  createAnnouncementSchema,
  createInvitationSchema,
  createTeamSchema,
  listTeamsQuerySchema,
  teamAnnouncementSchema,
  teamInvitationSchema,
  teamMemberSchema,
  teamSchema,
  updateMemberSchema,
  updateTeamSchema,
} from './schema.js';
import {
  addMember,
  createAnnouncement,
  createInvitation,
  createTeam,
  deleteTeam,
  getTeam,
  listAnnouncements,
  listInvitations,
  listMembers,
  listTeams,
  removeMember,
  updateMember,
  updateTeam,
} from './service.js';

const teamIdParam = z.object({ teamId: z.string().uuid() });
const teamMemberParam = z.object({
  teamId: z.string().uuid(),
  memberId: z.string().uuid(),
});

/**
 * Teams module: teams CRUD, members, invitations, and announcements. Every
 * write runs under the request RLS client (the deployed policies rely on
 * is_team_member / has_team_role), so membership and role checks are enforced
 * by the database rather than re-implemented here.
 */
export async function teamsRoutes(app: FastifyInstance): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    '/teams',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['teams'],
        summary: 'List teams',
        security: [{ bearerAuth: [] }],
        querystring: listTeamsQuerySchema,
        response: { 200: listResponseSchema(teamSchema), 401: errorEnvelopeSchema },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return listTeams(client, request.query);
    },
  );

  typed.post(
    '/teams',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['teams'],
        summary: 'Create a team',
        security: [{ bearerAuth: [] }],
        body: createTeamSchema,
        response: { 201: teamSchema, 400: errorEnvelopeSchema, 401: errorEnvelopeSchema },
      },
    },
    async (request, reply) => {
      const { client, userId } = requireAuth(request);
      const team = await createTeam(client, userId, request.body);
      reply.status(201);
      return team;
    },
  );

  typed.get(
    '/teams/:id',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['teams'],
        summary: 'Get a team by id',
        security: [{ bearerAuth: [] }],
        params: uuidParamSchema,
        response: { 200: teamSchema, 401: errorEnvelopeSchema, 404: errorEnvelopeSchema },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return getTeam(client, request.params.id);
    },
  );

  typed.patch(
    '/teams/:id',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['teams'],
        summary: 'Update a team',
        security: [{ bearerAuth: [] }],
        params: uuidParamSchema,
        body: updateTeamSchema,
        response: {
          200: teamSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
          404: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return updateTeam(client, request.params.id, request.body);
    },
  );

  typed.delete(
    '/teams/:id',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['teams'],
        summary: 'Delete a team',
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
      await deleteTeam(client, request.params.id);
      return { deleted: true as const };
    },
  );

  // Members -----------------------------------------------------------------
  typed.get(
    '/teams/:teamId/members',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['teams'],
        summary: 'List team members',
        security: [{ bearerAuth: [] }],
        params: teamIdParam,
        querystring: paginationQuerySchema,
        response: { 200: listResponseSchema(teamMemberSchema), 401: errorEnvelopeSchema },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return listMembers(client, request.params.teamId, request.query);
    },
  );

  typed.post(
    '/teams/:teamId/members',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['teams'],
        summary: 'Add a team member',
        security: [{ bearerAuth: [] }],
        params: teamIdParam,
        body: addMemberSchema,
        response: {
          201: teamMemberSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request, reply) => {
      const { client } = requireAuth(request);
      const member = await addMember(client, request.params.teamId, request.body);
      reply.status(201);
      return member;
    },
  );

  typed.patch(
    '/teams/:teamId/members/:memberId',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['teams'],
        summary: 'Update a team member',
        security: [{ bearerAuth: [] }],
        params: teamMemberParam,
        body: updateMemberSchema,
        response: {
          200: teamMemberSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
          404: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return updateMember(client, request.params.teamId, request.params.memberId, request.body);
    },
  );

  typed.delete(
    '/teams/:teamId/members/:memberId',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['teams'],
        summary: 'Remove a team member',
        security: [{ bearerAuth: [] }],
        params: teamMemberParam,
        response: {
          200: z.object({ removed: z.literal(true) }),
          401: errorEnvelopeSchema,
          404: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      await removeMember(client, request.params.teamId, request.params.memberId);
      return { removed: true as const };
    },
  );

  // Invitations -------------------------------------------------------------
  typed.get(
    '/teams/:teamId/invitations',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['teams'],
        summary: 'List team invitations',
        security: [{ bearerAuth: [] }],
        params: teamIdParam,
        querystring: paginationQuerySchema,
        response: { 200: listResponseSchema(teamInvitationSchema), 401: errorEnvelopeSchema },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return listInvitations(client, request.params.teamId, request.query);
    },
  );

  typed.post(
    '/teams/:teamId/invitations',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['teams'],
        summary: 'Create a team invitation',
        security: [{ bearerAuth: [] }],
        params: teamIdParam,
        body: createInvitationSchema,
        response: {
          201: teamInvitationSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request, reply) => {
      const { client, userId } = requireAuth(request);
      const invitation = await createInvitation(
        client,
        request.params.teamId,
        userId,
        request.body,
      );
      reply.status(201);
      return invitation;
    },
  );

  // Announcements -----------------------------------------------------------
  typed.get(
    '/teams/:teamId/announcements',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['teams'],
        summary: 'List team announcements',
        security: [{ bearerAuth: [] }],
        params: teamIdParam,
        querystring: paginationQuerySchema,
        response: { 200: listResponseSchema(teamAnnouncementSchema), 401: errorEnvelopeSchema },
      },
    },
    async (request) => {
      const { client } = requireAuth(request);
      return listAnnouncements(client, request.params.teamId, request.query);
    },
  );

  typed.post(
    '/teams/:teamId/announcements',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['teams'],
        summary: 'Create a team announcement',
        security: [{ bearerAuth: [] }],
        params: teamIdParam,
        body: createAnnouncementSchema,
        response: {
          201: teamAnnouncementSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request, reply) => {
      const { client, userId } = requireAuth(request);
      const announcement = await createAnnouncement(
        client,
        request.params.teamId,
        userId,
        request.body,
      );
      reply.status(201);
      return announcement;
    },
  );
}
