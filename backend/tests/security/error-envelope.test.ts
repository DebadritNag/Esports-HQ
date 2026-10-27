import { describe, it, expect, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { buildApp } from '../../src/app.js';
import { loadConfig } from '../../src/config/index.js';
import supabasePlugin from '../../src/plugins/supabase.js';
import errorHandlerPlugin from '../../src/plugins/error-handler.js';

/**
 * Security tests:
 *  - the error envelope must hide internal (stack/SQL) detail when
 *    NODE_ENV=production, surfacing only a generic message + code + requestId.
 *  - the reminders subscription response schema must never contain the `keys`
 *    column anywhere in the generated OpenAPI document.
 */

let app: FastifyInstance | undefined;

afterEach(async () => {
  if (app) {
    await app.close();
    app = undefined;
  }
});

describe('error envelope in production', () => {
  it('hides internal error detail (no stack / SQL leaked)', async () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
      USE_FAKE_NOTIFICATIONS: 'true',
      LOG_LEVEL: 'silent',
    });

    // Build a minimal app with the real error-handler so we can attach a
    // throwing route before ready() (buildApp finalizes with ready()).
    const instance = Fastify({ logger: false });
    instance.setValidatorCompiler(validatorCompiler);
    instance.setSerializerCompiler(serializerCompiler);
    await instance.register(supabasePlugin, { config });
    await instance.register(errorHandlerPlugin);
    instance.get('/__boom', async () => {
      throw new Error('syntax error at or near "SELECT secret_column" FROM users');
    });
    await instance.ready();
    app = instance;

    const response = await app.inject({ method: 'GET', url: '/__boom' });
    expect(response.statusCode).toBe(500);
    const body = response.json() as { error: { code: string; message: string; requestId: string } };
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.requestId).toBeTruthy();
    // The raw internal message / SQL must not leak.
    expect(response.body).not.toContain('SELECT secret_column');
    expect(response.body).not.toContain('syntax error');
  });
});

describe('reminders OpenAPI schema', () => {
  it('omits the subscription keys column from the response schema', async () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
      USE_FAKE_NOTIFICATIONS: 'true',
      LOG_LEVEL: 'silent',
    });
    app = await buildApp({ config });

    const response = await app.inject({ method: 'GET', url: '/docs/json' });
    const doc = JSON.parse(response.body) as {
      paths: Record<string, Record<string, { responses?: Record<string, unknown> }>>;
    };

    // Subscription create response (201) must not reference a `keys` property.
    const post = doc.paths['/api/v1/reminders/subscriptions']?.post;
    expect(post).toBeDefined();
    const serialized = JSON.stringify(post?.responses ?? {});
    expect(serialized).not.toContain('"keys"');
  });
});
