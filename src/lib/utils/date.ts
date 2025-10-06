/**
 * Date utility functions for handling timezone-aware date operations
 */

/**
 * Get today's date in a specific timezone
 * @param timezone - IANA timezone string (e.g., 'America/New_York')
 * @returns Date string in YYYY-MM-DD format
 */
export function getTodayInTimezone(timezone?: string): string {
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';

  return `${year}-${month}-${day}`;
}

/**
 * Get a date offset by a number of days in a specific timezone
 * @param daysOffset - Number of days to offset (positive for future, negative for past)
 * @param timezone - IANA timezone string
 * @returns Date string in YYYY-MM-DD format
 */
export function getDateWithOffset(daysOffset: number, timezone?: string): string {
  const todayStr = getTodayInTimezone(timezone);
  const [year, month, day] = todayStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  date.setDate(date.getDate() + daysOffset);

  const resultYear = date.getFullYear();
  const resultMonth = String(date.getMonth() + 1).padStart(2, '0');
  const resultDay = String(date.getDate()).padStart(2, '0');

  return `${resultYear}-${resultMonth}-${resultDay}`;
}

/**
 * Get a date offset by a number of months in a specific timezone
 * @param monthsOffset - Number of months to offset (positive for future, negative for past)
 * @param timezone - IANA timezone string
 * @returns Date string in YYYY-MM-DD format
 */
export function getDateWithMonthOffset(monthsOffset: number, timezone?: string): string {
  const todayStr = getTodayInTimezone(timezone);
  const [year, month, day] = todayStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  date.setMonth(date.getMonth() + monthsOffset);

  const resultYear = date.getFullYear();
  const resultMonth = String(date.getMonth() + 1).padStart(2, '0');
  const resultDay = String(date.getDate()).padStart(2, '0');

  return `${resultYear}-${resultMonth}-${resultDay}`;
}

/**
 * Format a Date object to YYYY-MM-DD string
 * @param date - Date object to format
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
