/**
 * Saksham Date & Timezone Utilities
 * Standardized timezone-aware calendar date calculations for neuro-care patient telemetry.
 * Default patient timezone: 'Asia/Kolkata' (IST, UTC+5:30).
 */

export const DEFAULT_PATIENT_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns YYYY-MM-DD in the specified timezone (defaults to Asia/Kolkata).
 * Uses Intl.DateTimeFormat 'en-CA' for robust standard YYYY-MM-DD output without third-party dependencies.
 */
export function getPatientCalendarDate(
  dateInput: Date | number | string = new Date(),
  timeZone: string = DEFAULT_PATIENT_TIMEZONE
): string {
  const d = typeof dateInput === 'string' || typeof dateInput === 'number'
    ? new Date(dateInput)
    : dateInput;

  if (isNaN(d.getTime())) {
    // Return empty string or fallback on invalid date
    return new Date().toISOString().split('T')[0];
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d);
  } catch {
    // Fallback if environment lacks specified timezone
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Generates an exact continuous 30-calendar-day range [today - 29 days, today]
 * evaluated strictly within the patient's local timezone.
 * Uses UTC date calculations to avoid Daylight Saving Time (DST) arithmetic skew.
 */
export function get30DayCalendarRange(
  referenceDate: Date = new Date(),
  timeZone: string = DEFAULT_PATIENT_TIMEZONE
): { startDate: string; endDate: string; dates: string[] } {
  const dates: string[] = [];
  const todayStr = getPatientCalendarDate(referenceDate, timeZone);

  // Parse YYYY-MM-DD into year, month (0-indexed), and day
  const [year, month, day] = todayStr.split('-').map(Number);
  const baseUtcDate = new Date(Date.UTC(year, month - 1, day));

  for (let i = 29; i >= 0; i--) {
    const cursor = new Date(baseUtcDate);
    cursor.setUTCDate(baseUtcDate.getUTCDate() - i);
    dates.push(cursor.toISOString().split('T')[0]);
  }

  return {
    startDate: dates[0],
    endDate: dates[dates.length - 1],
    dates,
  };
}

/**
 * Parses YYYY-MM-DD or ISO timestamp into a safe Date instance.
 */
export function parseCalendarDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (dateStr.length === 10 && dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr);
}
