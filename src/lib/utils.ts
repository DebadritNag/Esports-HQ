import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format an ISO timestamp according to the specified timezone (defaults to Asia/Kolkata).
 */
export function formatDateTime(
  dateString: string | null | undefined,
  timeZone = 'Asia/Kolkata',
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (!dateString) return 'TBA';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';

    const defaultOptions: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
      ...options,
    };

    return new Intl.DateTimeFormat('en-IN', defaultOptions).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Format date part only (e.g., "Oct 29, 2026")
 */
export function formatDateOnly(
  dateString: string | null | undefined,
  timeZone = 'Asia/Kolkata'
): string {
  if (!dateString) return 'TBA';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';

    return new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone,
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Format time part only (e.g., "20:30 IST")
 */
export function formatTimeOnly(
  dateString: string | null | undefined,
  timeZone = 'Asia/Kolkata'
): string {
  if (!dateString) return 'TBA';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'TBA';

    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZoneName: 'short',
      timeZone,
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Human-readable relative countdown or past indicator (e.g., "Closes in 4 hours", "Starts tomorrow")
 */
export function getRelativeTime(targetDate: string | null | undefined): string {
  if (!targetDate) return 'No date set';
  const now = new Date().getTime();
  const target = new Date(targetDate).getTime();
  if (isNaN(target)) return 'Invalid date';

  const diffMs = target - now;
  const isPast = diffMs < 0;
  const absDiff = Math.abs(diffMs);

  const minutes = Math.floor(absDiff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return isPast ? `${days}d ago` : `in ${days}d`;
  }
  if (hours > 0) {
    return isPast ? `${hours}h ago` : `in ${hours}h`;
  }
  if (minutes > 0) {
    return isPast ? `${minutes}m ago` : `in ${minutes}m`;
  }
  return isPast ? 'just now' : 'in less than a minute';
}

/**
 * Checks whether an event deadline is within 24 hours (for urgency cues)
 */
export function isUrgent(deadline: string | null | undefined): boolean {
  if (!deadline) return false;
  const now = new Date().getTime();
  const target = new Date(deadline).getTime();
  const diffHours = (target - now) / (1000 * 60 * 60);
  return diffHours > 0 && diffHours <= 24;
}

/**
 * Format match survival seconds into minutes and seconds (e.g. 14m 20s)
 */
export function formatSurvivalTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}
