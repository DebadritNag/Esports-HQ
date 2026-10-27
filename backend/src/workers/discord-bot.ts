/**
 * Discord bot — standalone process (npm run bot:discord).
 *
 * Separate from the Fastify HTTP API; it never runs inside the API process.
 * It connects to Discord with discord.js and ingests announcements from the
 * guild/channel pairs that organizers have AUTHORIZED via
 * `source_connections.config` (source_type = 'discord'). For every new message
 * in an authorized channel it:
 *   1. dedups by message id + content hash into `event_sources`,
 *   2. runs the pure announcement parser,
 *   3. creates UNCONFIRMED events (or `needs_review` when the parser flags
 *      ambiguity) — it NEVER invents times or auto-confirms, and
 *   4. records `integration_health` for the connection (and logs permission
 *      failures) so operators can see per-connection status.
 *
 * ── PRIVILEGED INTENT ──────────────────────────────────────────────────────
 * This bot requires the **Message Content** privileged gateway intent
 * (GatewayIntentBits.MessageContent). You must enable it in the Discord
 * Developer Portal → your application → Bot → "Privileged Gateway Intents" →
 * "Message Content Intent". Without it, message bodies arrive empty and no
 * announcements can be parsed. The bot also needs the Guilds and GuildMessages
 * intents, and the "View Channel" + "Read Message History" permissions in each
 * authorized channel. See README.md › Discord bot for the full checklist.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Reconnects are handled by discord.js; we log disconnects and rely on its
 * built-in resume/backoff. On SIGTERM/SIGINT we destroy the client and exit 0.
 * If DISCORD_BOT_TOKEN is absent we log clearly and exit cleanly.
 *
 * Security: we never log the bot token or full message bodies — only message
 * ids, channel/guild ids, and parse outcomes.
 */

import { createHash } from 'node:crypto';
import { pino, type Logger } from 'pino';
import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  type Message,
} from 'discord.js';
import { getConfig, hasDiscord, type AppConfig } from '../config/index.js';
import { createServiceClient, type TypedSupabaseClient } from '../plugins/supabase-clients.js';
import { parseAnnouncement } from '../modules/integrations/sources/announcement-parser.js';
import type { Database } from '../types/database.types.js';

const COMPONENT = 'discord-bot';

type SourceConnectionRow = Database['public']['Tables']['source_connections']['Row'];
type EventInsert = Database['public']['Tables']['events']['Insert'];
type EventSourceInsert = Database['public']['Tables']['event_sources']['Insert'];
type IntegrationHealthInsert = Database['public']['Tables']['integration_health']['Insert'];
type ConnectionStatus = Database['public']['Enums']['connection_status'];

/**
 * The expected shape of an authorized discord `source_connections.config`.
 * Only `guildId` + `channelId` are required; the rest are optional hints.
 */
interface DiscordConnectionConfig {
  guildId?: string;
  channelId?: string;
  /** Optional several channels for one connection. */
  channelIds?: string[];
  /** Organizer timezone hint for relative-date resolution. */
  timezone?: string;
}

/** A resolved authorization: which connection owns a given channel. */
interface ChannelAuthorization {
  connection: SourceConnectionRow;
  organizerId: string;
  timezone: string;
}

export interface DiscordBotDeps {
  config?: AppConfig;
  client?: TypedSupabaseClient;
  logger?: Logger;
  /** Inject a pre-built discord client (tests). */
  discordClient?: Client;
}

