import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../context/auth-context';
import { DEMO_ACHIEVEMENTS, DEMO_MATCHES } from '../../lib/mock-data';
import type {
  UserProfile,
  AchievementItem,
  MatchItem,
  ListResponse,
} from '../../types/api';

export function useProfile() {
  const { user, isDemoMode } = useAuth();

  return useQuery({
    queryKey: ['profile', isDemoMode, Boolean(user)],
    queryFn: async () => {
      if (isDemoMode || !user) {
        return {
          id: '893c5d64-2cf9-4ee7-9e79-50ebbc2a22cc',
          username: 'Ajjubhai_HQ',
          display_name: 'Ajay Sharma',
          avatar_path: null,
          timezone: 'Asia/Kolkata',
          created_at: '2026-01-10T00:00:00Z',
          updated_at: '2026-10-25T00:00:00Z',
        } as UserProfile;
      }

      return apiClient<UserProfile>('/me', {
        requiresAuth: true,
      });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { refreshProfile } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<Pick<UserProfile, 'username' | 'display_name' | 'timezone'>>) => {
      return apiClient<UserProfile>('/me', {
        method: 'PATCH',
        body: data,
        requiresAuth: true,
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['profile'], updated);
      refreshProfile();
    },
  });
}

export function useAchievements(params: { scope?: string; team_id?: string; user_id?: string } = {}) {
  const { user, isDemoMode } = useAuth();

  return useQuery({
    queryKey: ['achievements', params, isDemoMode, Boolean(user)],
    queryFn: async () => {
      if (isDemoMode || !user) {
        return {
          data: DEMO_ACHIEVEMENTS,
          meta: {
            total: DEMO_ACHIEVEMENTS.length,
            limit: 20,
            offset: 0,
            count: DEMO_ACHIEVEMENTS.length,
            hasMore: false,
          },
        } as ListResponse<AchievementItem>;
      }

      return apiClient<ListResponse<AchievementItem>>('/achievements', {
        params,
        requiresAuth: true,
      });
    },
  });
}

export function useMatches(params: { event_id?: string; organizer_id?: string; status?: string } = {}) {
  const { user, isDemoMode } = useAuth();

  return useQuery({
    queryKey: ['matches', params, isDemoMode, Boolean(user)],
    queryFn: async () => {
      if (isDemoMode || !user) {
        return {
          data: DEMO_MATCHES,
          meta: {
            total: DEMO_MATCHES.length,
            limit: 20,
            offset: 0,
            count: DEMO_MATCHES.length,
            hasMore: false,
          },
        } as ListResponse<MatchItem>;
      }

      return apiClient<ListResponse<MatchItem>>('/matches', {
        params,
        requiresAuth: true,
      });
    },
  });
}
