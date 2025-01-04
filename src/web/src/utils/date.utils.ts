// Date utility functions for JetStream web application
// Dependencies:
// - dayjs: ^1.11.0
// - dayjs/plugin/utc: ^1.11.0
// - dayjs/plugin/timezone: ^1.11.0
// - dayjs/plugin/duration: ^1.11.0

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import duration from 'dayjs/plugin/duration';

// Configure dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);

// Global constants
const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';
const DEFAULT_TIMEZONE = 'UTC';
const DURATION_FORMAT = 'H[h] m[m]';
const ISO_DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSSZ';

// Cache for performance optimization
const durationCache = new Map<number, string>();
const timezoneCache = new Map<string, boolean>();

/**
 * Formats a date to the application's default format with timezone support
 * @param date - Date to format
 * @param format - Optional custom format string
 * @param timezone - Optional IANA timezone identifier
 * @returns Formatted date string
 * @throws Error if date is invalid or timezone is not recognized
 */
export const formatDate = (
  date: Date,
  format: string = DEFAULT_DATE_FORMAT,
  timezone: string = DEFAULT_TIMEZONE
): string => {
  try {
    if (!date) {
      throw new Error('Date parameter is required');
    }

    // Validate timezone
    if (!timezoneCache.has(timezone)) {
      if (!dayjs.tz.zone(timezone)) {
        throw new Error(`Invalid timezone: ${timezone}`);
      }
      timezoneCache.set(timezone, true);
    }

    return dayjs(date)
      .tz(timezone)
      .format(format);
  } catch (error) {
    console.error('Error formatting date:', error);
    throw error;
  }
};

/**
 * Formats a date to ISO 8601 format in UTC for API communication
 * @param date - Date to format
 * @returns ISO formatted date string
 * @throws Error if date is invalid
 */
export const formatISODate = (date: Date): string => {
  try {
    if (!date) {
      throw new Error('Date parameter is required');
    }

    return dayjs(date)
      .utc()
      .format(ISO_DATE_FORMAT);
  } catch (error) {
    console.error('Error formatting ISO date:', error);
    throw error;
  }
};

/**
 * Parses a date string with format validation
 * @param dateString - String to parse
 * @param format - Optional custom format string
 * @returns JavaScript Date object
 * @throws Error if date string is invalid or cannot be parsed
 */
export const parseDate = (
  dateString: string,
  format: string = DEFAULT_DATE_FORMAT
): Date => {
  try {
    if (!dateString || typeof dateString !== 'string') {
      throw new Error('Valid date string is required');
    }

    const parsed = dayjs(dateString, format);
    
    if (!parsed.isValid()) {
      throw new Error(`Invalid date string: ${dateString}`);
    }

    return parsed.toDate();
  } catch (error) {
    console.error('Error parsing date:', error);
    throw error;
  }
};

/**
 * Formats a duration in milliseconds to human-readable string
 * @param milliseconds - Duration in milliseconds
 * @returns Formatted duration string (e.g., "2h 30m")
 * @throws Error if milliseconds is invalid
 */
export const formatDuration = (milliseconds: number): string => {
  try {
    if (typeof milliseconds !== 'number' || milliseconds < 0) {
      throw new Error('Valid positive duration in milliseconds is required');
    }

    // Check cache for performance
    const cached = durationCache.get(milliseconds);
    if (cached) {
      return cached;
    }

    const formatted = dayjs.duration(milliseconds)
      .format(DURATION_FORMAT);

    // Cache result for future use
    durationCache.set(milliseconds, formatted);
    
    return formatted;
  } catch (error) {
    console.error('Error formatting duration:', error);
    throw error;
  }
};

/**
 * Calculates duration between two dates with timezone support
 * @param startDate - Start date
 * @param endDate - End date
 * @param timezone - Optional IANA timezone identifier
 * @returns Duration in milliseconds
 * @throws Error if dates are invalid or timezone is not recognized
 */
export const calculateDuration = (
  startDate: Date,
  endDate: Date,
  timezone: string = DEFAULT_TIMEZONE
): number => {
  try {
    if (!startDate || !endDate) {
      throw new Error('Both start and end dates are required');
    }

    // Validate timezone
    if (!timezoneCache.has(timezone)) {
      if (!dayjs.tz.zone(timezone)) {
        throw new Error(`Invalid timezone: ${timezone}`);
      }
      timezoneCache.set(timezone, true);
    }

    const start = dayjs(startDate).tz(timezone);
    const end = dayjs(endDate).tz(timezone);

    if (!start.isValid() || !end.isValid()) {
      throw new Error('Invalid date objects provided');
    }

    return end.diff(start);
  } catch (error) {
    console.error('Error calculating duration:', error);
    throw error;
  }
};

/**
 * Checks if a date falls within a specified time range
 * @param date - Date to check
 * @param startDate - Range start date
 * @param endDate - Range end date
 * @param timezone - Optional IANA timezone identifier
 * @returns Boolean indicating if date is within range
 * @throws Error if dates are invalid or timezone is not recognized
 */
export const isWithinTimeRange = (
  date: Date,
  startDate: Date,
  endDate: Date,
  timezone: string = DEFAULT_TIMEZONE
): boolean => {
  try {
    if (!date || !startDate || !endDate) {
      throw new Error('All date parameters are required');
    }

    // Validate timezone
    if (!timezoneCache.has(timezone)) {
      if (!dayjs.tz.zone(timezone)) {
        throw new Error(`Invalid timezone: ${timezone}`);
      }
      timezoneCache.set(timezone, true);
    }

    const targetDate = dayjs(date).tz(timezone);
    const start = dayjs(startDate).tz(timezone);
    const end = dayjs(endDate).tz(timezone);

    if (!targetDate.isValid() || !start.isValid() || !end.isValid()) {
      throw new Error('Invalid date objects provided');
    }

    return targetDate.isBetween(start, end, null, '[]');
  } catch (error) {
    console.error('Error checking time range:', error);
    throw error;
  }
};