export interface DiscordBot {
  /** Load authorized guild/channel map from source_connections. */
  loadAuthorizations(): Promise<Map<string, ChannelAuthorization>>;
  /** Handle a single incoming message (exported for unit tests). */
  handleMessage(
    message: Pick<Message, 'id' | 'content' | 'channelId' | 'guildId' | 'createdAt'> & {
      author?: { bot?: boolean } | null;
    },
    authorizations: Map<string, ChannelAuthorization>,
  ): Promise<'ignored' | 'duplicate' | 'created'>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

/** Record a per-connection health sample (never throws). */
async function recordHealth(
  client: TypedSupabaseClient,
  logger: Logger,
  sample: {
    sourceConnectionId: string | null;
    status: ConnectionStatus;
    detail?: string;
  },
): Promise<void> {
  const row: IntegrationHealthInsert = {
    component: COMPONENT,
    source_connection_id: sample.sourceConnectionId,
    status: sample.status,
    detail: sample.detail ?? null,
  };
  const { error } = await client.from('integration_health').insert(row);
  if (error) {
    logger.warn({ err: error.message }, 'failed to record integration_health');
  }
}

export function createDiscordBot(deps: DiscordBotDeps = {}): DiscordBot {
  const config = deps.config ?? getConfig();
  const logger = deps.logger ?? pino({ level: config.LOG_LEVEL, name: COMPONENT });
  const db = deps.client ?? createServiceClient(config);

  const discord =
    deps.discordClient ??
    new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        // Privileged — must be enabled in the Developer Portal (see header).
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Channel, Partials.Message],
    });

  async function loadAuthorizations(): Promise<Map<string, ChannelAuthorization>> {
    const { data, error } = await db
      .from('source_connections')
      .select('*')
      .eq('source_type', 'discord')
      .in('connection_status', ['active', 'degraded']);
    if (error) {
      throw new Error(`Failed to load discord source_connections: ${error.message}`);
    }

    const map = new Map<string, ChannelAuthorization>();
    for (const connection of (data ?? []) as SourceConnectionRow[]) {
      const cfg = (connection.config ?? {}) as DiscordConnectionConfig;
      const channelIds = new Set<string>();
      if (typeof cfg.channelId === 'string') {
        channelIds.add(cfg.channelId);
      }
      if (Array.isArray(cfg.channelIds)) {
        for (const id of cfg.channelIds) {
          if (typeof id === 'string') {
            channelIds.add(id);
          }
        }
      }
      const timezone =
        typeof cfg.timezone === 'string' && cfg.timezone.length > 0
          ? cfg.timezone
          : config.DEFAULT_TIMEZONE;
      for (const channelId of channelIds) {
        map.set(channelId, {
          connection,
          organizerId: connection.organizer_id,
          timezone,
        });
      }
    }
    return map;
  }

  async function handleMessage(
    message: Pick<Message, 'id' | 'content' | 'channelId' | 'guildId' | 'createdAt'> & {
      author?: { bot?: boolean } | null;
    },
    authorizations: Map<string, ChannelAuthorization>,
  ): Promise<'ignored' | 'duplicate' | 'created'> {
    // Ignore bot messages and unauthorized channels outright.
    if (message.author?.bot) {
      return 'ignored';
    }
    const auth = authorizations.get(message.channelId);
    if (!auth) {
      return 'ignored';
    }
    const content = message.content ?? '';
    if (content.trim().length === 0) {
      return 'ignored';
    }

    const contentHash = createHash('sha256').update(content).digest('hex');

    // Dedup by message id + content hash. event_sources rows link to an event,
    // so we check for an existing row with this external message id whose hash
    // matches (same content already ingested => duplicate).
    const { data: existing, error: existingError } = await db
      .from('event_sources')
      .select('id, content_hash')
      .eq('source_connection_id', auth.connection.id)
      .eq('external_message_id', message.id)
      .limit(1);
    if (existingError) {
      logger.warn({ err: existingError.message }, 'event_sources lookup failed');
    } else if ((existing ?? []).some((row) => row.content_hash === contentHash)) {
      return 'duplicate';
    }

    const parsed = parseAnnouncement({
      text: content,
      sourceTimestamp: message.createdAt,
      organizerTimezone: auth.timezone,
    });

    // Never invent times. If the parser could not find a usable title/date,
    // or flagged ambiguity, the event is created as needs_review; otherwise it
    // is unconfirmed (still requires explicit human confirmation downstream).
    const confirmationStatus: Database['public']['Enums']['confirmation_status'] =
      parsed.needsReview ? 'needs_review' : 'unconfirmed';

    const title = parsed.candidate.title ?? 'Untitled Discord announcement';
    const eventRow: EventInsert = {
      organizer_id: auth.organizerId,
      title,
      event_type: 'other',
      event_status: 'scheduled',
      confirmation_status: confirmationStatus,
      timezone: parsed.candidate.timezone ?? auth.timezone,
      source_connection_id: auth.connection.id,
      source_external_id: message.id,
      registration_opens_at: parsed.candidate.registrationOpensAt ?? null,
      registration_closes_at: parsed.candidate.registrationClosesAt ?? null,
      check_in_at: parsed.candidate.checkInAt ?? null,
      stream_starts_at: parsed.candidate.streamStartsAt ?? null,
      match_starts_at: parsed.candidate.matchStartsAt ?? null,
      registration_url: parsed.candidate.registrationUrl ?? null,
      stream_url: parsed.candidate.streamUrl ?? null,
    };

    const { data: inserted, error: insertError } = await db
      .from('events')
      .insert(eventRow)
      .select('id')
      .single();
    if (insertError || !inserted) {
      await recordHealth(db, logger, {
        sourceConnectionId: auth.connection.id,
        status: 'error',
        detail: `event insert failed: ${insertError?.message ?? 'unknown'}`,
      });
      return 'ignored';
    }

    // Record provenance (dedup key for future messages). Store only a parse
    // summary in `raw` — never the full message body beyond what the parser
    // extracted — plus flags useful for review.
    const sourceRow: EventSourceInsert = {
      event_id: inserted.id,
      source_connection_id: auth.connection.id,
      external_message_id: message.id,
      content_hash: contentHash,
      original_url:
        message.guildId != null
          ? `https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id}`
          : null,
      source_published_at: message.createdAt.toISOString(),
      raw: {
        candidate: parsed.candidate,
        errors: parsed.errors,
        ambiguities: parsed.ambiguities,
        needsReview: parsed.needsReview,
      } as unknown as Database['public']['Tables']['event_sources']['Insert']['raw'],
    };
    const { error: sourceError } = await db.from('event_sources').insert(sourceRow);
    if (sourceError) {
      logger.warn({ err: sourceError.message }, 'event_sources insert failed');
    }

    await recordHealth(db, logger, {
      sourceConnectionId: auth.connection.id,
      status: parsed.needsReview ? 'degraded' : 'active',
      detail: parsed.needsReview
        ? `created needs_review event (${parsed.ambiguities.length} ambiguities)`
        : 'created unconfirmed event',
    });

    logger.info(
      {
        messageId: message.id,
        channelId: message.channelId,
        eventId: inserted.id,
        confirmationStatus,
      },
      'ingested discord announcement',
    );
    return 'created';
  }

  async function start(): Promise<void> {
    let authorizations = await loadAuthorizations();
    logger.info({ authorizedChannels: authorizations.size }, 'discord authorizations loaded');

    discord.once(Events.ClientReady, (ready) => {
      logger.info({ user: ready.user.tag }, 'discord bot connected');
    });

    discord.on(Events.MessageCreate, (message) => {
      void handleMessage(message, authorizations).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error({ messageId: message.id, err: msg }, 'failed to handle message');
      });
    });

    // discord.js reconnects automatically; we log disconnects for visibility.
    discord.on(Events.ShardDisconnect, (event, shardId) => {
      logger.warn({ shardId, code: event.code }, 'discord shard disconnected — awaiting reconnect');
    });
    discord.on(Events.ShardReconnecting, (shardId) => {
      logger.info({ shardId }, 'discord shard reconnecting');
    });
    discord.on(Events.ShardResume, (shardId) => {
      logger.info({ shardId }, 'discord shard resumed');
    });
    discord.on(Events.Error, (err) => {
      logger.error({ err: err.message }, 'discord client error');
    });

    // Refresh authorizations periodically so newly-registered connections are
    // picked up without a restart.
    const refreshTimer = setInterval(() => {
      loadAuthorizations()
        .then((next) => {
          authorizations = next;
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          logger.warn({ err: msg }, 'failed to refresh authorizations');
        });
    }, 5 * 60 * 1000);
    refreshTimer.unref?.();

    await discord.login(config.DISCORD_BOT_TOKEN);
  }

  async function stop(): Promise<void> {
    try {
      await discord.destroy();
    } finally {
      logger.info('discord bot stopped');
    }
  }

  return { loadAuthorizations, handleMessage, start, stop };
}

