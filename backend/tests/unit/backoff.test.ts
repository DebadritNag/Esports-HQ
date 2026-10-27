import { describe, it, expect } from 'vitest';
import { cappedDelay, computeBackoff } from '../../src/utils/backoff.js';

describe('backoff', () => {
  it('grows exponentially (no jitter) and caps at maxMs', () => {
    const opts = { baseMs: 1000, factor: 2, maxMs: 30000, jitter: 'none' as const };
    expect(computeBackoff(1, opts)).toBe(1000);
    expect(computeBackoff(2, opts)).toBe(2000);
    expect(computeBackoff(3, opts)).toBe(4000);
    expect(computeBackoff(4, opts)).toBe(8000);
    expect(computeBackoff(5, opts)).toBe(16000);
    // 32000 -> capped to 30000
    expect(computeBackoff(6, opts)).toBe(30000);
    expect(computeBackoff(100, opts)).toBe(30000);
  });

  it('capped delay is monotonically non-decreasing', () => {
    const opts = { baseMs: 500, factor: 2, maxMs: 20000 };
    let previous = 0;
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const current = cappedDelay(attempt, opts);
      expect(current).toBeGreaterThanOrEqual(previous);
      expect(current).toBeLessThanOrEqual(20000);
      previous = current;
    }
  });

  it('full jitter stays within [0, cappedDelay]', () => {
    const opts = { baseMs: 1000, factor: 2, maxMs: 30000, jitter: 'full' as const };
    for (let attempt = 1; attempt <= 8; attempt += 1) {
      const cap = cappedDelay(attempt, opts);
      for (let i = 0; i < 50; i += 1) {
        const value = computeBackoff(attempt, opts);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(cap);
      }
    }
  });

  it('uses the injected random source deterministically', () => {
    const opts = {
      baseMs: 1000,
      factor: 2,
      maxMs: 30000,
      jitter: 'full' as const,
      random: () => 0.5,
    };
    // attempt 3 cap = 4000, * 0.5 = 2000
    expect(computeBackoff(3, opts)).toBe(2000);
  });

  it('treats attempts < 1 as attempt 1', () => {
    const opts = { baseMs: 1000, factor: 2, maxMs: 30000, jitter: 'none' as const };
    expect(computeBackoff(0, opts)).toBe(1000);
    expect(computeBackoff(-5, opts)).toBe(1000);
  });
});
