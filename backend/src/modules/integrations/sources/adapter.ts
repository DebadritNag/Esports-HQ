/**
 * Source adapter interface.
 *
 * A source adapter abstracts a single ingestion channel (ical/rss, manual,
 * discord, website, api) behind a uniform contract. Adapters are pure with
 * respect to the database — they fetch and normalize external announcements
 * into {@link SourceEventCandidate}s; persistence happens in the service layer.
 *
 * COMPLIANCE: adapters must respect the remote source's Terms of Service and
 * robots.txt. The `website` and `api` adapters deliberately return a typed
 * `unsupported` result rather than scraping arbitrary sites — there is no
 * universal scraper here, and no adapter fabricates success.
 */

import type { AnnouncementCandidate } from './announcement-parser.js';

export type SourceType =
  | 'discord'
  | 'website'
  | 'api'
  | 'rss'
  | 'ical'
  | 'manual';

/** A normalized candidate event discovered from a source. */
export interface SourceEventCandidate {
  /** Stable external identity used for dedup (e.g. ICS UID, message id). */
  externalId: string;
  /** Parsed candidate fields (same shape the announcement parser produces). */
  candidate: AnnouncementCandidate;
  /** Raw payload retained for audit / re-parsing. */
  raw: unknown;
  /** Content hash for change detection. */
  contentHash: string;
  /** When the source published this item, if known (ISO-8601). */
  sourcePublishedAt?: string;
  /** Original URL of the item, if known. */
  originalUrl?: string;
}

/** Result discriminant used across adapter operations. */
export type AdapterResult<T> =
  | { ok: true; value: T }
  | UnsupportedResult
  | AdapterErrorResult;

/**
 * A typed "this source type is not supported" result. Returned by the website
 * and api adapters. It is NOT an error and NOT a fake success — callers must
 * surface it as an explicit unsupported state.
 */
export interface UnsupportedResult {
  ok: false;
  kind: 'unsupported';
  /** Human-readable reason (e.g. "requires authorized access / not implemented"). */
  reason: string;
}

/** A recoverable adapter error (network, parse, auth). */
export interface AdapterErrorResult {
  ok: false;
  kind: 'error';
  category: string;
  message: string;
}

/** Input needed to run an adapter against a configured connection. */
export interface AdapterContext {
  /** The connection's source URL, when applicable. */
  sourceUrl?: string;
  /** Free-form connection config (never contains secrets — those live in Vault). */
  config?: Record<string, unknown>;
  /** Organizer timezone used to interpret wall-clock times. */
  organizerTimezone?: string;
  /** Raw payload for adapters (e.g. manual/ICS) that receive content directly. */
  payload?: string;
}

/** Health snapshot reported by an adapter. */
export interface AdapterHealth {
  lastSuccessAt?: string;
  lastError?: string;
}

/**
 * The uniform source adapter contract. Implementations are expected to be
 * side-effect free apart from outbound reads to the external source.
 */
export interface SourceAdapter {
  readonly sourceType: SourceType;

  /** Validate the context (URL/config) before doing any network work. */
  validate(context: AdapterContext): AdapterResult<true>;

  /** Discover the resource(s) this connection points at (feeds, endpoints). */
  discover(context: AdapterContext): Promise<AdapterResult<string[]>>;

  /** Fetch the raw payload (feed body, ICS text, message batch). */
  fetch(context: AdapterContext): Promise<AdapterResult<string>>;

  /** Parse a raw payload into normalized candidates. */
  parse(raw: string, context: AdapterContext): Promise<AdapterResult<SourceEventCandidate[]>>;

  /** Deduplicate candidates against a set of already-seen external ids. */
  dedup(
    candidates: SourceEventCandidate[],
    seenExternalIds: ReadonlySet<string>,
  ): SourceEventCandidate[];

  /**
   * Detect which candidates represent a change versus known content hashes.
   * Returns the subset whose content hash differs (or is new).
   */
  detectChanges(
    candidates: SourceEventCandidate[],
    knownHashes: ReadonlyMap<string, string>,
  ): SourceEventCandidate[];

  /** Report the last successful run timestamp, if tracked. */
  lastSuccess(): AdapterHealth;

  /** Record an error for health reporting. */
  reportError(category: string, message: string): void;

  /** Whether a failed operation should be retried for the given attempt. */
  retry(attempt: number, maxAttempts: number): boolean;
}

/** Build a typed unsupported result. */
export function unsupported(reason: string): UnsupportedResult {
  return { ok: false, kind: 'unsupported', reason };
}

/** Build a typed adapter error result. */
export function adapterError(category: string, message: string): AdapterErrorResult {
  return { ok: false, kind: 'error', category, message };
}

/** Build a typed success result. */
export function ok<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}
