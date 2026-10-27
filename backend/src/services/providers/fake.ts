/**
 * In-memory fake notification provider.
 *
 * Records every send in memory instead of performing real network delivery.
 * Gated by `USE_FAKE_NOTIFICATIONS` (never used in production). Tests use it to
 * assert dispatch behavior and delivery-row shapes without secrets or sends.
 *
 * It deliberately does NOT store the target's `secret` — only non-sensitive
 * fields — so even the test double cannot leak subscription keys.
 */

import type {
  DeliveryTarget,
  NotificationChannel,
  NotificationPayload,
  NotificationProvider,
  ProviderResult,
} from './types.js';

/** A recorded send (secret-free snapshot of what was dispatched). */
export interface RecordedSend {
  subscriptionId: string;
  userId: string;
  channel: NotificationChannel;
  endpoint: string;
  payload: NotificationPayload;
  attemptedAt: string;
}

export class FakeNotificationProvider implements NotificationProvider {
  public readonly name = 'fake';
  public readonly channel: NotificationChannel;

  private readonly records: RecordedSend[] = [];

  constructor(channel: NotificationChannel = 'web_push') {
    this.channel = channel;
  }

  isAvailable(): boolean {
    return true;
  }

  async send(
    target: DeliveryTarget,
    payload: NotificationPayload,
  ): Promise<ProviderResult> {
    // Record a secret-free snapshot; never persist target.secret.
    this.records.push({
      subscriptionId: target.subscriptionId,
      userId: target.userId,
      channel: target.channel,
      endpoint: target.endpoint,
      payload,
      attemptedAt: new Date().toISOString(),
    });
    return {
      status: 'sent',
      providerReference: `fake-${this.records.length}`,
    };
  }

  /** All sends recorded so far (read-only copy). */
  getRecords(): readonly RecordedSend[] {
    return [...this.records];
  }

  /** Clear recorded sends (test helper). */
  reset(): void {
    this.records.length = 0;
  }
}
