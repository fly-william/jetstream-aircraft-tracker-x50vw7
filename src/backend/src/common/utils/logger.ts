/**
 * @fileoverview Centralized logging utility for the JetStream platform providing structured logging
 * capabilities with ELK Stack integration, security audit trails, and monitoring support.
 */

import winston from 'winston'; // v3.10.0
import DailyRotateFile from 'winston-daily-rotate-file'; // v4.7.1
import { ErrorCode } from '../constants/error-codes';
import path from 'path';

/**
 * Interface defining the structure of log entries for consistent logging across services
 */
interface LogEntry {
  timestamp: string;
  level: string;
  service: string;
  message: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Logging levels with corresponding priorities
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

/**
 * Configuration constants for logging
 */
const LOG_DIRECTORY = 'logs';
const MAX_FILE_SIZE = '10m';
const MAX_FILES = '14d';
const SAMPLING_RATE = {
  production: 0.1,
  development: 1.0,
};

/**
 * PII patterns to mask in logs
 */
const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, // Email
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone numbers
  /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
];

/**
 * Creates a Winston logger instance with configured transports and formats
 * @param service - Name of the service generating logs
 */
const createLogger = (service: string): winston.Logger => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Custom format for consistent log structure
  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'ISO' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format((info) => {
      // Mask PII data
      let stringified = JSON.stringify(info);
      PII_PATTERNS.forEach(pattern => {
        stringified = stringified.replace(pattern, '[REDACTED]');
      });
      return JSON.parse(stringified);
    })()
  );

  // Configure file rotation transport
  const fileRotateTransport = new DailyRotateFile({
    dirname: path.join(process.cwd(), LOG_DIRECTORY),
    filename: `%DATE%-${service}.log`,
    datePattern: 'YYYY-MM-DD',
    maxSize: MAX_FILE_SIZE,
    maxFiles: MAX_FILES,
    format: logFormat,
    zippedArchive: true,
  });

  // Create logger instance
  const logger = winston.createLogger({
    levels: LOG_LEVELS,
    defaultMeta: { service },
    transports: [
      // Console transport with color coding
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
        level: isProduction ? 'info' : 'debug',
      }),
      fileRotateTransport,
    ],
  });

  // Handle transport errors
  fileRotateTransport.on('error', (error) => {
    console.error('Error in file transport:', error);
  });

  return logger;
};

// Create the main logger instance
const mainLogger = createLogger('jetstream');

/**
 * Centralized logger utility with enhanced functionality
 */
export const logger = {
  /**
   * Log error messages with stack traces and metadata
   */
  error: (message: string, error?: Error, metadata?: Record<string, unknown>): void => {
    const errorCode = error?.name || ErrorCode.INTERNAL_SERVER_ERROR;
    mainLogger.error({
      message,
      error: {
        name: errorCode,
        message: error?.message,
        stack: error?.stack,
      },
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        errorCode,
      },
    });
  },

  /**
   * Log warning messages
   */
  warn: (message: string, metadata?: Record<string, unknown>): void => {
    mainLogger.warn({
      message,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  },

  /**
   * Log informational messages
   */
  info: (message: string, metadata?: Record<string, unknown>): void => {
    mainLogger.info({
      message,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  },

  /**
   * Log debug messages with sampling in production
   */
  debug: (message: string, metadata?: Record<string, unknown>): void => {
    const samplingRate = process.env.NODE_ENV === 'production' 
      ? SAMPLING_RATE.production 
      : SAMPLING_RATE.development;

    if (Math.random() < samplingRate) {
      mainLogger.debug({
        message,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      });
    }
  },

  /**
   * Log security audit events with user and operation details
   */
  audit: (userId: string, operation: string, details?: Record<string, unknown>): void => {
    mainLogger.info({
      message: `Security Audit: ${operation}`,
      metadata: {
        userId,
        operation,
        details,
        timestamp: new Date().toISOString(),
        type: 'SECURITY_AUDIT',
        ipAddress: details?.ipAddress,
        userAgent: details?.userAgent,
      },
    });
  },
};

// Export the logger instance for use across the application
export default logger;