async function main(): Promise<void> {
  const config = getConfig();
  const logger = pino({ level: config.LOG_LEVEL, name: COMPONENT });

  if (!hasDiscord(config)) {
    logger.warn(
      'DISCORD_BOT_TOKEN is not configured — the Discord bot requires it. ' +
        'Exiting cleanly (set the token to enable Discord ingestion).',
    );
    process.exit(0);
  }
  if (!config.SUPABASE_SERVICE_ROLE_KEY) {
    logger.warn(
      'SUPABASE_SERVICE_ROLE_KEY is not configured — the Discord bot needs it to persist ' +
        'ingested events. Exiting cleanly.',
    );
    process.exit(0);
  }

  const bot = createDiscordBot({ config, logger });
  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info({ signal }, 'received shutdown signal');
    bot
      .stop()
      .then(() => process.exit(0))
      .catch((err: unknown) => {
        logger.error({ err: err instanceof Error ? err.message : String(err) }, 'shutdown error');
        process.exit(1);
      });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  try {
    await bot.start();
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      'failed to start discord bot',
    );
    process.exit(1);
  }
}

function isEntrypoint(): boolean {
  const entry = process.argv[1];
  return typeof entry === 'string' && /discord-bot\.(ts|js)$/.test(entry.replace(/\\/g, '/'));
}

if (isEntrypoint()) {
  void main();
}
