/**
 * Calculate the next occurrence of a given day-of-week + hour (UTC).
 *
 * @param reportDay  0=Sun, 1=Mon, ..., 6=Sat
 * @param reportHour 0-23 UTC
 * @param after      Reference date (defaults to now). The returned date will be strictly after this.
 * @returns A Date representing the next occurrence of that day+hour in UTC.
 */
export function calculateNextReportAt(
  reportDay: number,
  reportHour: number,
  after?: Date
): Date {
  const ref = after ? new Date(after) : new Date();

  // Start from the reference date at the desired hour, 0 minutes
  const candidate = new Date(ref);
  candidate.setUTCHours(reportHour, 0, 0, 0);

  // Calculate day offset needed
  const currentDay = candidate.getUTCDay(); // 0=Sun..6=Sat
  let daysUntil = reportDay - currentDay;

  if (daysUntil < 0) {
    daysUntil += 7;
  } else if (daysUntil === 0) {
    // Same day of week: if the candidate time has already passed, move to next week
    if (candidate <= ref) {
      daysUntil = 7;
    }
  }

  candidate.setUTCDate(candidate.getUTCDate() + daysUntil);

  return candidate;
}

/**
 * Day-of-week names for display. Index matches JS getUTCDay(): 0=Sunday.
 */
export const DAY_NAMES_EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Format an hour as a human-readable UTC string (e.g. "08:00 UTC")
 */
export function formatHourUTC(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00 UTC`;
}
