import { describe, it, expect } from 'vitest';
import {
  regenerateEventReminders,
  resolveReminderPreference,
} from '../../src/services/reminder-service.js';
import { loadConfig } from '../../src/config/index.js';
import { ErrorCode, isAppError } from '../../src/utils/errors.js';

const noServiceRoleConfig = loadConfig({
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  USE_FAKE_NOTIFICATIONS: 'true',
});

describe('reminder-service (no service-role key)', () => {
  it('throws a typed SERVICE_UNAVAILABLE AppError when the service-role key is absent', async () => {
    await expect(
      regenerateEventReminders('11111111-1111-1111-1111-111111111111', {
        config: noServiceRoleConfig,
      }),
    ).rejects.toMatchObject({
      name: 'AppError',
      code: ErrorCode.SERVICE_UNAVAILABLE,
    });
  });

  it('wraps resolve_reminder_preference and normalizes the array to its first row', async () => {
    // Inject a stub client so we can exercise the [0] normalization without a DB.
    const stubClient = {
      rpc(_fn: string, _args: unknown) {
        return Promise.resolve({
          data: [
            {
              registration_reminders_enabled: true,
              registration_lead_minutes: 30,
              check_in_reminders_enabled: true,
              check_in_lead_minutes: 15,
              stream_reminders_enabled: true,
              stream_lead_minutes: 15,
              match_reminders_enabled: true,
              match_lead_minutes: 30,
            },
            { registration_lead_minutes: 999 },
          ],
          error: null,
        });
      },
    } as never;

    const resolved = await resolveReminderPreference('u', 'e', {
      client: stubClient,
      config: noServiceRoleConfig,
    });
    expect(resolved?.registration_lead_minutes).toBe(30);
  });
});

// Live-RPC path: SKIPS (not fails) when the service-role key is absent.
describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)('reminder-service (live RPC)', () => {
  it('invokes regenerate_event_reminders against the hosted RPC', async () => {
    const liveConfig = loadConfig(process.env);
    // Non-existent event id: the RPC should return a numeric count (likely 0)
    // or raise a Postgres error surfaced as an AppError — either is acceptable.
    try {
      const count = await regenerateEventReminders(
        '00000000-0000-0000-0000-000000000000',
        { config: liveConfig },
      );
      expect(typeof count).toBe('number');
    } catch (err) {
      expect(isAppError(err)).toBe(true);
    }
  });
});
