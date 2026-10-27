/**
 * Provider-independent announcement parser.
 *
 * A pure, deterministic function that extracts candidate event fields from the
 * free text of an organizer announcement. It uses NO paid AI and makes NO
 * network calls — only regex heuristics plus the timezone utilities.
 *
 * Guiding rule: never guess. When a date or time is ambiguous (e.g. a bare
 * "next week", a time without AM/PM that cannot be disambiguated, or a relative
 * word with no `sourceTimestamp` to anchor it), the parser records an
 * ambiguity and sets `needsReview = true`. It must never auto-confirm.
 */

import { combineDateAndTime, resolveTimeZone } from '../../../utils/timezone.js';

/** Input to {@link parseAnnouncement}. */
export interface ParseAnnouncementInput {
  /** The raw announcement text. */
  text: string;
  /** When the announcement was published; anchors relative dates. */
  sourceTimestamp?: Date;
  /** Organizer's IANA timezone used to interpret wall-clock times/dates. */
  organizerTimezone?: string;
  /** Optional URL the announcement was sourced from. */
  sourceUrl?: string;
}

/**
 * Candidate event fields mirroring the shape of the `events` table (all
 * optional — the parser only fills what it can confidently extract). Date-like
 * fields are ISO-8601 UTC strings.
 */
export interface AnnouncementCandidate {
  title?: string;
  organizer?: string;
  eventDate?: string;
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  checkInAt?: string;
  streamStartsAt?: string;
  matchStartsAt?: string;
  timezone?: string;
  registrationUrl?: string;
  streamUrl?: string;
  sourceUrl?: string;
}

/** Result of {@link parseAnnouncement}. */
export interface ParseAnnouncementResult {
  candidate: AnnouncementCandidate;
  errors: string[];
  ambiguities: string[];
  /** True when a human must review before anything is confirmed. */
  needsReview: boolean;
}

const MONTHS: Readonly<Record<string, number>> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const URL_RE = /\bhttps?:\/\/[^\s<>()]+/gi;
/** `HH:mm` or `H:mm` optionally with am/pm, or a bare hour with am/pm. */
const TIME_RE = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;
/** `2026-01-15` ISO date. */
const ISO_DATE_RE = /\b(\d{4})-(\d{2})-(\d{2})\b/;
/** `15 Jan 2026`, `15 January`, `Jan 15`, `January 15 2026`. */
const MONTH_DAY_RE =
  /\b(?:(\d{1,2})\s+([A-Za-z]{3,9})|([A-Za-z]{3,9})\s+(\d{1,2}))(?:,?\s+(\d{4}))?\b/;

