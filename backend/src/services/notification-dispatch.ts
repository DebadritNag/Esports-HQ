/**
 * Notification dispatch.
 *
 * Given a reminder (user + payload + optional reminder_job_id), this service:
 *  1. loads the user's ACTIVE notification subscriptions (service-role read),
 *  2. picks a provider per channel — the in-memory fake when
 *     `USE_FAKE_NOTIFICATIONS` is set, otherwise web-push / email,
 *  3. attempts delivery per subscription, and
 *  4. logs every attempt to `notification_deliveries`
 *     (status sent/failed/skipped + error_category/detail).
 *
 * Security: the subscription `keys` column is read ONLY to build the delivery
 * target's `secret` for the provider. It is never logged, never returned to
 * callers, and never included in the delivery row.
 */

import { getConfig, type AppConfig } from '../config/index.js';
import { AppError } from '../utils/errors.js';
import {
  createServiceClient,
  type TypedSupabaseClient,
} from '../plugins/supabase-clients.js';
import { FakeNotificationProvider } from './providers/fake.js';
import { WebPushProvider } from './providers/web-push.js';
import { EmailProvider } from './providers/email.js';
import type {
  DeliveryTarget,
  NotificationChannel,
  NotificationPayload,
  NotificationProvider,
  ProviderResult,
} from './providers/types.js';
import type { Database } from '../types/database.types.js';

type DeliveryInsert = Database['public']['Tables']['notification_deliveries']['Insert'];

/** A request to dispatch one reminder to a single user. */
export interface DispatchRequest {
  userId: string;
  payload: NotificationPayload;
  /** Optional link back to the reminder_jobs row this delivery fulfills. */
  reminderJobId?: string;
  /** Limit dispatch to a single channel; default dispatches all active ones. */
  channel?: NotificationChannel;
}

/** Per-subscription dispatch outcome (secret-free; safe to return). */
export interface DispatchOutcome {
  subscriptionId: string;
  channel: NotificationChannel;
  status: ProviderResult['status'];
  errorCategory?: string;
  providerReference?: string;
}

export interface DispatchSummary {
  userId: string;
  reminderJobId?: string;
  outcomes: DispatchOutcome[];
}

/** Explicit, injectable provider set (tests pass a fake here). */
export interface ProviderRegistry {
  web_push: NotificationProvider;
  email: NotificationProvider;
}

export interface DispatchDeps {
  client?: TypedSupabaseClient;
  config?: AppConfig;
  providers?: Partial<ProviderRegistry>;
}

/** Build the default provider registry honoring the fake-notifications flag. */
export function buildProviderRegistry(config: AppConfig = getConfig()): ProviderRegistry {
  if (config.USE_FAKE_NOTIFICATIONS) {
    return {
      web_push: new FakeNotificationProvider('web_push'),
      email: new FakeNotificationProvider('email'),
    };
  }
  return {
    web_push: new WebPushProvider(config),
    email: new EmailProvider(config),
  };
}

/** Minimal subscription row shape read for dispatch (keys stay internal). */
interface SubscriptionRow {
  id: string;
  user_id: string;
  channel: NotificationChannel;
  endpoint: string;
  keys: Database['public']['Tables']['notification_subscriptions']['Row']['keys'];
}

/**
 * Dispatch a reminder to all of a user's active subscriptions (optionally
 * filtered to one channel), logging each attempt. Returns a secret-free
 * summary; subscription keys are never included.
 */
export async function dispatchReminder(
  request: DispatchRequest,
  deps: DispatchDeps = {},
): Promise<DispatchSummary> {
  const config = deps.config ?? getConfig();
  const client = deps.client ?? createServiceClient(config);
  const providers: ProviderRegistry = {
    ...buildProviderRegistry(config),
    ...deps.providers,
  };

  let query = client
    .from('notification_subscriptions')
    .select('id, user_id, channel, endpoint, keys')
    .eq('user_id', request.userId)
    .eq('is_active', true);

  if (request.channel) {
    query = query.eq('channel', request.channel);
  }

  const { data, error } = await query;
  if (error) {
    throw AppError.internal('Failed to load notification subscriptions', error);
  }

  const subscriptions = (data ?? []) as SubscriptionRow[];
  const outcomes: DispatchOutcome[] = [];

  for (const sub of subscriptions) {
    const provider = providers[sub.channel];
    // Build the target; `secret` holds keys for provider-internal use only.
    const target: DeliveryTarget = {
      subscriptionId: sub.id,
      userId: sub.user_id,
      channel: sub.channel,
      endpoint: sub.endpoint,
      secret: sub.keys,
    };

    const result: ProviderResult = provider
      ? await provider.send(target, request.payload)
      : {
          status: 'skipped',
          errorCategory: 'unavailable',
          errorDetail: `No provider for channel ${sub.channel}.`,
        };

    // Log the attempt (never include keys / secret).
    const row: DeliveryInsert = {
      user_id: sub.user_id,
      subscription_id: sub.id,
      channel: sub.channel,
      status: result.status,
      reminder_job_id: request.reminderJobId ?? null,
      provider_reference: result.providerReference ?? null,
      error_category: result.errorCategory ?? null,
      error_detail: result.errorDetail ?? null,
    };
    const { error: logError } = await client.from('notification_deliveries').insert(row);
    if (logError) {
      throw AppError.internal('Failed to log notification delivery', logError);
    }

    outcomes.push({
      subscriptionId: sub.id,
      channel: sub.channel,
      status: result.status,
      errorCategory: result.errorCategory,
      providerReference: result.providerReference,
    });
  }

  const summary: DispatchSummary = { userId: request.userId, outcomes };
  if (request.reminderJobId !== undefined) {
    summary.reminderJobId = request.reminderJobId;
  }
  return summary;
}
