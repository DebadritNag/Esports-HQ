import { describe, it, expect } from 'vitest';
import {
  DEFAULT_REMINDER_PREFERENCE,
  resolvePreferencePrecedence,
} from '../../src/services/preference-precedence.js';

describe('resolvePreferencePrecedence', () => {
  it('falls back to system defaults when no layer is provided', () => {
    const resolved = resolvePreferencePrecedence({});
    expect(resolved).toEqual(DEFAULT_REMINDER_PREFERENCE);
    // Documented defaults: reg=30, checkin=15, stream=15, match=30.
    expect(resolved.registration_lead_minutes).toBe(30);
    expect(resolved.check_in_lead_minutes).toBe(15);
    expect(resolved.stream_lead_minutes).toBe(15);
    expect(resolved.match_lead_minutes).toBe(30);
  });

  it('uses the user default when it is the only layer present', () => {
    const resolved = resolvePreferencePrecedence({
      userDefault: { registration_lead_minutes: 45, match_reminders_enabled: false },
    });
    expect(resolved.registration_lead_minutes).toBe(45);
    expect(resolved.match_reminders_enabled).toBe(false);
    // Unset fields fall through to defaults.
    expect(resolved.check_in_lead_minutes).toBe(15);
  });

  it('lets the organizer layer override the user default', () => {
    const resolved = resolvePreferencePrecedence({
      userDefault: { stream_lead_minutes: 20, registration_lead_minutes: 45 },
      organizer: { stream_lead_minutes: 10 },
    });
    // Organizer wins for stream.
    expect(resolved.stream_lead_minutes).toBe(10);
    // User default still applies where organizer is silent.
    expect(resolved.registration_lead_minutes).toBe(45);
  });

  it('lets the event layer override both organizer and user default', () => {
    const resolved = resolvePreferencePrecedence({
      userDefault: { match_lead_minutes: 60, check_in_lead_minutes: 25 },
      organizer: { match_lead_minutes: 45, check_in_lead_minutes: 20 },
      event: { match_lead_minutes: 5 },
    });
    // Event wins for match.
    expect(resolved.match_lead_minutes).toBe(5);
    // Organizer wins over user default for check-in.
    expect(resolved.check_in_lead_minutes).toBe(20);
  });

  it('treats null layers as absent', () => {
    const resolved = resolvePreferencePrecedence({
      userDefault: null,
      organizer: null,
      event: { registration_lead_minutes: 12 },
    });
    expect(resolved.registration_lead_minutes).toBe(12);
    expect(resolved.match_lead_minutes).toBe(30);
  });
});
