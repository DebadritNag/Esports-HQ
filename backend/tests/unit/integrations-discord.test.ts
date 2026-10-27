import { describe, it, expect } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { loadConfig } from '../../src/config/index.js';
import { ErrorCode, isAppError } from '../../src/utils/errors.js';
import { createDiscordIntegration } from '../../src/modules/integrations/service.js';
import type { TypedSupabaseClient } from '../../src/plugins/supabase-clients.js';

/**
 * POST /integrations/discord must return 501 (NOT_IMPLEMENTED) with a clear
 * message when Vault / the Discord token is not wired — never a fake success.
 * We drive the service directly with a stub app so no live DB is required.
 */

const baseConfig = loadConfig({
  NODE_ENV: 'test',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  USE_FAKE_NOTIFICATIONS: 'true',
  LOG_LEVEL: 'silent',
});

// A client stub that would succeed IF reached — proving the 501 guard fires
// first, before any write.
const neverCalledClient = {
  from() {
    throw new Error('DB should not be touched when Vault is unwired');
  },
} as unknown as TypedSupabaseClient;

function stubApp(overrides: Partial<FastifyInstance>): FastifyInstance {
  return {
    hasServiceRole: false,
    config: baseConfig,
    ...overrides,
  } as unknown as FastifyInstance;
}

describe('createDiscordIntegration (Vault unwired)', () => {
  it('throws NOT_IMPLEMENTED (501) when service-role/Vault is absent', async () => {
    const app = stubApp({ hasServiceRole: false });
    await expect(
      createDiscordIntegration(app, neverCalledClient, 'user-1', {
        organizer_id: '00000000-0000-0000-0000-000000000001',
        guild_id: 'g1',
        channel_id: 'c1',
      }),
    ).rejects.toSatisfy((error: unknown) => {
      return (
        isAppError(error) &&
        error.code === ErrorCode.NOT_IMPLEMENTED &&
        error.statusCode === 501 &&
        /DISCORD_BOT_TOKEN|Vault/i.test(error.message)
      );
    });
  });

  it('throws NOT_IMPLEMENTED when service-role present but Discord token absent', async () => {
    const app = stubApp({
      hasServiceRole: true,
      // config without DISCORD_BOT_TOKEN -> hasDiscord(false)
      config: baseConfig,
    });
    await expect(
      createDiscordIntegration(app, neverCalledClient, 'user-1', {
        organizer_id: '00000000-0000-0000-0000-000000000001',
        guild_id: 'g1',
        channel_id: 'c1',
      }),
    ).rejects.toSatisfy((error: unknown) => isAppError(error) && error.statusCode === 501);
  });
});
