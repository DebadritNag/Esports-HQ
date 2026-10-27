import { describe, it, expect, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { loadConfig } from '../../src/config/index.js';

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

describe('health routes', () => {
  it('GET /health returns 200 {status:"ok"}', async () => {
    app = await buildApp({ config: testConfig });
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('GET /api/v1/health returns 200 under the versioned prefix', async () => {
    app = await buildApp({ config: testConfig });
    const response = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('generates an OpenAPI document at /docs/json', async () => {
    app = await buildApp({ config: testConfig });
    const response = await app.inject({ method: 'GET', url: '/docs/json' });
    expect(response.statusCode).toBe(200);
    const doc = response.json() as { openapi?: string; paths?: Record<string, unknown> };
    expect(doc.openapi).toBeDefined();
    expect(doc.paths).toBeDefined();
    expect(Object.keys(doc.paths ?? {})).toContain('/health');
  });

  it('returns the error envelope for unknown routes', async () => {
    app = await buildApp({ config: testConfig });
    const response = await app.inject({ method: 'GET', url: '/does-not-exist' });
    expect(response.statusCode).toBe(404);
    const body = response.json() as { error: { code: string; requestId: string } };
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.requestId).toBeTruthy();
  });
});
