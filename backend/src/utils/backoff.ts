/**
 * Exponential backoff with full jitter and a hard cap.
 *
 * The base delay grows as `baseMs * factor^(attempt-1)` (attempt is 1-based),
 * is clamped to `maxMs`, then jitter is applied. With `jitter: 'full'` the
 * returned value is uniformly random in [0, cappedDelay]; with `jitter: 'none'`
 * the exact capped delay is returned.
 */

export interface BackoffOptions {
  /** Base delay in milliseconds (attempt 1). Default 1000. */
  baseMs?: number;
  /** Growth factor per attempt. Default 2. */
  factor?: number;
  /** Maximum delay in milliseconds after growth. Default 30000. */
  maxMs?: number;
  /** Jitter strategy. Default 'full'. */
  jitter?: 'full' | 'none';
  /** Random source (0..1); injectable for deterministic tests. */
  random?: () => number;
}

const DEFAULTS = {
  baseMs: 1000,
  factor: 2,
  maxMs: 30000,
  jitter: 'full' as const,
};

/** The un-jittered, capped delay for a 1-based attempt number. */
export function cappedDelay(attempt: number, options: BackoffOptions = {}): number {
  const baseMs = options.baseMs ?? DEFAULTS.baseMs;
  const factor = options.factor ?? DEFAULTS.factor;
  const maxMs = options.maxMs ?? DEFAULTS.maxMs;
  const safeAttempt = Math.max(1, Math.floor(attempt));
  const raw = baseMs * factor ** (safeAttempt - 1);
  return Math.min(maxMs, raw);
}

/**
 * Compute the delay (ms) before the given 1-based attempt. Monotonic in its
 * capped component, never exceeds `maxMs`, and applies jitter.
 */
export function computeBackoff(attempt: number, options: BackoffOptions = {}): number {
  const jitter = options.jitter ?? DEFAULTS.jitter;
  const random = options.random ?? Math.random;
  const delay = cappedDelay(attempt, options);
  if (jitter === 'none') {
    return delay;
  }
  // Full jitter: uniform in [0, delay].
  return Math.floor(random() * delay);
}
