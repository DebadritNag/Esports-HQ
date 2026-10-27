import { describe, it, expect } from 'vitest';
import { createIcalAdapter } from '../../src/modules/integrations/sources/ical-adapter.js';
import { createManualAdapter } from '../../src/modules/integrations/sources/manual-adapter.js';
import { createWebsiteAdapter } from '../../src/modules/integrations/sources/website-adapter.js';
import { createApiAdapter } from '../../src/modules/integrations/sources/api-adapter.js';

/**
 * Source adapter behavior: the ical and manual adapters are functional; the
 * website and api adapters return a typed `unsupported` result (never a fake
 * success and never an error).
 */

const SAMPLE_ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//Test//EN',
  'BEGIN:VEVENT',
  'UID:evt-123@example.com',
  'SUMMARY:Weekly Scrim',
  'DTSTART:20260301T140000Z',
  'DTEND:20260301T160000Z',
  'DESCRIPTION:Bring your A game',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

describe('IcalAdapter', () => {
  it('parses a VEVENT into a normalized candidate', async () => {
    const adapter = createIcalAdapter('ical');
    const result = await adapter.parse(SAMPLE_ICS, { organizerTimezone: 'Asia/Kolkata' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(1);
    const first = result.value[0];
    expect(first?.externalId).toBe('evt-123@example.com');
    expect(first?.candidate.title).toBe('Weekly Scrim');
    expect(first?.candidate.matchStartsAt).toBe('2026-03-01T14:00:00.000Z');
    expect(first?.contentHash).toBeTruthy();
  });

  it('dedups candidates against already-seen external ids', async () => {
    const adapter = createIcalAdapter('ical');
    const parsed = await adapter.parse(SAMPLE_ICS, {});
    if (!parsed.ok) throw new Error('expected parse success');
    const seen = new Set(['evt-123@example.com']);
    expect(adapter.dedup(parsed.value, seen)).toHaveLength(0);
    expect(adapter.dedup(parsed.value, new Set())).toHaveLength(1);
  });

  it('validate requires a url or payload', () => {
    const adapter = createIcalAdapter('ical');
    const invalid = adapter.validate({});
    expect(invalid.ok).toBe(false);
    const valid = adapter.validate({ payload: SAMPLE_ICS });
    expect(valid.ok).toBe(true);
  });
});

describe('ManualAdapter', () => {
  it('wraps the announcement parser and yields a candidate', async () => {
    const adapter = createManualAdapter();
    const text = 'Grand Finals on 2026-03-15 at 18:00. Register: https://example.com/reg';
    const result = await adapter.parse(text, { organizerTimezone: 'Asia/Kolkata' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(1);
    expect(result.value[0]?.candidate).toBeTypeOf('object');
  });

  it('is not retried automatically', () => {
    const adapter = createManualAdapter();
    expect(adapter.retry()).toBe(false);
  });
});

describe('WebsiteAdapter (unsupported)', () => {
  it('returns a typed unsupported result from every operation', async () => {
    const adapter = createWebsiteAdapter();
    const validate = adapter.validate();
    expect(validate.ok).toBe(false);
    expect(validate.kind).toBe('unsupported');
    expect(validate.reason).toMatch(/not supported|not implemented/i);

    const fetched = await adapter.fetch();
    expect(fetched.ok).toBe(false);
    if (!fetched.ok) {
      expect(fetched.kind).toBe('unsupported');
    }
  });
});

describe('ApiAdapter (unsupported)', () => {
  it('returns a typed unsupported result from every operation', async () => {
    const adapter = createApiAdapter();
    const validate = adapter.validate();
    expect(validate.ok).toBe(false);
    expect(validate.kind).toBe('unsupported');

    const parsed = await adapter.parse();
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.kind).toBe('unsupported');
    }
  });
});
