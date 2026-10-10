/**
 * Utility functions for reliable, timezone-safe local date string generation (YYYY-MM-DD).
 * Prevents UTC offset shifts (e.g. Myanmar MMT UTC+6:30 morning generating yesterday's date).
 */

export const getLocalDateString = (input: Date | string | number = new Date()): string => {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
    return input.trim();
  }
  let dateObj: Date;
  if (typeof input === 'string' && input.includes('T')) {
    dateObj = new Date(input);
  } else if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}/.test(input)) {
    const parts = input.split('-');
    dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  } else if (input instanceof Date) {
    dateObj = input;
  } else {
    dateObj = new Date(input);
  }

  if (isNaN(dateObj.getTime())) {
    dateObj = new Date();
  }

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
