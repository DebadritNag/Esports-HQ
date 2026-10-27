/**
 * Pure helper mirroring the database's reminder-preference precedence.
 *
 * This duplicates the resolution logic enforced by the hosted
 * `resolve_reminder_preference` RPC so the backend can reason about and test
 * precedence locally without a database round-trip. The authoritative result
 * at runtime still comes from the RPC; this helper exists for local reasoning
 * and deterministic unit tests.
 *
 * Precedence (highest wins): event-scoped > organizer-scoped > user-default.
 * Any field left unset at every level falls back to the system defaults.
 */

/** Resolved, fully-populated reminder preference. */
export interface ResolvedReminderPreference {
  registration_reminders_enabled: boolean;
  registration_lead_minutes: number;
  check_in_reminders_enabled: boolean;
  check_in_lead_minutes: number;
  stream_reminders_enabled: boolean;
  stream_lead_minutes: number;
  match_reminders_enabled: boolean;
  match_lead_minutes: number;
}

/** A single preference layer; every field is optional (sparse override). */
export type PreferenceLayer = Partial<ResolvedReminderPreference>;

/** System defaults applied when no layer specifies a value. */
export const DEFAULT_REMINDER_PREFERENCE: ResolvedReminderPreference = {
  registration_reminders_enabled: true,
  registration_lead_minutes: 30,
  check_in_reminders_enabled: true,
  check_in_lead_minutes: 15,
  stream_reminders_enabled: true,
  stream_lead_minutes: 15,
  match_reminders_enabled: true,
  match_lead_minutes: 30,
};

/** The three precedence layers, lowest to highest priority. */
export interface PreferenceLayers {
  /** User-wide default preference (lowest precedence). */
  userDefault?: PreferenceLayer | null;
  /** Organizer-scoped preference (overrides user default). */
  organizer?: PreferenceLayer | null;
  /** Event-scoped preference (highest precedence). */
  event?: PreferenceLayer | null;
}

/** Pick the first defined value across layers in precedence order. */
function pick<K extends keyof ResolvedReminderPreference>(
  key: K,
  ordered: ReadonlyArray<PreferenceLayer | null | undefined>,
): ResolvedReminderPreference[K] {
  for (const layer of ordered) {
    const value = layer?.[key];
    if (value !== undefined && value !== null) {
      return value as ResolvedReminderPreference[K];
    }
  }
  return DEFAULT_REMINDER_PREFERENCE[key];
}

/**
 * Resolve the effective reminder preference from the three layers, applying
 * event > organizer > user-default precedence and system defaults last.
 */
export function resolvePreferencePrecedence(
  layers: PreferenceLayers,
): ResolvedReminderPreference {
  // Highest precedence first.
  const ordered = [layers.event, layers.organizer, layers.userDefault] as const;
  return {
    registration_reminders_enabled: pick('registration_reminders_enabled', ordered),
    registration_lead_minutes: pick('registration_lead_minutes', ordered),
    check_in_reminders_enabled: pick('check_in_reminders_enabled', ordered),
    check_in_lead_minutes: pick('check_in_lead_minutes', ordered),
    stream_reminders_enabled: pick('stream_reminders_enabled', ordered),
    stream_lead_minutes: pick('stream_lead_minutes', ordered),
    match_reminders_enabled: pick('match_reminders_enabled', ordered),
    match_lead_minutes: pick('match_lead_minutes', ordered),
  };
}
