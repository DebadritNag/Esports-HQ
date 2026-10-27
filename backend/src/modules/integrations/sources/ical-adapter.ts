/**
 * iCal / RSS source adapter (real implementation).
 *
 * Parses ICS calendar feeds via `node-ical`. The same adapter serves the
 * `ical` and `rss` source types in practice because feed items are normalized
 * into the same {@link SourceEventCandidate} shape; RSS feeds that expose
 * calendar data are expected to be exposed as ICS by the organizer.
 *
 * COMPLIANCE: fetching a feed over HTTP is an authorized, published-data
 * operation (the organizer links the feed deliberately). We do not scrape HTML
 * pages here and we honor the feed's own URL only.
 */

import { createHash } from 'node:crypto';
import nodeIcal, { type VEvent } from 'node-ical';
import {
  adapterError,
  ok,
  unsupported,
  type AdapterContext,
  type AdapterHealth,
  type AdapterResult,
  type SourceAdapter,
  type SourceEventCandidate,
  type SourceType,
} from './adapter.js';
import type { AnnouncementCandidate } from './announcement-parser.js';

export class IcalAdapter implements SourceAdapter {
  public readonly sourceType: SourceType;
  private health: AdapterHealth = {};

  constructor(sourceType: 'ical' | 'rss' = 'ical') {
    this.sourceType = sourceType;
  }

  validate(context: AdapterContext): AdapterResult<true> {
    const hasUrl = typeof context.sourceUrl === 'string' && context.sourceUrl.length > 0;
    const hasPayload = typeof context.payload === 'string' && context.payload.length > 0;
    if (!hasUrl && !hasPayload) {
      return adapterError('invalid_config', 'An ICS source URL or inline payload is required.');
    }
    if (hasUrl) {
      try {
        const url = new URL(context.sourceUrl as string);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          return adapterError('invalid_config', 'Only http(s) feed URLs are supported.');
        }
      } catch {
        return adapterError('invalid_config', 'The feed URL is malformed.');
      }
    }
    return ok(true);
  }

  async discover(context: AdapterContext): Promise<AdapterResult<string[]>> {
    if (context.sourceUrl) {
      return ok([context.sourceUrl]);
    }
    return ok([]);
  }

  async fetch(context: AdapterContext): Promise<AdapterResult<string>> {
    if (context.payload) {
      return ok(context.payload);
    }
    if (!context.sourceUrl) {
      return adapterError('invalid_config', 'No feed URL or payload to fetch.');
    }
    try {
      const response = await fetch(context.sourceUrl);
      if (!response.ok) {
        return adapterError('http_error', `Feed responded with HTTP ${response.status}.`);
      }
      return ok(await response.text());
    } catch (error) {
      return adapterError('network_error', toMessage(error));
    }
  }

  async parse(
    raw: string,
    context: AdapterContext,
  ): Promise<AdapterResult<SourceEventCandidate[]>> {
    let parsed: Record<string, unknown>;
    try {
      parsed = nodeIcal.sync.parseICS(raw) as Record<string, unknown>;
    } catch (error) {
      return adapterError('parse_error', toMessage(error));
    }

    const candidates: SourceEventCandidate[] = [];
    for (const component of Object.values(parsed)) {
      const vevent = component as Partial<VEvent>;
      if (vevent.type !== 'VEVENT') {
        continue;
      }
      candidates.push(this.toCandidate(vevent, context));
    }
    return ok(candidates);
  }

  dedup(
    candidates: SourceEventCandidate[],
    seenExternalIds: ReadonlySet<string>,
  ): SourceEventCandidate[] {
    return candidates.filter((c) => !seenExternalIds.has(c.externalId));
  }

  detectChanges(
    candidates: SourceEventCandidate[],
    knownHashes: ReadonlyMap<string, string>,
  ): SourceEventCandidate[] {
    return candidates.filter((c) => knownHashes.get(c.externalId) !== c.contentHash);
  }

  lastSuccess(): AdapterHealth {
    return this.health;
  }

  reportError(category: string, message: string): void {
    this.health = { ...this.health, lastError: `${category}: ${message}` };
  }

  retry(attempt: number, maxAttempts: number): boolean {
    return attempt < maxAttempts;
  }

  private toCandidate(vevent: Partial<VEvent>, context: AdapterContext): SourceEventCandidate {
    const start = vevent.start instanceof Date ? vevent.start : undefined;
    const end = vevent.end instanceof Date ? vevent.end : undefined;
    const uid = typeof vevent.uid === 'string' && vevent.uid.length > 0
      ? vevent.uid
      : createHash('sha256').update(JSON.stringify(vevent)).digest('hex');

    const candidate: AnnouncementCandidate = {
      title: typeof vevent.summary === 'string' ? vevent.summary : undefined,
      eventDate: start ? start.toISOString() : undefined,
      matchStartsAt: start ? start.toISOString() : undefined,
      streamStartsAt: end ? end.toISOString() : undefined,
      timezone: context.organizerTimezone,
      sourceUrl: typeof vevent.url === 'string' ? vevent.url : context.sourceUrl,
    };

    const serialized = JSON.stringify({
      uid,
      summary: vevent.summary,
      start: start?.toISOString(),
      end: end?.toISOString(),
      description: vevent.description,
      location: vevent.location,
    });

    return {
      externalId: uid,
      candidate,
      raw: serialized,
      contentHash: createHash('sha256').update(serialized).digest('hex'),
      sourcePublishedAt: start ? start.toISOString() : undefined,
      originalUrl: candidate.sourceUrl,
    };
  }
}

/** Factory kept for parity with the unsupported adapters. */
export function createIcalAdapter(sourceType: 'ical' | 'rss' = 'ical'): IcalAdapter {
  return new IcalAdapter(sourceType);
}

// Re-export the typed unsupported helper so callers composing adapters have it.
export { unsupported };

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
