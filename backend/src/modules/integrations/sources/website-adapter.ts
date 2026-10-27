/**
 * Website source adapter — intentionally UNSUPPORTED.
 *
 * There is deliberately no universal web scraper in this backend. Scraping
 * arbitrary organizer websites would risk violating their Terms of Service and
 * robots.txt, produce brittle extraction, and fabricate low-confidence data.
 * Every operation therefore returns a typed `unsupported` result so callers
 * surface an honest "not implemented" state rather than a fake success.
 *
 * COMPLIANCE: respect robots.txt and site Terms of Service. A real integration
 * would require an organizer-published feed (use the ical/rss adapter) or an
 * authorized API (see api-adapter).
 */

import {
  unsupported,
  type AdapterHealth,
  type AdapterResult,
  type SourceAdapter,
  type SourceEventCandidate,
  type SourceType,
  type UnsupportedResult,
} from './adapter.js';

const REASON =
  'Website scraping is not implemented: it is not supported without an organizer-published feed (ical/rss) or an authorized API, to respect site Terms of Service and robots.txt.';

export class WebsiteAdapter implements SourceAdapter {
  public readonly sourceType: SourceType = 'website';
  private health: AdapterHealth = {};

  validate(): UnsupportedResult {
    return unsupported(REASON);
  }

  async discover(): Promise<AdapterResult<string[]>> {
    return unsupported(REASON);
  }

  async fetch(): Promise<AdapterResult<string>> {
    return unsupported(REASON);
  }

  async parse(): Promise<AdapterResult<SourceEventCandidate[]>> {
    return unsupported(REASON);
  }

  dedup(candidates: SourceEventCandidate[]): SourceEventCandidate[] {
    return candidates;
  }

  detectChanges(candidates: SourceEventCandidate[]): SourceEventCandidate[] {
    return candidates;
  }

  lastSuccess(): AdapterHealth {
    return this.health;
  }

  reportError(category: string, message: string): void {
    this.health = { ...this.health, lastError: `${category}: ${message}` };
  }

  retry(): boolean {
    return false;
  }
}

export function createWebsiteAdapter(): WebsiteAdapter {
  return new WebsiteAdapter();
}
