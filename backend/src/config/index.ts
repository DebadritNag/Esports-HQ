import { z } from 'zod';

/**
 * Centralized, Zod-validated environment configuration.
 *
 * Splits variables into three tiers:
 *  - always required: the HTTP API cannot boot without these.
 *  - worker-only: required by the reminder/recurrence workers and privileged
 *    paths (service-role). Optional for the plain API process so it can run
 *    without the service-role secret.
 *  - optional: web-push / email / discord / rate-limit / feature flags.
 *
 * On failure we throw an AppError-free, NON-secret error that lists only the
 * names of the offending variables (never their values).
 */

const trimmedString = z.string().trim();

const envSchema = z.object({
  // Runtime ------------------------------------------------------------------
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: trimmedString.default('0.0.0.0'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  // Supabase (always required) ----------------------------------------------
  SUPABASE_URL: trimmedString.url(),
  SUPABASE_ANON_KEY: trimmedString.min(1),

  // Supabase service-role (worker-only; optional for the plain API) ----------
  SUPABASE_SERVICE_ROLE_KEY: trimmedString.min(1).optional(),

  // Web Push (VAPID) ---------------------------------------------------------
  WEB_PUSH_PUBLIC_KEY: trimmedString.optional(),
  WEB_PUSH_PRIVATE_KEY: trimmedString.optional(),
  WEB_PUSH_SUBJECT: trimmedString.optional(),

  // Email --------------------------------------------------------------------
  EMAIL_PROVIDER: z.enum(['smtp']).optional(),
  EMAIL_FROM: trimmedString.optional(),
  SMTP_HOST: trimmedString.optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: trimmedString.optional(),
  SMTP_PASSWORD: trimmedString.optional(),

  // Discord ------------------------------------------------------------------
  DISCORD_BOT_TOKEN: trimmedString.optional(),
  DISCORD_CLIENT_ID: trimmedString.optional(),
  DISCORD_CLIENT_SECRET: trimmedString.optional(),

  // Worker / scheduler -------------------------------------------------------
  RECURRENCE_HORIZON_DAYS: z.coerce.number().int().positive().default(30),
  REMINDER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(30000),
  REMINDER_BATCH_SIZE: z.coerce.number().int().positive().default(50),
  INTERNAL_WORKER_SECRET: trimmedString.optional(),

  // Rate limiting ------------------------------------------------------------
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW: trimmedString.default('1 minute'),

  // Keep-alive pinger (standalone scripts/keep-alive.ts) ---------------------
  // Full URL of the readiness endpoint to ping, e.g.
  //   https://free-fire-esports-hq.onrender.com/ready
  KEEP_ALIVE_URL: trimmedString.url().optional(),
  // How often the standalone pinger fires (ms). Default 10 minutes.
  KEEP_ALIVE_INTERVAL_MS: z.coerce.number().int().positive().default(600000),

  // Feature flags ------------------------------------------------------------
  USE_FAKE_NOTIFICATIONS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),

  // Defaults -----------------------------------------------------------------
  DEFAULT_TIMEZONE: trimmedString.default('Asia/Kolkata'),
});

export type AppConfig = z.infer<typeof envSchema>;

/**
 * Thrown when environment validation fails. Message lists only variable names.
 */
export class ConfigValidationError extends Error {
  public readonly missing: string[];

  constructor(missing: string[]) {
    super(
      `Invalid or missing environment variables: ${missing.join(', ')}. ` +
        'See .env.example for the expected names.',
    );
    this.name = 'ConfigValidationError';
    this.missing = missing;
  }
}

/**
 * Validate the given environment source (defaults to process.env).
 * Throws ConfigValidationError listing only variable names on failure.
 */
export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const names = new Set<string>();
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (typeof key === 'string') {
        names.add(key);
      }
    }
    throw new ConfigValidationError([...names].sort());
  }
  return result.data;
}

let cached: AppConfig | undefined;

/**
 * Lazily load and cache the validated configuration.
 */
export function getConfig(): AppConfig {
  if (!cached) {
    cached = loadConfig();
  }
  return cached;
}

/** Reset the cached config (test helper). */
export function resetConfigCache(): void {
  cached = undefined;
}

/** True when a Supabase service-role key is available for privileged paths. */
export function hasServiceRole(config: AppConfig = getConfig()): boolean {
  return typeof config.SUPABASE_SERVICE_ROLE_KEY === 'string' && config.SUPABASE_SERVICE_ROLE_KEY.length > 0;
}

/** True when web-push (VAPID) is fully configured. */
export function hasWebPush(config: AppConfig = getConfig()): boolean {
  return Boolean(
    config.WEB_PUSH_PUBLIC_KEY && config.WEB_PUSH_PRIVATE_KEY && config.WEB_PUSH_SUBJECT,
  );
}

/** True when SMTP email delivery is fully configured. */
export function hasEmail(config: AppConfig = getConfig()): boolean {
  return Boolean(config.SMTP_HOST && config.EMAIL_FROM);
}

/** True when the Discord bot token is present. */
export function hasDiscord(config: AppConfig = getConfig()): boolean {
  return Boolean(config.DISCORD_BOT_TOKEN);
}

export function isProduction(config: AppConfig = getConfig()): boolean {
  return config.NODE_ENV === 'production';
}
