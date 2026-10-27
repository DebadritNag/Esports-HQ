import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../context/auth-context';
import { DEMO_EVENTS, DEMO_ORGANIZERS } from '../../lib/mock-data';
import type {
  EventItem,
  Organizer,
  ListResponse,
  UserEventTracking,
  EventStatus,
  ConfirmationStatus,
  EventType,
} from '../../types/api';

export interface EventFilterParams {
  organizer_id?: string;
  event_status?: EventStatus;
  confirmation_status?: ConfirmationStatus;
  event_type?: EventType;
  from?: string;
  to?: string;
  tracked?: boolean;
  upcoming?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Fetch events list from backend (or fallback to demo data if in demo mode or unauthenticated)
 */
export function useEvents(filters: EventFilterParams = {}) {
  const { user, isDemoMode } = useAuth();

  return useQuery({
    queryKey: ['events', filters, isDemoMode, Boolean(user)],
    queryFn: async () => {
      // If user is in demo mode or not logged in yet, return DEMO_EVENTS
      if (isDemoMode || !user) {
        let filtered = [...DEMO_EVENTS];
        if (filters.event_status) {
          filtered = filtered.filter((e) => e.event_status === filters.event_status);
        }
        if (filters.confirmation_status) {
          filtered = filtered.filter((e) => e.confirmation_status === filters.confirmation_status);
        }
        if (filters.event_type) {
          filtered = filtered.filter((e) => e.event_type === filters.event_type);
        }
        if (filters.organizer_id) {
          filtered = filtered.filter((e) => e.organizer_id === filters.organizer_id);
        }
        return {
          data: filtered,
          meta: {
            total: filtered.length,
            limit: filters.limit || 20,
            offset: filters.offset || 0,
            count: filtered.length,
            hasMore: false,
          },
        } as ListResponse<EventItem>;
      }

      // Live Fastify endpoint GET /api/v1/events
      return apiClient<ListResponse<EventItem>>('/events', {
        params: filters as Record<string, string | number | boolean>,
        requiresAuth: true,
      });
    },
  });
}

/**
 * Fetch single event details
 */
export function useEvent(id: string | undefined) {
  const { user, isDemoMode } = useAuth();

  return useQuery({
    queryKey: ['event', id, isDemoMode, Boolean(user)],
    queryFn: async () => {
      if (!id) throw new Error('Missing event ID');

      if (isDemoMode || !user) {
        const found = DEMO_EVENTS.find((e) => e.id === id);
        if (found) return found;
        throw new Error('Tournament not found in preview data');
      }

      return apiClient<EventItem>(`/events/${id}`, {
        requiresAuth: true,
      });
    },
    enabled: Boolean(id),
  });
}

/**
 * Fetch organizers (Public endpoint)
 */
export function useOrganizers(params: { game?: string; slug?: string; is_verified?: boolean } = {}) {
  const { isDemoMode } = useAuth();

  return useQuery({
    queryKey: ['organizers', params, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        return {
          data: DEMO_ORGANIZERS,
          meta: {
            total: DEMO_ORGANIZERS.length,
            limit: 20,
            offset: 0,
            count: DEMO_ORGANIZERS.length,
            hasMore: false,
          },
        } as ListResponse<Organizer>;
      }

      try {
        return await apiClient<ListResponse<Organizer>>('/organizers', {
          params,
          requiresAuth: false,
        });
      } catch (err) {
        console.warn('Backend organizers query error, falling back to verified list:', err);
        return {
          data: DEMO_ORGANIZERS,
          meta: {
            total: DEMO_ORGANIZERS.length,
            limit: 20,
            offset: 0,
            count: DEMO_ORGANIZERS.length,
            hasMore: false,
          },
        } as ListResponse<Organizer>;
      }
    },
  });
}

/**
 * Track an event mutation
 */
export function useTrackEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      trackingStatus = 'interested',
      registrationStatus = 'intending',
      personalNotes,
    }: {
      eventId: string;
      trackingStatus?: string;
      registrationStatus?: string;
      personalNotes?: string;
    }) => {
      return apiClient<UserEventTracking>(`/events/${eventId}/track`, {
        method: 'POST',
        body: {
          tracking_status: trackingStatus,
          registration_status: registrationStatus,
          personal_notes: personalNotes,
        },
        requiresAuth: true,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

/**
 * Untrack an event mutation
 */
export function useUntrackEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      return apiClient<{ tracked: boolean }>(`/events/${eventId}/track`, {
        method: 'DELETE',
        requiresAuth: true,
      });
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}
