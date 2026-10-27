import type { TypedSupabaseClient } from '../../plugins/supabase-clients.js';
import { AppError } from '../../utils/errors.js';
import { mapPostgrestError } from '../../utils/supabase-error.js';
import type {
  ProfileResponse,
  ReminderPreferenceResponse,
  UpdateProfileBody,
  UpdateReminderPreferenceBody,
} from './schema.js';

const PROFILE_COLUMNS =
  'id, username, display_name, avatar_path, timezone, created_at, updated_at';
const PREFERENCE_COLUMNS =
  'id, user_id, event_id, organizer_id, registration_reminders_enabled, registration_lead_minutes, check_in_reminders_enabled, check_in_lead_minutes, stream_reminders_enabled, stream_lead_minutes, match_reminders_enabled, match_lead_minutes, created_at, updated_at';

/** Fetch the authenticated user's profile (RLS-scoped). 404 when absent. */
export async function getMyProfile(
  client: TypedSupabaseClient,
  userId: string,
): Promise<ProfileResponse> {
  const { data, error } = await client
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Load profile');
  }
  if (!data) {
    throw AppError.notFound('Profile not found.');
  }
  return data as ProfileResponse;
}

/** Update the authenticated user's profile (RLS-scoped). */
export async function updateMyProfile(
  client: TypedSupabaseClient,
  userId: string,
  body: UpdateProfileBody,
): Promise<ProfileResponse> {
  const { data, error } = await client
    .from('profiles')
    .update(body)
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Update profile');
  }
  if (!data) {
    throw AppError.notFound('Profile not found.');
  }
  return data as ProfileResponse;
}

/**
 * Fetch the user-default reminder preference (event_id & organizer_id null).
 * 404 when the user has not yet configured a default row.
 */
export async function getMyPreferences(
  client: TypedSupabaseClient,
  userId: string,
): Promise<ReminderPreferenceResponse> {
  const { data, error } = await client
    .from('reminder_preferences')
    .select(PREFERENCE_COLUMNS)
    .eq('user_id', userId)
    .is('event_id', null)
    .is('organizer_id', null)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Load reminder preferences');
  }
  if (!data) {
    throw AppError.notFound('Reminder preferences not found.');
  }
  return data as ReminderPreferenceResponse;
}

/**
 * Upsert the user-default reminder preference. Writes via the RLS-scoped
 * client, so the user can only touch their own row.
 */
export async function updateMyPreferences(
  client: TypedSupabaseClient,
  userId: string,
  body: UpdateReminderPreferenceBody,
): Promise<ReminderPreferenceResponse> {
  // Update-first; if no default row exists yet, insert one.
  const { data: existing, error: selectError } = await client
    .from('reminder_preferences')
    .select('id')
    .eq('user_id', userId)
    .is('event_id', null)
    .is('organizer_id', null)
    .maybeSingle();
  if (selectError) {
    throw mapPostgrestError(selectError, 'Load reminder preferences');
  }

  if (existing) {
    const { data, error } = await client
      .from('reminder_preferences')
      .update(body)
      .eq('id', existing.id)
      .select(PREFERENCE_COLUMNS)
      .maybeSingle();
    if (error) {
      throw mapPostgrestError(error, 'Update reminder preferences');
    }
    if (!data) {
      throw AppError.notFound('Reminder preferences not found.');
    }
    return data as ReminderPreferenceResponse;
  }

  const { data, error } = await client
    .from('reminder_preferences')
    .insert({ user_id: userId, ...body })
    .select(PREFERENCE_COLUMNS)
    .maybeSingle();
  if (error) {
    throw mapPostgrestError(error, 'Create reminder preferences');
  }
  if (!data) {
    throw AppError.internal('Failed to create reminder preferences');
  }
  return data as ReminderPreferenceResponse;
}
