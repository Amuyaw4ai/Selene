/**
 * Timezone-safe date helper functions for Selene Cycle Tracker.
 * Employs local-time constructors and string-based comparisons to bypass timezone shift issues.
 */

/**
 * Parses a YYYY-MM-DD string into a local Date object set to midnight.
 * @param {string} dateStr - Date string in format YYYY-MM-DD
 * @returns {Date|null} Date object at local midnight, or null if invalid
 */
export function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  
  // local time constructor: month is 0-indexed in JS Date
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Formats a local Date object into a YYYY-MM-DD string.
 * @param {Date} date - Date object
 * @returns {string} Date string in format YYYY-MM-DD
 */
export function formatDate(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Shifts a YYYY-MM-DD date string by a specific number of days.
 * @param {string} dateStr - Date string in format YYYY-MM-DD
 * @param {number} days - Number of days to add (can be negative)
 * @returns {string} Shifted date string in YYYY-MM-DD format
 */
export function addDays(dateStr, days) {
  const date = parseDate(dateStr);
  if (!date) return '';
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

/**
 * Calculates the absolute elapsed days between two YYYY-MM-DD date strings.
 * @param {string} dateStr1 - First date string
 * @param {string} dateStr2 - Second date string
 * @returns {number} Integer representing elapsed days
 */
export function getDaysBetween(dateStr1, dateStr2) {
  const d1 = parseDate(dateStr1);
  const d2 = parseDate(dateStr2);
  if (!d1 || !d2) return 0;
  
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  // Using Math.round prevents DST shifts from returning non-integers (e.g. 23 or 25 hour differences)
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Checks if a date string falls within a range (inclusive).
 * Uses alphabetical comparison since YYYY-MM-DD is lexicographically sortable.
 * @param {string} dateStr - Date to check
 * @param {string} startStr - Start date of the range
 * @param {string} endStr - End date of the range
 * @returns {boolean} True if within range
 */
export function isDateWithinRange(dateStr, startStr, endStr) {
  if (!dateStr || !startStr || !endStr) return false;
  return dateStr >= startStr && dateStr <= endStr;
}
