import { describe, it, expect, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { loadConfig } from '../../src/config/index.js';

/**
 * Route tests for the versioned API. These exercise behavior that happens
 * BEFORE any database call: authentication guards (401) and Zod validation
 * (400), plus the shape of the generated OpenAPI document. They never require
 * a live Supabase and so are secret-free.
 */

const testConfig = loadConfig({
  NODE_ENV: 'test',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  USE_FAKE_NOTIFICATIONS: 'true',
  LOG_LEVEL: 'silent',
});

let app: FastifyInstance | undefined;

afterEach(async () => {
  if (app) {
    await app.close();
    app = undefined;
  }
});

async function build(): Promise<FastifyInstance> {
  app = await buildApp({ config: testConfig });
  return app;
}

describe('API authentication guards', () => {
  // GET routes (no body) — the auth preHandler is the first gate.
  const getRoutes: string[] = [
    '/api/v1/me',
    '/api/v1/me/preferences',
    '/api/v1/events',
    '/api/v1/reminders',
    '/api/v1/integrations',
    '/api/v1/teams',
    '/api/v1/matches',
    '/api/v1/achievements',
  ];

  it.each(getRoutes)('GET %s returns 401 without a Bearer token', async (url) => {
    const instance = await build();
    const response = await instance.inject({ method: 'GET', url });
    expect(response.statusCode).toBe(401);
    const body = response.json() as { error: { code: string } };
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  // POST routes: body validation runs before the auth preHandler, so we send a
  // VALID body to prove the auth guard (401) is reached, not a 400.
  const postRoutes: Array<[string, Record<string, unknown>]> = [
    ['/api/v1/organizers', { name: 'Acme', slug: 'acme' }],
    [
      '/api/v1/events',
      { organizer_id: '00000000-0000-0000-0000-000000000001', title: 'Finals' },
    ],
    [
      '/api/v1/reminders/subscriptions',
      { channel: 'web_push', endpoint: 'https://push.example/x', keys: { auth: 'a', p256dh: 'b' } },
    ],
    [
      '/api/v1/integrations/discord',
      { organizer_id: '00000000-0000-0000-0000-000000000001', guild_id: 'g', channel_id: 'c' },
    ],
  ];

  it.each(postRoutes)('POST %s returns 401 without a Bearer token', async (url, payload) => {
    const instance = await build();
    const response = await instance.inject({ method: 'POST', url, payload });
    expect(response.statusCode).toBe(401);
    const body = response.json() as { error: { code: string } };
    expect(body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('API Zod validation', () => {
  it('rejects a bad pagination query on a public list endpoint (400)', async () => {
    const instance = await build();
    const response = await instance.inject({
      method: 'GET',
      url: '/api/v1/organizers?limit=0',
    });
    expect(response.statusCode).toBe(400);
    const body = response.json() as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a non-uuid organizer id (400)', async () => {
    const instance = await build();
    const response = await instance.inject({
      method: 'GET',
      url: '/api/v1/organizers/not-a-uuid',
    });
    expect(response.statusCode).toBe(400);
    const body = response.json() as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('OpenAPI document', () => {
  it('generates and includes the versioned module paths', async () => {
    const instance = await build();
    const response = await instance.inject({ method: 'GET', url: '/docs/json' });
    expect(response.statusCode).toBe(200);
    const doc = response.json() as { paths?: Record<string, unknown> };
    const paths = Object.keys(doc.paths ?? {});
    expect(paths).toContain('/api/v1/events');
    expect(paths).toContain('/api/v1/reminders');
    expect(paths).toContain('/api/v1/organizers');
    expect(paths).toContain('/api/v1/integrations/discord');
  });

  it('never exposes the subscription keys column in any schema or path', async () => {
    const instance = await build();
    const response = await instance.inject({ method: 'GET', url: '/docs/json' });
    const raw = response.body;
    // The literal "keys" property name must not appear in any response schema.
    // We assert on the serialized reminders subscription shapes specifically.
    const doc = JSON.parse(raw) as {
      paths: Record<string, Record<string, { responses?: Record<string, unknown> }>>;
    };
    const subscriptionPath = doc.paths['/api/v1/reminders/subscriptions'];
    expect(subscriptionPath).toBeDefined();
    const serializedSubscription = JSON.stringify(subscriptionPath?.post?.responses ?? {});
    expect(serializedSubscription).not.toContain('"keys"');
  });
});
