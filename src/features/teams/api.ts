import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../context/auth-context';
import { DEMO_TEAMS, DEMO_TEAM_MEMBERS } from '../../lib/mock-data';
import type {
  Team,
  TeamMember,
  TeamAnnouncement,
  ListResponse,
  TeamRole,
} from '../../types/api';

export function useTeams() {
  const { user, isDemoMode } = useAuth();

  return useQuery({
    queryKey: ['teams', isDemoMode, Boolean(user)],
    queryFn: async () => {
      if (isDemoMode || !user) {
        return {
          data: DEMO_TEAMS,
          meta: {
            total: DEMO_TEAMS.length,
            limit: 20,
            offset: 0,
            count: DEMO_TEAMS.length,
            hasMore: false,
          },
        } as ListResponse<Team>;
      }

      return apiClient<ListResponse<Team>>('/teams', {
        requiresAuth: true,
      });
    },
  });
}

export function useTeam(id: string | undefined) {
  const { user, isDemoMode } = useAuth();

  return useQuery({
    queryKey: ['team', id, isDemoMode, Boolean(user)],
    queryFn: async () => {
      if (!id) throw new Error('Missing team ID');

      if (isDemoMode || !user) {
        const team = DEMO_TEAMS.find((t) => t.id === id);
        if (team) return team;
        return DEMO_TEAMS[0];
      }

      return apiClient<Team>(`/teams/${id}`, {
        requiresAuth: true,
      });
    },
    enabled: Boolean(id),
  });
}

export function useTeamMembers(teamId: string | undefined) {
  const { user, isDemoMode } = useAuth();

  return useQuery({
    queryKey: ['team-members', teamId, isDemoMode, Boolean(user)],
    queryFn: async () => {
      if (!teamId) return [];

      if (isDemoMode || !user) {
        return DEMO_TEAM_MEMBERS.filter((m) => m.team_id === teamId || teamId === DEMO_TEAMS[0].id);
      }

      const res = await apiClient<ListResponse<TeamMember>>(`/teams/${teamId}/members`, {
        requiresAuth: true,
      });
      return res.data;
    },
    enabled: Boolean(teamId),
  });
}

export function useTeamAnnouncements(teamId: string | undefined) {
  const { user, isDemoMode } = useAuth();

  return useQuery({
    queryKey: ['team-announcements', teamId, isDemoMode, Boolean(user)],
    queryFn: async () => {
      if (!teamId) return [];

      if (isDemoMode || !user) {
        return [
          {
            id: 'ann-1',
            team_id: teamId,
            author_id: '893c5d64-2cf9-4ee7-9e79-50ebbc2a22cc',
            title: 'Scrims Strategy & Rotation Protocol Tonight',
            body: 'Drop: Factory on Bermuda. Priority is high-ground control. Check in at 19:30 sharp.',
            created_at: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
            updated_at: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
          },
        ] as TeamAnnouncement[];
      }

      const res = await apiClient<ListResponse<TeamAnnouncement>>(`/teams/${teamId}/announcements`, {
        requiresAuth: true,
      });
      return res.data;
    },
    enabled: Boolean(teamId),
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; slug: string; tag?: string; bio?: string }) => {
      return apiClient<Team>('/teams', {
        method: 'POST',
        body: data,
        requiresAuth: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, title, body }: { teamId: string; title: string; body: string }) => {
      return apiClient<TeamAnnouncement>(`/teams/${teamId}/announcements`, {
        method: 'POST',
        body: { title, body },
        requiresAuth: true,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team-announcements', variables.teamId] });
    },
  });
}

export function useAddMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      userId,
      role = 'member',
      jerseyNumber,
    }: {
      teamId: string;
      userId: string;
      role?: TeamRole;
      jerseyNumber?: number;
    }) => {
      return apiClient<TeamMember>(`/teams/${teamId}/members`, {
        method: 'POST',
        body: {
          user_id: userId,
          role,
          jersey_number: jerseyNumber,
        },
        requiresAuth: true,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team-members', variables.teamId] });
    },
  });
}
