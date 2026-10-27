/**
 * Timezone utilities built on the Intl API. Default zone is Asia/Kolkata.
 * These helpers avoid pulling in a date library; all formatting is IANA-aware.
 */

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/** Validate that a string is a usable IANA timezone identifier. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Resolve a candidate timezone, falling back to the default when invalid. */
export function resolveTimeZone(timeZone: string | null | undefined): string {
  if (timeZone && isValidTimeZone(timeZone)) {
    return timeZone;
  }
  return DEFAULT_TIMEZONE;
}

/** Format an instant in the given IANA timezone (defaults to Asia/Kolkata). */
export function formatInTimeZone(
  date: Date,
  timeZone: string = DEFAULT_TIMEZONE,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  },
): string {
  const zone = resolveTimeZone(timeZone);
  return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: zone }).format(date);
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Decompose an instant into calendar parts as seen in a given timezone. */
export function getZonedParts(date: Date, timeZone: string = DEFAULT_TIMEZONE): ZonedParts {
  const zone = resolveTimeZone(timeZone);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const lookup = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type);
    return part ? Number.parseInt(part.value, 10) : 0;
  };
  // Intl may emit hour "24" at midnight for some locales; normalize to 0.
  const hour = lookup('hour') % 24;
  return {
    year: lookup('year'),
    month: lookup('month'),
    day: lookup('day'),
    hour,
    minute: lookup('minute'),
    second: lookup('second'),
  };
}

/** Return the offset (ms) of a timezone from UTC at the given instant. */
export function getTimeZoneOffsetMs(date: Date, timeZone: string = DEFAULT_TIMEZONE): number {
  const parts = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  // Compare against the instant truncated to seconds to avoid ms drift.
  const actual = Math.floor(date.getTime() / 1000) * 1000;
  return asUtc - actual;
}

/**
 * Combine a calendar date (YYYY-MM-DD) with a wall-clock time (HH:mm or
 * HH:mm:ss) interpreted in the given timezone, returning the UTC instant.
 */
export function combineDateAndTime(
  dateIso: string,
  timeOfDay: string,
  timeZone: string = DEFAULT_TIMEZONE,
): Date {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso.trim());
  if (!dateMatch) {
    throw new RangeError(`Invalid date (expected YYYY-MM-DD): ${dateIso}`);
  }
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(timeOfDay.trim());
  if (!timeMatch) {
    throw new RangeError(`Invalid time (expected HH:mm[:ss]): ${timeOfDay}`);
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = timeMatch[3] ? Number(timeMatch[3]) : 0;

  if (hour > 23 || minute > 59 || second > 59) {
    throw new RangeError(`Time out of range: ${timeOfDay}`);
  }

  // Treat the wall-clock values as if they were UTC, then correct by the
  // zone's offset at that approximate instant.
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const offset = getTimeZoneOffsetMs(new Date(naiveUtc), timeZone);
  return new Date(naiveUtc - offset);
}
