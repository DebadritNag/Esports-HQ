import { describe, it, expect } from 'vitest';
import { createRecurrenceWorker } from '../../src/workers/recurrence-worker.js';
import { loadConfig } from '../../src/config/index.js';
import type { TypedSupabaseClient } from '../../src/plugins/supabase-clients.js';

const baseConfig = loadConfig({
  NODE_ENV: 'test',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  USE_FAKE_NOTIFICATIONS: 'true',
  LOG_LEVEL: 'silent',
  RECURRENCE_HORIZON_DAYS: '14',
});

const noServiceRoleConfig = loadConfig({
  NODE_ENV: 'test',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  USE_FAKE_NOTIFICATIONS: 'true',
  LOG_LEVEL: 'silent',
});

/** Mock client exposing only rpc(generate_recurrence_occurrences). */
function buildMockClient(returnCount: number): {
  client: TypedSupabaseClient;
  calls: Array<{ fn: string; args: unknown }>;
} {
  const calls: Array<{ fn: string; args: unknown }> = [];
  const client = {
    rpc(fn: string, args: unknown) {
      calls.push({ fn, args });
      return Promise.resolve({ data: returnCount, error: null });
    },
  } as unknown as TypedSupabaseClient;
  return { client, calls };
}

describe('recurrence worker — exits cleanly without a service role', () => {
  it('throws SERVICE_UNAVAILABLE when no service-role key and no injected client', () => {
    expect(() => createRecurrenceWorker({ config: noServiceRoleConfig })).toThrowError(
      /service-role/i,
    );
  });
});

describe('recurrence worker — generation cycle', () => {
  it('calls generate_recurrence_occurrences with the configured horizon and returns the count', async () => {
    const { client, calls } = buildMockClient(7);
    const worker = createRecurrenceWorker({ config: baseConfig, client });

    const count = await worker.runOnce();
    expect(count).toBe(7);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.fn).toBe('generate_recurrence_occurrences');
    expect(calls[0]?.args).toEqual({ p_horizon_days: 14 });
  });
});

// Live-DB behavior: SKIPS without the service-role key.
describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)('recurrence worker (live DB)', () => {
  it('runs a real generation pass against the hosted DB', async () => {
    const liveConfig = loadConfig(process.env);
    const worker = createRecurrenceWorker({ config: liveConfig });
    const count = await worker.runOnce();
    expect(typeof count).toBe('number');
    await worker.stop();
  });
});
