import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TIMEZONE,
  combineDateAndTime,
  formatInTimeZone,
  getZonedParts,
  isValidTimeZone,
  resolveTimeZone,
} from '../../src/utils/timezone.js';

describe('timezone', () => {
  it('defaults to Asia/Kolkata', () => {
    expect(DEFAULT_TIMEZONE).toBe('Asia/Kolkata');
    expect(resolveTimeZone(undefined)).toBe('Asia/Kolkata');
    expect(resolveTimeZone('Not/AZone')).toBe('Asia/Kolkata');
    expect(resolveTimeZone('America/New_York')).toBe('America/New_York');
  });

  it('validates IANA zones', () => {
    expect(isValidTimeZone('Asia/Kolkata')).toBe(true);
    expect(isValidTimeZone('Europe/London')).toBe(true);
    expect(isValidTimeZone('Mars/Phobos')).toBe(false);
  });

  it('formats an instant in Asia/Kolkata (UTC+5:30)', () => {
    // 2026-01-15T00:00:00Z -> 05:30 IST same day.
    const date = new Date('2026-01-15T00:00:00.000Z');
    const parts = getZonedParts(date, 'Asia/Kolkata');
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(1);
    expect(parts.day).toBe(15);
    expect(parts.hour).toBe(5);
    expect(parts.minute).toBe(30);

    const formatted = formatInTimeZone(date, 'Asia/Kolkata');
    expect(formatted).toContain('15/01/2026');
    expect(formatted).toContain('05:30');
  });

  it('combines a date and wall-clock time in a timezone to a UTC instant', () => {
    // 18:00 IST on 2026-03-01 == 12:30 UTC.
    const instant = combineDateAndTime('2026-03-01', '18:00', 'Asia/Kolkata');
    expect(instant.toISOString()).toBe('2026-03-01T12:30:00.000Z');
  });

  it('combines using UTC when requested', () => {
    const instant = combineDateAndTime('2026-03-01', '12:30:00', 'UTC');
    expect(instant.toISOString()).toBe('2026-03-01T12:30:00.000Z');
  });

  it('rejects malformed date/time input', () => {
    expect(() => combineDateAndTime('2026/03/01', '18:00')).toThrow();
    expect(() => combineDateAndTime('2026-03-01', '25:00')).toThrow();
  });
});
