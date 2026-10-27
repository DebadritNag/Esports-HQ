import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../context/auth-context';
import type { StrategyRoom, StrategyAttachment, ListResponse } from '../../types/api';

export function useStrategyRooms(teamId: string | undefined) {
  const { user, isDemoMode } = useAuth();

  return useQuery({
    queryKey: ['strategy-rooms', teamId, isDemoMode, Boolean(user)],
    queryFn: async () => {
      if (!teamId) return [];

      if (isDemoMode || !user) {
        return [
          {
            id: 'room-1',
            team_id: teamId,
            name: 'Bermuda Drop Rotations & Loot Paths',
            description: 'Factory early push vs Mill defense depending on airplane trajectory.',
            content: {
              tactics: [
                'Primary drop: Factory roofs and ground compound',
                'Fallback drop: Clock tower edge houses',
                'First rotation: Cut off Mars Electric flankers by 3:00',
              ],
              updatedBy: 'Ajjubhai_HQ',
            },
            created_by: '893c5d64-2cf9-4ee7-9e79-50ebbc2a22cc',
            created_at: '2026-10-24T12:00:00Z',
            updated_at: '2026-10-27T10:00:00Z',
          },
          {
            id: 'room-2',
            team_id: teamId,
            name: 'Purgatory End-Game High Ground Protocol',
            description: 'Zone 4 and Zone 5 positioning around Brasilia and Moathouse.',
            content: {
              tactics: [
                'Do not cross Moathouse water late',
                'Sniper holds bridge with AWM / Kar98',
                'Two shotgun pushers lead urban clearing',
              ],
            },
            created_by: '893c5d64-2cf9-4ee7-9e79-50ebbc2a22cc',
            created_at: '2026-10-25T14:00:00Z',
            updated_at: '2026-10-26T18:00:00Z',
          },
        ] as StrategyRoom[];
      }

      const res = await apiClient<ListResponse<StrategyRoom>>(`/teams/${teamId}/strategy-rooms`, {
        requiresAuth: true,
      });
      return res.data;
    },
    enabled: Boolean(teamId),
  });
}

export function useStrategyRoom(roomId: string | undefined) {
  const { user, isDemoMode } = useAuth();

  return useQuery({
    queryKey: ['strategy-room', roomId, isDemoMode, Boolean(user)],
    queryFn: async () => {
      if (!roomId) throw new Error('Missing room ID');

      if (isDemoMode || !user) {
        return {
          id: roomId,
          team_id: '49bf841b-8517-49f3-9d2a-89a1c89f50e1',
          name: 'Bermuda Drop Rotations & Tactical Roles',
          description: 'Factory early push vs Mill defense. Primary drop location and rotation checkpoints.',
          content: {
            tactics: [
              'Primary drop: Factory roofs and ground compound',
              'Fallback drop: Clock tower edge houses',
              'First rotation: Cut off Mars Electric flankers by 3:00',
              'Vehicle priority: Blue sports car + Jeep for scouting',
            ],
          },
          created_by: '893c5d64-2cf9-4ee7-9e79-50ebbc2a22cc',
          created_at: '2026-10-24T12:00:00Z',
          updated_at: '2026-10-27T10:00:00Z',
        } as StrategyRoom;
      }

      return apiClient<StrategyRoom>(`/strategy-rooms/${roomId}`, {
        requiresAuth: true,
      });
    },
    enabled: Boolean(roomId),
  });
}

export function useStrategyAttachments(roomId: string | undefined) {
  const { user, isDemoMode } = useAuth();

  return useQuery({
    queryKey: ['strategy-attachments', roomId, isDemoMode, Boolean(user)],
    queryFn: async () => {
      if (!roomId) return [];

      if (isDemoMode || !user) {
        return [
          {
            id: 'att-1',
            strategy_room_id: roomId,
            team_id: '49bf841b-8517-49f3-9d2a-89a1c89f50e1',
            file_name: 'Bermuda_Zone_Heatmap_v4.png',
            storage_path: '49bf841b-8517-49f3-9d2a-89a1c89f50e1/room-1/Bermuda_Zone_Heatmap_v4.png',
            content_type: 'image/png',
            size_bytes: 1420500,
            uploaded_by: '893c5d64-2cf9-4ee7-9e79-50ebbc2a22cc',
            created_at: '2026-10-26T12:00:00Z',
          },
        ] as StrategyAttachment[];
      }

      const res = await apiClient<ListResponse<StrategyAttachment>>(
        `/strategy-rooms/${roomId}/attachments`,
        { requiresAuth: true }
      );
      return res.data;
    },
    enabled: Boolean(roomId),
  });
}

export function useCreateStrategyRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      name,
      description,
      content,
    }: {
      teamId: string;
      name: string;
      description?: string;
      content?: unknown;
    }) => {
      return apiClient<StrategyRoom>(`/teams/${teamId}/strategy-rooms`, {
        method: 'POST',
        body: { name, description, content },
        requiresAuth: true,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['strategy-rooms', variables.teamId] });
    },
  });
}

export function useUpdateStrategyRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roomId,
      name,
      description,
      content,
    }: {
      roomId: string;
      name?: string;
      description?: string;
      content?: unknown;
    }) => {
      return apiClient<StrategyRoom>(`/strategy-rooms/${roomId}`, {
        method: 'PATCH',
        body: { name, description, content },
        requiresAuth: true,
      });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['strategy-room', updated.id] });
      queryClient.invalidateQueries({ queryKey: ['strategy-rooms', updated.team_id] });
    },
  });
}
