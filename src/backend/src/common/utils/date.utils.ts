import dayjs from 'dayjs'; // ^1.11.0
import utc from 'dayjs/plugin/utc'; // ^1.11.0
import timezone from 'dayjs/plugin/timezone'; // ^1.11.0
import duration from 'dayjs/plugin/duration'; // ^1.11.0

// Configure dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);

// Global constants
const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';
const DEFAULT_TIMEZONE = 'UTC';
const DURATION_FORMAT = 'H[h] m[m]';
const ISO_DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSSZ';
const DATE_CACHE_TTL = 300000; // 5 minutes in milliseconds
const MAX_CACHE_SIZE = 1000;

// Cache implementation for formatted dates
interface DateCacheEntry {
  value: string;
  timestamp: number;
}

class DateFormatCache {
  private cache: Map<string, DateCacheEntry>;

  constructor() {
    this.cache = new Map();
  }

  get(key: string): string | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check if cache entry has expired
    if (Date.now() - entry.timestamp > DATE_CACHE_TTL) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: string): void {
    // Implement LRU-like eviction if cache size limit is reached
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

const dateFormatCache = new DateFormatCache();

/**
 * Custom error class for date-related operations
 */
class DateUtilError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DateUtilError';
  }
}

/**
 * Formats a date to ISO 8601 format with UTC timezone
 * @param date - Date to format
 * @param useCache - Whether to use caching for formatted dates
 * @returns ISO 8601 formatted date string
 * @throws DateUtilError if date is invalid
 */
export function formatISODate(date: Date, useCache = true): string {
  try {
    if (!date) {
      throw new DateUtilError('Date parameter is required');
    }

    const cacheKey = useCache ? date.getTime().toString() : '';
    
    if (useCache) {
      const cachedValue = dateFormatCache.get(cacheKey);
      if (cachedValue) {
        return cachedValue;
      }
    }

    const dayjsDate = dayjs(date).utc();
    
    if (!dayjsDate.isValid()) {
      throw new DateUtilError('Invalid date provided');
    }

    const formattedDate = dayjsDate.format(ISO_DATE_FORMAT);

    if (useCache) {
      dateFormatCache.set(cacheKey, formattedDate);
    }

    return formattedDate;
  } catch (error) {
    if (error instanceof DateUtilError) {
      throw error;
    }
    throw new DateUtilError(`Error formatting date: ${error.message}`);
  }
}

/**
 * Validates ISO 8601 date string format
 */
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:?\d{2})$/;

/**
 * Parses ISO 8601 formatted date strings
 * @param dateString - ISO 8601 formatted date string
 * @param fallbackTimezone - Timezone to use if not specified in date string
 * @returns JavaScript Date object in UTC
 * @throws DateUtilError if date string is invalid
 */
export function parseISODate(dateString: string, fallbackTimezone: string = DEFAULT_TIMEZONE): Date {
  try {
    if (!dateString) {
      throw new DateUtilError('Date string is required');
    }

    if (!ISO_DATE_REGEX.test(dateString)) {
      throw new DateUtilError('Invalid ISO 8601 date format');
    }

    const parsedDate = dayjs.tz(dateString, fallbackTimezone);

    if (!parsedDate.isValid()) {
      throw new DateUtilError('Invalid date value');
    }

    // Convert to UTC and return as JavaScript Date
    return parsedDate.utc().toDate();
  } catch (error) {
    if (error instanceof DateUtilError) {
      throw error;
    }
    throw new DateUtilError(`Error parsing date: ${error.message}`);
  }
}

/**
 * Utility function to check if a date is valid
 * @param date - Date to validate
 * @returns boolean indicating if date is valid
 */
export function isValidDate(date: Date | string): boolean {
  try {
    const dayjsDate = dayjs(date);
    return dayjsDate.isValid();
  } catch {
    return false;
  }
}

/**
 * Formats a duration in milliseconds to human-readable format
 * @param milliseconds - Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDuration(milliseconds: number): string {
  try {
    const duration = dayjs.duration(milliseconds);
    return duration.format(DURATION_FORMAT);
  } catch (error) {
    throw new DateUtilError(`Error formatting duration: ${error.message}`);
  }
}

/**
 * Gets the current time in UTC
 * @returns Current UTC date
 */
export function getCurrentUTCDate(): Date {
  return dayjs.utc().toDate();
}

/**
 * Converts a date to a specific timezone
 * @param date - Date to convert
 * @param timezone - Target timezone
 * @returns Date in specified timezone
 */
export function convertToTimezone(date: Date, timezone: string): Date {
  try {
    const converted = dayjs(date).tz(timezone);
    if (!converted.isValid()) {
      throw new DateUtilError('Invalid date or timezone');
    }
    return converted.toDate();
  } catch (error) {
    if (error instanceof DateUtilError) {
      throw error;
    }
    throw new DateUtilError(`Error converting timezone: ${error.message}`);
  }
}