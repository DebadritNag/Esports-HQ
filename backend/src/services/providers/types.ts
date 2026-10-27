/**
 * Shared types for notification providers. A provider is a channel-specific
 * transport (web-push, email, or the in-memory fake) that attempts to deliver a
 * single notification and reports a normalized outcome.
 */

import type { Database } from '../../types/database.types.js';

export type NotificationChannel = Database['public']['Enums']['notification_channel'];
export type DeliveryStatus = Database['public']['Enums']['delivery_status'];

/** The payload delivered to a user for a reminder. */
export interface NotificationPayload {
  title: string;
  body: string;
  /** Optional deep-link URL (e.g. the event page). */
  url?: string;
  /** Arbitrary, non-secret extra data passed to the client. */
  data?: Record<string, unknown>;
}

/**
 * A single delivery target. `secret` carries channel-specific credentials
 * (web-push subscription keys / email address). It is used ONLY inside a
 * provider and must never be logged or returned to callers.
 */
export interface DeliveryTarget {
  subscriptionId: string;
  userId: string;
  channel: NotificationChannel;
  endpoint: string;
  /** Channel secret (web-push `keys` object, etc.). Never surfaced. */
  secret?: unknown;
}

/** Normalized result of a single delivery attempt. */
export interface ProviderResult {
  status: DeliveryStatus;
  /** Provider message id / reference, when the transport returns one. */
  providerReference?: string;
  /** Coarse, non-secret failure category (e.g. `unavailable`, `expired`). */
  errorCategory?: string;
  /** Short, non-secret failure detail. */
  errorDetail?: string;
}

/** A notification provider for one or more channels. */
export interface NotificationProvider {
  readonly name: string;
  /** Channel this provider handles. */
  readonly channel: NotificationChannel;
  /** True when the provider is configured and able to attempt sends. */
  isAvailable(): boolean;
  /** Attempt to deliver a payload to a target; always resolves (never throws). */
  send(target: DeliveryTarget, payload: NotificationPayload): Promise<ProviderResult>;
}
