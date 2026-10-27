/**
 * Manual source adapter.
 *
 * Wraps the pure {@link parseAnnouncement} parser so operator-pasted
 * announcement text flows through the same adapter contract as automated
 * feeds. No network access — the raw text is provided directly on the context
 * payload. The parser never auto-confirms; ambiguous results surface via the
 * candidate's own review flags (handled by the importing service).
 */

import { createHash } from 'node:crypto';
import {
  adapterError,
  ok,
  type AdapterContext,
  type AdapterHealth,
  type AdapterResult,
  type SourceAdapter,
  type SourceEventCandidate,
  type SourceType,
} from './adapter.js';
import { parseAnnouncement } from './announcement-parser.js';

export class ManualAdapter implements SourceAdapter {
  public readonly sourceType: SourceType = 'manual';
  private health: AdapterHealth = {};

  validate(context: AdapterContext): AdapterResult<true> {
    if (typeof context.payload !== 'string' || context.payload.trim().length === 0) {
      return adapterError('invalid_config', 'Manual import requires announcement text.');
    }
    return ok(true);
  }

  async discover(): Promise<AdapterResult<string[]>> {
    // Manual imports have no discoverable resource.
    return ok([]);
  }

  async fetch(context: AdapterContext): Promise<AdapterResult<string>> {
    if (typeof context.payload !== 'string') {
      return adapterError('invalid_config', 'No announcement text provided.');
    }
    return ok(context.payload);
  }

  async parse(
    raw: string,
    context: AdapterContext,
  ): Promise<AdapterResult<SourceEventCandidate[]>> {
    const result = parseAnnouncement({
      text: raw,
      organizerTimezone: context.organizerTimezone,
      sourceUrl: context.sourceUrl,
    });

    const serialized = JSON.stringify(result.candidate);
    const contentHash = createHash('sha256').update(serialized).digest('hex');
    const externalId = createHash('sha256').update(raw).digest('hex');

    const candidate: SourceEventCandidate = {
      externalId,
      candidate: result.candidate,
      raw: { text: raw, errors: result.errors, ambiguities: result.ambiguities, needsReview: result.needsReview },
      contentHash,
      originalUrl: context.sourceUrl,
    };
    return ok([candidate]);
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

  retry(): boolean {
    // Manual imports are not retried automatically.
    return false;
  }
}

export function createManualAdapter(): ManualAdapter {
  return new ManualAdapter();
}
