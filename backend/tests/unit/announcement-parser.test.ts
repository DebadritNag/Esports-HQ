import { describe, it, expect } from 'vitest';
import { parseAnnouncement } from '../../src/modules/integrations/sources/announcement-parser.js';

describe('parseAnnouncement', () => {
  it('parses a fully-specified announcement with absolute dates and times', () => {
    const text = [
      'Weekend Clash Cup',
      'Registration opens 2026-03-01 at 18:00',
      'Registration closes 2026-03-05 at 23:00',
      'Check-in 2026-03-07 at 17:45',
      'Stream starts 2026-03-07 at 18:00 https://twitch.tv/freefirehq',
      'Match starts 2026-03-07 at 18:30',
      'Register here: https://example.com/register',
    ].join('\n');

    const result = parseAnnouncement({ text, organizerTimezone: 'Asia/Kolkata' });

    expect(result.needsReview).toBe(false);
    expect(result.errors).toEqual([]);
    expect(result.ambiguities).toEqual([]);
    expect(result.candidate.title).toBe('Weekend Clash Cup');
    expect(result.candidate.timezone).toBe('Asia/Kolkata');
    // 18:00 IST on 2026-03-01 == 12:30 UTC.
    expect(result.candidate.registrationOpensAt).toBe('2026-03-01T12:30:00.000Z');
    expect(result.candidate.registrationClosesAt).toBe('2026-03-05T17:30:00.000Z');
    expect(result.candidate.checkInAt).toBe('2026-03-07T12:15:00.000Z');
    expect(result.candidate.streamStartsAt).toBe('2026-03-07T12:30:00.000Z');
    expect(result.candidate.matchStartsAt).toBe('2026-03-07T13:00:00.000Z');
    expect(result.candidate.streamUrl).toBe('https://twitch.tv/freefirehq');
    expect(result.candidate.registrationUrl).toBe('https://example.com/register');
  });

  it('resolves relative words (tomorrow/tonight) against a fixed sourceTimestamp', () => {
    // 2026-03-01T06:00:00Z == 11:30 IST on 2026-03-01.
    const sourceTimestamp = new Date('2026-03-01T06:00:00.000Z');
    const text = [
      'Scrim Night',
      'Check-in tonight at 8:00 pm',
      'Match starts tomorrow at 9:00 pm',
    ].join('\n');

    const result = parseAnnouncement({
      text,
      sourceTimestamp,
      organizerTimezone: 'Asia/Kolkata',
    });

    expect(result.needsReview).toBe(false);
    expect(result.ambiguities).toEqual([]);
    // tonight (2026-03-01) 20:00 IST == 14:30 UTC same day.
    expect(result.candidate.checkInAt).toBe('2026-03-01T14:30:00.000Z');
    // tomorrow (2026-03-02) 21:00 IST == 15:30 UTC.
    expect(result.candidate.matchStartsAt).toBe('2026-03-02T15:30:00.000Z');
  });

  it('flags an ambiguous date and never auto-confirms (needsReview=true)', () => {
    const text = ['Mystery Cup', 'Match starts next week at 6:00 pm'].join('\n');

    const result = parseAnnouncement({ text, organizerTimezone: 'Asia/Kolkata' });

    expect(result.needsReview).toBe(true);
    expect(result.ambiguities.length).toBeGreaterThan(0);
    expect(result.ambiguities.some((a) => a.toLowerCase().includes('ambiguous'))).toBe(true);
    // The ambiguous field must NOT be populated (no guessing).
    expect(result.candidate.matchStartsAt).toBeUndefined();
  });

  it('flags an ambiguous time (no AM/PM) as needs review', () => {
    const text = ['Evening Brawl', 'Match starts 2026-04-10 at 7'].join('\n');

    const result = parseAnnouncement({ text, organizerTimezone: 'Asia/Kolkata' });

    expect(result.needsReview).toBe(true);
    expect(result.candidate.matchStartsAt).toBeUndefined();
    expect(result.ambiguities.some((a) => a.toLowerCase().includes('am/pm'))).toBe(true);
  });

  it('records errors when required fields are missing', () => {
    const result = parseAnnouncement({ text: '   ', organizerTimezone: 'Asia/Kolkata' });

    expect(result.needsReview).toBe(true);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.candidate.eventDate).toBeUndefined();
  });

  it('reports a missing event date as an error when none can be resolved', () => {
    const result = parseAnnouncement({
      text: 'Just a title, no schedule here',
      organizerTimezone: 'Asia/Kolkata',
    });

    expect(result.errors.some((e) => e.toLowerCase().includes('event date'))).toBe(true);
    expect(result.needsReview).toBe(true);
  });
});
