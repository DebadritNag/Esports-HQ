/**
 * Schedule wrapper: a thin façade the recurrence/reminder features and workers
 * call so they don't reach into the RPC wrappers directly. Keeps the public
 * surface small and stable while the underlying RPCs stay in reminder-service.
 */

import {
  generateRecurrenceOccurrences,
  regenerateEventReminders,
  regenerateReminderJobs,
  type ReminderServiceOptions,
} from './reminder-service.js';

/** Roll the recurrence horizon forward; returns occurrences generated. */
export async function runRecurrenceGeneration(
  horizonDays?: number,
  options: ReminderServiceOptions = {},
): Promise<number> {
  return generateRecurrenceOccurrences(horizonDays, options);
}

/** Regenerate every reminder job for an event; returns jobs regenerated. */
export async function triggerEventReminderRegeneration(
  eventId: string,
  options: ReminderServiceOptions = {},
): Promise<number> {
  return regenerateEventReminders(eventId, options);
}

/** Regenerate reminder jobs for one user + event; returns jobs regenerated. */
export async function triggerUserEventReminderRegeneration(
  userId: string,
  eventId: string,
  options: ReminderServiceOptions = {},
): Promise<number> {
  return regenerateReminderJobs(userId, eventId, options);
}
