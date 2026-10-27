export type EventType = 'tournament' | 'scrim' | 'qualifier' | 'showmatch' | 'league' | 'other';
export type EventStatus =
  | 'scheduled'
  | 'registration_open'
  | 'registration_closed'
  | 'live'
  | 'completed'
  | 'cancelled'
  | 'postponed';
export type ConfirmationStatus = 'unconfirmed' | 'confirmed' | 'needs_review';
export type TrackingStatus = 'interested' | 'registered' | 'not_participating' | 'completed';
export type RegistrationStatus =
  | 'none'
  | 'intending'
  | 'registered'
  | 'waitlisted'
  | 'withdrawn'
  | 'confirmed';
export type TeamRole = 'owner' | 'manager' | 'captain' | 'member' | 'substitute';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';
export type AchievementScope = 'personal' | 'team';
export type ReminderType = 'registration_open' | 'registration_close' | 'check_in' | 'stream' | 'match';
export type ReminderJobStatus = 'pending' | 'processing' | 'delivered' | 'failed' | 'cancelled' | 'expired';
export type NotificationChannel = 'web_push' | 'email';
export type DeliveryStatus = 'sent' | 'failed' | 'skipped';
export type SourceType = 'discord' | 'website' | 'api' | 'rss' | 'ical' | 'manual';
export type ConnectionStatus = 'pending' | 'active' | 'degraded' | 'error' | 'disabled';

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  count: number;
  hasMore: boolean;
}

export interface ListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

export interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_path: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface ReminderPreference {
  id: string;
  user_id: string;
  event_id: string | null;
  organizer_id: string | null;
  registration_reminders_enabled: boolean;
  registration_lead_minutes: number;
  check_in_reminders_enabled: boolean;
  check_in_lead_minutes: number;
  stream_reminders_enabled: boolean;
  stream_lead_minutes: number;
  match_reminders_enabled: boolean;
  match_lead_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface Organizer {
  id: string;
  name: string;
  slug: string;
  game: string;
  description: string | null;
  website_url: string | null;
  discord_invite_url: string | null;
  timezone: string;
  default_registration_time: string | null;
  default_stream_time: string | null;
  is_verified: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizerFollow {
  id: string;
  organizer_id: string;
  user_id: string;
  is_active: boolean;
  created_at: string;
}

export interface EventItem {
  id: string;
  organizer_id: string;
  title: string;
  description: string | null;
  game: string;
  event_type: EventType;
  event_status: EventStatus;
  confirmation_status: ConfirmationStatus;
  timezone: string;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  check_in_at: string | null;
  stream_starts_at: string | null;
  match_starts_at: string | null;
  registration_url: string | null;
  stream_url: string | null;
  source_message_url: string | null;
  is_recurring_occurrence: boolean;
  occurrence_date: string | null;
  recurrence_rule_id: string | null;
  last_verified_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Organizers might be joined or queried
  organizer?: Organizer;
}

export interface UserEventTracking {
  id: string;
  user_id: string;
  event_id: string;
  tracking_status: TrackingStatus;
  registration_status: RegistrationStatus;
  personal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReminderJob {
  id: string;
  user_id: string;
  event_id: string;
  reminder_type: ReminderType;
  status: ReminderJobStatus;
  scheduled_for: string;
  delivered_at: string | null;
  attempt_count: number;
  last_attempt_at: string | null;
  last_error: string | null;
  next_attempt_at: string | null;
  created_at: string;
  updated_at: string;
  event?: EventItem;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  tag: string | null;
  game: string;
  bio: string | null;
  logo_path: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  jersey_number: number | null;
  joined_at: string;
  profile?: UserProfile;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  invited_by: string;
  invited_user_id: string | null;
  invited_email: string | null;
  role: TeamRole;
  status: InvitationStatus;
  expires_at: string;
  responded_at: string | null;
  created_at: string;
}

export interface TeamAnnouncement {
  id: string;
  team_id: string;
  author_id: string | null;
  title: string;
  body: string | null;
  created_at: string;
  updated_at: string;
}

export interface StrategyRoom {
  id: string;
  team_id: string;
  name: string;
  description: string | null;
  content: unknown;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StrategyAttachment {
  id: string;
  strategy_room_id: string;
  team_id: string;
  file_name: string;
  storage_path: string;
  content_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface MatchItem {
  id: string;
  event_id: string | null;
  organizer_id: string | null;
  title: string | null;
  round_label: string | null;
  map_name: string | null;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchParticipant {
  id: string;
  match_id: string;
  team_id: string | null;
  user_id: string | null;
  slot_label: string | null;
  placement: number | null;
  created_at: string;
}

export interface MatchStatistic {
  id: string;
  match_id: string;
  participant_id: string | null;
  team_id: string | null;
  user_id: string | null;
  kills: number;
  knocks: number;
  damage: number;
  placement_points: number;
  survival_seconds: number;
  extra: unknown;
  created_at: string;
}

export interface AchievementItem {
  id: string;
  scope: AchievementScope;
  title: string;
  description: string | null;
  placement: number | null;
  event_id: string | null;
  team_id: string | null;
  user_id: string | null;
  awarded_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AchievementEvidence {
  id: string;
  achievement_id: string;
  file_name: string;
  storage_path: string;
  content_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface ImportCandidate {
  candidate: Record<string, unknown>;
  errors: string[];
  ambiguities: string[];
  needs_review: boolean;
}

export interface HealthResponse {
  status: 'ok';
}

export interface ReadinessResponse {
  status: 'ok' | 'degraded';
  database: {
    reachable: boolean;
    detail?: string;
  };
  serviceRole: {
    available: boolean;
  };
  reminders: {
    due: number;
    delivered: number;
    failed: number;
    delayed: number;
  } | { available: false };
  timestamp: string;
}
