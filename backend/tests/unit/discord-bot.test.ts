import { describe, it, expect } from 'vitest';
import { Client } from 'discord.js';
import { createDiscordBot } from '../../src/workers/discord-bot.js';
import { loadConfig } from '../../src/config/index.js';
import type { TypedSupabaseClient } from '../../src/plugins/supabase-clients.js';

const baseConfig = loadConfig({
  NODE_ENV: 'test',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  DISCORD_BOT_TOKEN: 'test-bot-token',
  USE_FAKE_NOTIFICATIONS: 'true',
  LOG_LEVEL: 'silent',
});

const noDiscordConfig = loadConfig({
  NODE_ENV: 'test',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  USE_FAKE_NOTIFICATIONS: 'true',
  LOG_LEVEL: 'silent',
});

interface InsertRecord {
  table: string;
  row: Record<string, unknown>;
}

/**
 * Mock supabase client covering the handleMessage query chains:
 *  - event_sources lookup: from().select().eq().eq().limit()
 *  - events insert:        from().insert().select().single()
 *  - event_sources insert: from().insert()
 *  - integration_health:   from().insert()
 */
function buildMockClient(options: {
  existingSources?: Array<{ id: string; content_hash: string }>;
} = {}): { client: TypedSupabaseClient; inserts: InsertRecord[] } {
  const inserts: InsertRecord[] = [];
  const existing = options.existingSources ?? [];

  const client = {
    from(table: string) {
      return {
        select() {
          // event_sources lookup chain -> resolves to a thenable at .limit()
          const chain = {
            eq() {
              return chain;
            },
            limit() {
              return Promise.resolve({ data: existing, error: null });
            },
          };
          return chain;
        },
        insert(row: Record<string, unknown>) {
          inserts.push({ table, row });
          // events insert needs .select().single(); others are awaited directly.
          const thenable = {
            select() {
              return {
                single() {
                  return Promise.resolve({ data: { id: 'new-event-id' }, error: null });
                },
              };
            },
            then(resolve: (v: { error: null }) => void) {
              resolve({ error: null });
            },
          };
          return thenable;
        },
      };
    },
  } as unknown as TypedSupabaseClient;

  return { client, inserts };
}

function makeMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg-1',
    content: 'Scrim Night\nMatch starts 2026-03-01 at 8:00 pm',
    channelId: 'chan-1',
    guildId: 'guild-1',
    createdAt: new Date('2026-02-20T10:00:00.000Z'),
    author: { bot: false },
    ...overrides,
  } as never;
}

function makeAuthorizations() {
  const map = new Map();
  map.set('chan-1', {
    connection: {
      id: 'conn-1',
      organizer_id: 'org-1',
      source_type: 'discord',
      config: { guildId: 'guild-1', channelId: 'chan-1' },
    },
    organizerId: 'org-1',
    timezone: 'Asia/Kolkata',
  });
  return map as never;
}

describe('discord bot — exits cleanly without a token', () => {
  it('createDiscordBot is constructable with an injected discord client (no login)', () => {
    const { client } = buildMockClient();
    const discordClient = new Client({ intents: [] });
    const bot = createDiscordBot({ config: noDiscordConfig, client, discordClient });
    expect(typeof bot.handleMessage).toBe('function');
    // Never call start()/login in tests — just ensure the factory is pure.
  });
});

describe('discord bot — handleMessage', () => {
  function makeBot(mock: ReturnType<typeof buildMockClient>) {
    const discordClient = new Client({ intents: [] });
    return createDiscordBot({ config: baseConfig, client: mock.client, discordClient });
  }

  it('ignores messages from bots', async () => {
    const mock = buildMockClient();
    const bot = makeBot(mock);
    const result = await bot.handleMessage(
      makeMessage({ author: { bot: true } }),
      makeAuthorizations(),
    );
    expect(result).toBe('ignored');
    expect(mock.inserts).toHaveLength(0);
  });

  it('ignores messages in unauthorized channels', async () => {
    const mock = buildMockClient();
    const bot = makeBot(mock);
    const result = await bot.handleMessage(
      makeMessage({ channelId: 'not-authorized' }),
      makeAuthorizations(),
    );
    expect(result).toBe('ignored');
    expect(mock.inserts).toHaveLength(0);
  });

  it('ignores empty messages', async () => {
    const mock = buildMockClient();
    const bot = makeBot(mock);
    const result = await bot.handleMessage(makeMessage({ content: '   ' }), makeAuthorizations());
    expect(result).toBe('ignored');
  });

  it('creates an event and records provenance for a new announcement', async () => {
    const mock = buildMockClient();
    const bot = makeBot(mock);
    const result = await bot.handleMessage(makeMessage(), makeAuthorizations());
    expect(result).toBe('created');

    const eventInsert = mock.inserts.find((i) => i.table === 'events');
    expect(eventInsert?.row.organizer_id).toBe('org-1');
    expect(eventInsert?.row.source_connection_id).toBe('conn-1');
    expect(eventInsert?.row.source_external_id).toBe('msg-1');
    // A fully-parseable announcement is unconfirmed (never auto-confirmed).
    expect(eventInsert?.row.confirmation_status).toBe('unconfirmed');

    const sourceInsert = mock.inserts.find((i) => i.table === 'event_sources');
    expect(sourceInsert?.row.external_message_id).toBe('msg-1');
    expect(typeof sourceInsert?.row.content_hash).toBe('string');

    // integration_health is recorded.
    expect(mock.inserts.some((i) => i.table === 'integration_health')).toBe(true);
  });

  it('creates a needs_review event when the announcement is ambiguous', async () => {
    const mock = buildMockClient();
    const bot = makeBot(mock);
    // No concrete date -> parser flags needsReview.
    const result = await bot.handleMessage(
      makeMessage({ content: 'Big tournament coming soon, stay tuned!' }),
      makeAuthorizations(),
    );
    expect(result).toBe('created');
    const eventInsert = mock.inserts.find((i) => i.table === 'events');
    expect(eventInsert?.row.confirmation_status).toBe('needs_review');
  });

  it('treats a message with a matching content hash as a duplicate', async () => {
    // Pre-seed event_sources with the exact hash the parser will compute for
    // this content so the dedup branch fires.
    const { createHash } = await import('node:crypto');
    const content = 'Scrim Night\nMatch starts 2026-03-01 at 8:00 pm';
    const hash = createHash('sha256').update(content).digest('hex');
    const mock = buildMockClient({ existingSources: [{ id: 'es-1', content_hash: hash }] });
    const bot = makeBot(mock);

    const result = await bot.handleMessage(makeMessage({ content }), makeAuthorizations());
    expect(result).toBe('duplicate');
    expect(mock.inserts.some((i) => i.table === 'events')).toBe(false);
  });
});
