import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../context/auth-context';
import { DEMO_REMINDERS } from '../../lib/mock-data';
import type {
  ReminderJob,
  ReminderPreference,
  ListResponse,
  NotificationChannel,
} from '../../types/api';

export function useReminders(params: { status?: string; event_id?: string; limit?: number; offset?: number } = {}) {
  const { user, isDemoMode } = useAuth();

  return useQuery({
    queryKey: ['reminders', params, isDemoMode, Boolean(user)],
    queryFn: async () => {
      if (isDemoMode || !user) {
        return {
          data: DEMO_REMINDERS,
          meta: {
            total: DEMO_REMINDERS.length,
            limit: 20,
            offset: 0,
            count: DEMO_REMINDERS.length,
            hasMore: false,
          },
        } as ListResponse<ReminderJob>;
      }

      return apiClient<ListResponse<ReminderJob>>('/reminders', {
        params,
        requiresAuth: true,
      });
    },
  });
}

export function useReminderPreferences() {
  const { user, isDemoMode } = useAuth();

  return useQuery({
    queryKey: ['reminder-preferences', isDemoMode, Boolean(user)],
    queryFn: async () => {
      if (isDemoMode || !user) {
        return {
          id: 'pref-1',
          user_id: '893c5d64-2cf9-4ee7-9e79-50ebbc2a22cc',
          event_id: null,
          organizer_id: null,
          registration_reminders_enabled: true,
          registration_lead_minutes: 30,
          check_in_reminders_enabled: true,
          check_in_lead_minutes: 15,
          stream_reminders_enabled: true,
          stream_lead_minutes: 15,
          match_reminders_enabled: true,
          match_lead_minutes: 30,
          created_at: '2026-10-25T00:00:00Z',
          updated_at: '2026-10-25T00:00:00Z',
        } as ReminderPreference;
      }

      return apiClient<ReminderPreference>('/me/preferences', {
        requiresAuth: true,
      });
    },
  });
}

export function useUpdateReminderPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prefs: Partial<ReminderPreference>) => {
      return apiClient<ReminderPreference>('/me/preferences', {
        method: 'PATCH',
        body: prefs,
        requiresAuth: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder-preferences'] });
    },
  });
}

export function useRegisterSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channel,
      endpoint,
      keys,
      userAgent,
    }: {
      channel: NotificationChannel;
      endpoint: string;
      keys: Record<string, string>;
      userAgent?: string;
    }) => {
      return apiClient('/reminders/subscriptions', {
        method: 'POST',
        body: {
          channel,
          endpoint,
          keys,
          user_agent: userAgent || navigator.userAgent,
        },
        requiresAuth: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}
