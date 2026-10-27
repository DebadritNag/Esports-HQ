/**
 * Email provider shell (SMTP via nodemailer).
 *
 * Builds a reusable transport from SMTP config. When SMTP is not configured it
 * reports `isAvailable() === false` and every send resolves to `skipped`
 * (typed-unavailable) rather than throwing. The recipient address is carried
 * on the target's `secret` and is never logged.
 */

import nodemailer, { type Transporter } from 'nodemailer';
import { getConfig, hasEmail, type AppConfig } from '../../config/index.js';
import type {
  DeliveryTarget,
  NotificationChannel,
  NotificationPayload,
  NotificationProvider,
  ProviderResult,
} from './types.js';

/** Resolve the recipient email: subscription endpoint, else secret string. */
function resolveRecipient(target: DeliveryTarget): string | null {
  if (target.endpoint && target.endpoint.includes('@')) {
    return target.endpoint;
  }
  if (typeof target.secret === 'string' && target.secret.includes('@')) {
    return target.secret;
  }
  return null;
}

export class EmailProvider implements NotificationProvider {
  public readonly name = 'email';
  public readonly channel: NotificationChannel = 'email';

  private readonly config: AppConfig;
  private transporter: Transporter | null = null;

  constructor(config: AppConfig = getConfig()) {
    this.config = config;
    if (hasEmail(config)) {
      this.transporter = nodemailer.createTransport({
        host: config.SMTP_HOST as string,
        port: config.SMTP_PORT ?? 587,
        secure: (config.SMTP_PORT ?? 587) === 465,
        auth:
          config.SMTP_USER && config.SMTP_PASSWORD
            ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD }
            : undefined,
      });
    }
  }

  isAvailable(): boolean {
    return this.transporter !== null;
  }

  async send(
    target: DeliveryTarget,
    payload: NotificationPayload,
  ): Promise<ProviderResult> {
    if (!this.transporter) {
      return {
        status: 'skipped',
        errorCategory: 'unavailable',
        errorDetail: 'Email is not configured (missing SMTP settings).',
      };
    }

    const to = resolveRecipient(target);
    if (!to) {
      return {
        status: 'skipped',
        errorCategory: 'invalid_recipient',
        errorDetail: 'No deliverable email address on the subscription.',
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.config.EMAIL_FROM,
        to,
        subject: payload.title,
        text: payload.url ? `${payload.body}\n\n${payload.url}` : payload.body,
      });
      return {
        status: 'sent',
        providerReference: typeof info.messageId === 'string' ? info.messageId : undefined,
      };
    } catch {
      return {
        status: 'failed',
        errorCategory: 'send_failed',
        errorDetail: 'SMTP send failed.',
      };
    }
  }
}