const RELATIVE_WORDS = ['today', 'tonight', 'tomorrow', 'tonite'] as const;
/** Vague temporal phrases that we refuse to resolve. */
const VAGUE_PHRASES = [
  'next week',
  'next month',
  'this week',
  'this weekend',
  'coming soon',
  'soon',
  'later',
  'tbd',
  'tba',
  'next weekend',
];

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** Format zoned Y/M/D to an ISO date string `YYYY-MM-DD`. */
function toDateIso(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Extract the zoned calendar date (YYYY-MM-DD) of an instant in a timezone. */
function zonedDateIso(instant: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // en-CA renders as YYYY-MM-DD.
  return formatter.format(instant);
}

/** Shift a `YYYY-MM-DD` string by a whole number of days (UTC-safe). */
function shiftDateIso(dateIso: string, days: number): string {
  const [y, m, d] = dateIso.split('-').map((p) => Number.parseInt(p, 10));
  const base = Date.UTC(y as number, (m as number) - 1, d as number);
  const shifted = new Date(base + days * 86_400_000);
  return toDateIso(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

interface TimeOfDay {
  /** `HH:mm` 24-hour string. */
  value: string;
  /** True when the hour lacked an am/pm marker and is < 13 (ambiguous). */
  ambiguous: boolean;
  raw: string;
}

/** Parse the first time-of-day in a line. Returns null when none present. */
function parseTime(line: string): TimeOfDay | null {
  const match = TIME_RE.exec(line);
  if (!match) {
    return null;
  }
  const rawHour = Number.parseInt(match[1] as string, 10);
  const minute = match[2] ? Number.parseInt(match[2], 10) : 0;
  const meridiem = match[3]?.toLowerCase();

  if (rawHour > 23 || minute > 59) {
    return null;
  }

  let hour = rawHour;
  let ambiguous = false;

  if (meridiem === 'pm') {
    hour = rawHour === 12 ? 12 : rawHour + 12;
  } else if (meridiem === 'am') {
    hour = rawHour === 12 ? 0 : rawHour;
  } else if (rawHour >= 1 && rawHour <= 12) {
    // No am/pm on a 1-12 hour: cannot tell morning from evening.
    ambiguous = true;
  }

  return { value: `${pad2(hour)}:${pad2(minute)}`, ambiguous, raw: match[0].trim() };
}

interface DateParse {
  dateIso: string | null;
  ambiguous: boolean;
  sawDateToken: boolean;
  /** The exact substring the date was matched from (so callers can strip it). */
  matchText: string | null;
}

/** Try to resolve an absolute or relative date in a line to `YYYY-MM-DD`. */
function parseDate(
  line: string,
  sourceTimestamp: Date | undefined,
  timeZone: string,
): DateParse {
  const lower = line.toLowerCase();

  // Vague phrases: a date token is present but unresolvable.
  for (const phrase of VAGUE_PHRASES) {
    if (lower.includes(phrase)) {
      return { dateIso: null, ambiguous: true, sawDateToken: true, matchText: phrase };
    }
  }

  // ISO date wins outright.
  const iso = ISO_DATE_RE.exec(line);
  if (iso) {
    return {
      dateIso: toDateIso(Number(iso[1]), Number(iso[2]), Number(iso[3])),
      ambiguous: false,
      sawDateToken: true,
      matchText: iso[0],
    };
  }

  // Relative words require a sourceTimestamp to anchor them.
  for (const word of RELATIVE_WORDS) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    const wordMatch = re.exec(lower);
    if (wordMatch) {
      if (!sourceTimestamp) {
        return { dateIso: null, ambiguous: true, sawDateToken: true, matchText: word };
      }
      const today = zonedDateIso(sourceTimestamp, timeZone);
      const offset = word === 'tomorrow' ? 1 : 0;
      return {
        dateIso: shiftDateIso(today, offset),
        ambiguous: false,
        sawDateToken: true,
        matchText: word,
      };
    }
  }

  // Month/day forms.
  const md = MONTH_DAY_RE.exec(line);
  if (md) {
    const dayStr = md[1] ?? md[4];
    const monthStr = (md[2] ?? md[3]) as string | undefined;
    const yearStr = md[5];
    const monthKey = monthStr?.toLowerCase();
    const month = monthKey ? MONTHS[monthKey] : undefined;
    const day = dayStr ? Number.parseInt(dayStr, 10) : undefined;

    if (month && day && day >= 1 && day <= 31) {
      if (yearStr) {
        return {
          dateIso: toDateIso(Number.parseInt(yearStr, 10), month, day),
          ambiguous: false,
          sawDateToken: true,
          matchText: md[0],
        };
      }
      // No year: infer from the source timestamp's zoned year when available,
      // otherwise the year is genuinely ambiguous.
      if (sourceTimestamp) {
        const year = Number.parseInt(zonedDateIso(sourceTimestamp, timeZone).slice(0, 4), 10);
        return {
          dateIso: toDateIso(year, month, day),
          ambiguous: false,
          sawDateToken: true,
          matchText: md[0],
        };
      }
      return { dateIso: null, ambiguous: true, sawDateToken: true, matchText: md[0] };
    }
  }

  return { dateIso: null, ambiguous: false, sawDateToken: false, matchText: null };
}

/** Remove the first occurrence of a matched substring (case-insensitive). */
function stripMatch(line: string, matchText: string | null): string {
  if (!matchText) {
    return line;
  }
  const idx = line.toLowerCase().indexOf(matchText.toLowerCase());
  if (idx < 0) {
    return line;
  }
  return line.slice(0, idx) + ' ' + line.slice(idx + matchText.length);
}

/** Case-insensitive keyword presence test. */
function has(line: string, ...keywords: string[]): boolean {
  const lower = line.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

/** Pick the first registration/stream URL from a line of text. */
function firstUrl(line: string): string | undefined {
  const matches = line.match(URL_RE);
  return matches && matches.length > 0 ? matches[0] : undefined;
}

/**
 * Parse an organizer announcement into candidate event fields. Pure and
 * deterministic: identical inputs always yield identical outputs.
 */
export function parseAnnouncement(input: ParseAnnouncementInput): ParseAnnouncementResult {
  const timeZone = resolveTimeZone(input.organizerTimezone);
  const candidate: AnnouncementCandidate = { timezone: timeZone };
  const errors: string[] = [];
  const ambiguities: string[] = [];

  if (input.sourceUrl) {
    candidate.sourceUrl = input.sourceUrl;
  }

  const text = typeof input.text === 'string' ? input.text : '';
  if (text.trim().length === 0) {
    errors.push('Announcement text is empty.');
    return { candidate, errors, ambiguities, needsReview: true };
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Title: first non-empty line, trimmed of trailing colons.
  const firstLine = lines[0];
  if (firstLine) {
    candidate.title = firstLine.replace(/[:：]\s*$/, '').trim();
  }

  // Combine a resolved date + time-of-day into a UTC instant, recording an
  // ambiguity (and skipping assignment) whenever either part is uncertain.
  const assign = (
    field: keyof AnnouncementCandidate,
    label: string,
    line: string,
  ): void => {
    const { dateIso, ambiguous: dateAmbiguous, sawDateToken, matchText } = parseDate(
      line,
      input.sourceTimestamp,
      timeZone,
    );
    // Strip the date token so its digits are not mistaken for a time.
    const time = parseTime(stripMatch(line, matchText));

    if (dateAmbiguous) {
      ambiguities.push(`${label}: date is ambiguous and was not resolved ("${line}").`);
      return;
    }
    if (time?.ambiguous) {
      ambiguities.push(
        `${label}: time "${time.raw}" lacks AM/PM and is ambiguous ("${line}").`,
      );
      return;
    }
    if (!dateIso && !sawDateToken) {
      // No date token on this line at all — nothing to assign.
      return;
    }
    if (!dateIso) {
      ambiguities.push(`${label}: could not resolve a concrete date ("${line}").`);
      return;
    }

    const timeOfDay = time?.value ?? '00:00';
    const instant = combineDateAndTime(dateIso, timeOfDay, timeZone);
    (candidate[field] as string) = instant.toISOString();
  };

  for (const line of lines) {
    if (has(line, 'registration open', 'reg open', 'registration opens', 'regs open')) {
      assign('registrationOpensAt', 'Registration open', line);
    } else if (
      has(line, 'registration close', 'reg close', 'registration closes', 'deadline', 'last date')
    ) {
      assign('registrationClosesAt', 'Registration close', line);
    } else if (has(line, 'check-in', 'check in', 'checkin')) {
      assign('checkInAt', 'Check-in', line);
    } else if (has(line, 'stream', 'live on', 'broadcast', 'watch')) {
      const url = firstUrl(line);
      if (url) {
        candidate.streamUrl = url;
      }
      assign('streamStartsAt', 'Stream start', line);
    } else if (has(line, 'match', 'tournament starts', 'kick off', 'kickoff', 'go live')) {
      assign('matchStartsAt', 'Match start', line);
    } else if (has(line, 'register', 'sign up', 'signup', 'slot booking')) {
      const url = firstUrl(line);
      if (url) {
        candidate.registrationUrl = url;
      }
    } else if (has(line, 'date', 'when', 'event on', 'happening')) {
      assign('eventDate', 'Event date', line);
    }
  }

  // Fallback: if no explicit event date was found, use the first line that
  // contains any resolvable date token.
  if (!candidate.eventDate) {
    for (const line of lines) {
      const { dateIso, ambiguous, matchText } = parseDate(line, input.sourceTimestamp, timeZone);
      if (dateIso && !ambiguous) {
        const time = parseTime(stripMatch(line, matchText));
        if (time?.ambiguous) {
          continue;
        }
        const instant = combineDateAndTime(dateIso, time?.value ?? '00:00', timeZone);
        candidate.eventDate = instant.toISOString();
        break;
      }
    }
  }

  // Capture any stray registration URL from the whole text if none was found.
  if (!candidate.registrationUrl) {
    const url = firstUrl(text);
    if (url) {
      candidate.registrationUrl = url;
    }
  }

  // Validate the minimum useful payload.
  if (!candidate.title) {
    errors.push('Could not determine a title.');
  }
  if (!candidate.eventDate) {
    errors.push('Could not determine an event date.');
  }

  const needsReview = ambiguities.length > 0 || errors.length > 0;

  return { candidate, errors, ambiguities, needsReview };
}
