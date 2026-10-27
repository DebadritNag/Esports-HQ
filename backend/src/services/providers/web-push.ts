/**
 * Web Push provider shell.
 *
 * Wraps the `web-push` library using VAPID credentials from config. When VAPID
 * keys are not configured it reports `isAvailable() === false` and every send
 * resolves to a `skipped` result (typed-unavailable) rather than throwing —
 * the dispatcher logs the skip and moves on.
 *
 * The subscription `secret` (the `keys` object with p256dh/auth) is used ONLY
 * here to build the push request and is never logged or returned.
 */

import webpush from 'web-push';
import { getConfig, hasWebPush, type AppConfig } from '../../config/index.js';
import type {
  DeliveryTarget,
  NotificationChannel,
  NotificationPayload,
  NotificationProvider,
  ProviderResult,
} from './types.js';

interface WebPushKeys {
  p256dh: string;
  auth: string;
}

/** Narrow unknown secret into the web-push keys shape. */
function asKeys(secret: unknown): WebPushKeys | null {
  if (
    secret &&
    typeof secret === 'object' &&
    typeof (secret as Record<string, unknown>).p256dh === 'string' &&
    typeof (secret as Record<string, unknown>).auth === 'string'
  ) {
    return secret as WebPushKeys;
  }
  return null;
}

export class WebPushProvider implements NotificationProvider {
  public readonly name = 'web-push';
  public readonly channel: NotificationChannel = 'web_push';

  private readonly config: AppConfig;
  private vapidConfigured = false;

  constructor(config: AppConfig = getConfig()) {
    this.config = config;
    if (hasWebPush(config)) {
      webpush.setVapidDetails(
        config.WEB_PUSH_SUBJECT as string,
        config.WEB_PUSH_PUBLIC_KEY as string,
        config.WEB_PUSH_PRIVATE_KEY as string,
      );
      this.vapidConfigured = true;
    }
  }

  isAvailable(): boolean {
    return this.vapidConfigured;
  }

  async send(
    target: DeliveryTarget,
    payload: NotificationPayload,
  ): Promise<ProviderResult> {
    if (!this.vapidConfigured) {
      return {
        status: 'skipped',
        errorCategory: 'unavailable',
        errorDetail: 'Web push is not configured (missing VAPID keys).',
      };
    }

    const keys = asKeys(target.secret);
    if (!keys) {
      return {
        status: 'skipped',
        errorCategory: 'invalid_subscription',
        errorDetail: 'Subscription keys are missing or malformed.',
      };
    }

    try {
      const result = await webpush.sendNotification(
        { endpoint: target.endpoint, keys },
        JSON.stringify(payload),
      );
      return {
        status: 'sent',
        providerReference: result.headers?.location ?? undefined,
      };
    } catch (err) {
      const statusCode =
        err && typeof err === 'object' && 'statusCode' in err
          ? Number((err as { statusCode: unknown }).statusCode)
          : undefined;
      // 404/410 => subscription gone; treat as a (non-fatal) failure category.
      const category =
        statusCode === 404 || statusCode === 410 ? 'subscription_expired' : 'send_failed';
      return {
        status: 'failed',
        errorCategory: category,
        errorDetail: statusCode ? `web-push status ${statusCode}` : 'web-push send failed',
      };
    }
  }
}
