import { describe, it, expect } from 'vitest';
import {
  dispatchReminder,
  type DispatchDeps,
} from '../../src/services/notification-dispatch.js';
import { FakeNotificationProvider } from '../../src/services/providers/fake.js';
import { loadConfig } from '../../src/config/index.js';
import type { TypedSupabaseClient } from '../../src/plugins/supabase-clients.js';

const fakeConfig = loadConfig({
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  USE_FAKE_NOTIFICATIONS: 'true',
});

interface SubscriptionSeed {
  id: string;
  user_id: string;
  channel: 'web_push' | 'email';
  endpoint: string;
  keys: Record<string, unknown>;
}

/**
 * Build a minimal Supabase client stub supporting the exact chain dispatch
 * uses: `.from(table).select(...).eq(...).eq(...)` (thenable) for reads and
 * `.from(table).insert(row)` for delivery logging. Captures inserted rows.
 */
function makeClientStub(subscriptions: SubscriptionSeed[]): {
  client: TypedSupabaseClient;
  insertedRows: Record<string, unknown>[];
} {
  const insertedRows: Record<string, unknown>[] = [];

  const client = {
    from(table: string) {
      if (table === 'notification_subscriptions') {
        const builder = {
          _rows: subscriptions,
          select() {
            return builder;
          },
          eq(column: string, value: unknown) {
            if (column === 'channel') {
              builder._rows = builder._rows.filter((r) => r.channel === value);
            }
            return builder;
          },
          then<TResult>(
            onfulfilled: (value: { data: SubscriptionSeed[]; error: null }) => TResult,
          ): TResult {
            return onfulfilled({ data: builder._rows, error: null });
          },
        };
        return builder;
      }
      if (table === 'notification_deliveries') {
        return {
          async insert(row: Record<string, unknown>) {
            insertedRows.push(row);
            return { data: null, error: null };
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  } as unknown as TypedSupabaseClient;

  return { client, insertedRows };
}

describe('dispatchReminder (fake provider)', () => {
  it('dispatches to active subscriptions and logs delivery rows without surfacing keys', async () => {
    const subscriptions: SubscriptionSeed[] = [
      {
        id: 'sub-1',
        user_id: 'user-1',
        channel: 'web_push',
        endpoint: 'https://push.example/endpoint-1',
        keys: { p256dh: 'SECRET_P256DH', auth: 'SECRET_AUTH' },
      },
    ];
    const { client, insertedRows } = makeClientStub(subscriptions);
    const fakeProvider = new FakeNotificationProvider('web_push');

    const deps: DispatchDeps = {
      client,
      config: fakeConfig,
      providers: { web_push: fakeProvider },
    };

    const summary = await dispatchReminder(
      {
        userId: 'user-1',
        reminderJobId: 'job-1',
        payload: { title: 'Match soon', body: 'Your match starts in 30 minutes.' },
      },
      deps,
    );

    // Summary shape is secret-free.
    expect(summary.userId).toBe('user-1');
    expect(summary.reminderJobId).toBe('job-1');
    expect(summary.outcomes).toHaveLength(1);
    expect(summary.outcomes[0]?.status).toBe('sent');
    expect(summary.outcomes[0]?.subscriptionId).toBe('sub-1');

    // Exactly one delivery row logged with the expected shape.
    expect(insertedRows).toHaveLength(1);
    const row = insertedRows[0] as Record<string, unknown>;
    expect(row.user_id).toBe('user-1');
    expect(row.subscription_id).toBe('sub-1');
    expect(row.channel).toBe('web_push');
    expect(row.status).toBe('sent');
    expect(row.reminder_job_id).toBe('job-1');

    // Keys must NEVER appear in the logged row, the summary, or the fake record.
    const serializedRow = JSON.stringify(row);
    expect(serializedRow).not.toContain('SECRET_P256DH');
    expect(serializedRow).not.toContain('SECRET_AUTH');
    expect(row).not.toHaveProperty('keys');

    const serializedSummary = JSON.stringify(summary);
    expect(serializedSummary).not.toContain('SECRET_P256DH');
    expect(serializedSummary).not.toContain('SECRET_AUTH');

    const records = fakeProvider.getRecords();
    expect(records).toHaveLength(1);
    expect(JSON.stringify(records)).not.toContain('SECRET_P256DH');
    expect(records[0]).not.toHaveProperty('secret');
  });

  it('filters to a single channel when requested', async () => {
    const subscriptions: SubscriptionSeed[] = [
      {
        id: 'sub-web',
        user_id: 'user-2',
        channel: 'web_push',
        endpoint: 'https://push.example/web',
        keys: { p256dh: 'x', auth: 'y' },
      },
      {
        id: 'sub-email',
        user_id: 'user-2',
        channel: 'email',
        endpoint: 'player@example.com',
        keys: {},
      },
    ];
    const { client, insertedRows } = makeClientStub(subscriptions);

    const summary = await dispatchReminder(
      {
        userId: 'user-2',
        channel: 'email',
        payload: { title: 'Reg opens', body: 'Registration is open.' },
      },
      { client, config: fakeConfig },
    );

    expect(summary.outcomes).toHaveLength(1);
    expect(summary.outcomes[0]?.channel).toBe('email');
    expect(insertedRows).toHaveLength(1);
    expect((insertedRows[0] as Record<string, unknown>).channel).toBe('email');
  });
});
