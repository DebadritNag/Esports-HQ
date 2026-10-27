import { describe, it, expect, vi } from 'vitest';
import { createReminderWorker } from '../../src/workers/reminder-worker.js';
import { loadConfig } from '../../src/config/index.js';
import type { TypedSupabaseClient } from '../../src/plugins/supabase-clients.js';
import type { DispatchSummary } from '../../src/services/notification-dispatch.js';

const baseConfig = loadConfig({
  NODE_ENV: 'test',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  USE_FAKE_NOTIFICATIONS: 'true',
  LOG_LEVEL: 'silent',
  REMINDER_BATCH_SIZE: '10',
});

const noServiceRoleConfig = loadConfig({
  NODE_ENV: 'test',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  USE_FAKE_NOTIFICATIONS: 'true',
  LOG_LEVEL: 'silent',
});

interface JobRow {
  id: string;
  user_id: string;
  event_id: string;
  reminder_type: string;
  attempt_count: number;
  status: string;
}

/** Record of an update applied to a reminder_jobs row. */
interface UpdateCall {
  id: string;
  patch: Record<string, unknown>;
}

/**
 * Build a minimal mocked service client that mimics the subset of the
 * supabase-js surface the worker uses: `rpc(...)` for claim/expire/requeue and
 * `from('reminder_jobs').update(patch).eq('id', id)`.
 */
function buildMockClient(jobs: JobRow[]): {
  client: TypedSupabaseClient;
  updates: UpdateCall[];
} {
  const updates: UpdateCall[] = [];
  let claimed = false;

  const client = {
    rpc(fn: string) {
      if (fn === 'claim_due_reminder_jobs') {
        // Claim once; subsequent polls return nothing.
        const payload = claimed ? [] : jobs;
        claimed = true;
        return Promise.resolve({ data: payload, error: null });
      }
      // expire/requeue maintenance RPCs return counts.
      return Promise.resolve({ data: 0, error: null });
    },
    from(table: string) {
      expect(table).toBe('reminder_jobs');
      return {
        update(patch: Record<string, unknown>) {
          return {
            eq(_col: string, id: string) {
              updates.push({ id, patch });
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  } as unknown as TypedSupabaseClient;

  return { client, updates };
}

function makeJob(overrides: Partial<JobRow> = {}): JobRow {
  return {
    id: 'job-1',
    user_id: 'user-1',
    event_id: 'event-1',
    reminder_type: 'match',
    attempt_count: 0,
    status: 'processing',
    ...overrides,
  };
}

describe('reminder worker — exits cleanly without a service role', () => {
  it('createReminderWorker throws SERVICE_UNAVAILABLE when no service-role key and no injected client', () => {
    // The worker builds a service client on construction; without the key the
    // shared createServiceClient throws, which the entrypoint catches to exit 0.
    expect(() => createReminderWorker({ config: noServiceRoleConfig })).toThrowError(
      /service-role/i,
    );
  });
});

describe('reminder worker — claim + dispatch cycle', () => {
  it('marks a job delivered when dispatch reports a sent outcome', async () => {
    const { client, updates } = buildMockClient([makeJob()]);
    const dispatch = vi.fn(
      async (req: { userId: string; reminderJobId?: string }): Promise<DispatchSummary> => ({
        userId: req.userId,
        reminderJobId: req.reminderJobId,
        outcomes: [{ subscriptionId: 's1', channel: 'web_push', status: 'sent' }],
      }),
    );

    const worker = createReminderWorker({
      config: baseConfig,
      client,
      dispatch: dispatch as never,
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await worker.runOnce();
    expect(result).toEqual({ claimed: 1, delivered: 1, failed: 0 });
    expect(dispatch).toHaveBeenCalledOnce();

    const update = updates.find((u) => u.id === 'job-1');
    expect(update?.patch.status).toBe('delivered');
    expect(update?.patch.delivered_at).toBe('2026-01-01T00:00:00.000Z');
  });

  it('marks a job pending with backoff when all delivery attempts fail (attempts remain)', async () => {
    const { client, updates } = buildMockClient([makeJob({ attempt_count: 0 })]);
    const dispatch = vi.fn(
      async (req: { userId: string; reminderJobId?: string }): Promise<DispatchSummary> => ({
        userId: req.userId,
        reminderJobId: req.reminderJobId,
        outcomes: [{ subscriptionId: 's1', channel: 'web_push', status: 'failed' }],
      }),
    );

    const worker = createReminderWorker({
      config: baseConfig,
      client,
      dispatch: dispatch as never,
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await worker.runOnce();
    expect(result).toEqual({ claimed: 1, delivered: 0, failed: 1 });

    const update = updates.find((u) => u.id === 'job-1');
    expect(update?.patch.status).toBe('pending');
    expect(update?.patch.attempt_count).toBe(1);
    expect(typeof update?.patch.next_attempt_at).toBe('string');
  });

  it('marks a job permanently failed once max attempts are exhausted', async () => {
    const { client, updates } = buildMockClient([makeJob({ attempt_count: 5 })]);
    const dispatch = vi.fn(
      async (req: { userId: string; reminderJobId?: string }): Promise<DispatchSummary> => ({
        userId: req.userId,
        reminderJobId: req.reminderJobId,
        outcomes: [{ subscriptionId: 's1', channel: 'web_push', status: 'failed' }],
      }),
    );

    const worker = createReminderWorker({
      config: baseConfig,
      client,
      dispatch: dispatch as never,
    });

    await worker.runOnce();
    const update = updates.find((u) => u.id === 'job-1');
    expect(update?.patch.status).toBe('failed');
    expect(update?.patch.next_attempt_at).toBeNull();
  });

  it('treats a user with no active subscriptions as delivered (no infinite retry)', async () => {
    const { client, updates } = buildMockClient([makeJob()]);
    const dispatch = vi.fn(
      async (req: { userId: string; reminderJobId?: string }): Promise<DispatchSummary> => ({
        userId: req.userId,
        reminderJobId: req.reminderJobId,
        outcomes: [],
      }),
    );

    const worker = createReminderWorker({
      config: baseConfig,
      client,
      dispatch: dispatch as never,
    });

    const result = await worker.runOnce();
    expect(result.delivered).toBe(1);
    expect(updates.find((u) => u.id === 'job-1')?.patch.status).toBe('delivered');
  });

  it('runMaintenance calls the expire + requeue RPCs', async () => {
    const { client } = buildMockClient([]);
    const worker = createReminderWorker({ config: baseConfig, client });
    const result = await worker.runMaintenance();
    expect(result).toEqual({ expired: 0, requeued: 0 });
  });
});

// Live-DB worker behavior: SKIPS (not fails) without the service-role key.
describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)('reminder worker (live DB)', () => {
  it('runs a real claim cycle against the hosted DB', async () => {
    const liveConfig = loadConfig(process.env);
    const worker = createReminderWorker({ config: liveConfig });
    const result = await worker.runOnce();
    expect(typeof result.claimed).toBe('number');
    await worker.stop();
  });
});
