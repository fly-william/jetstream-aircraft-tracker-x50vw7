/**
 * @fileoverview Enhanced Express middleware for request/response logging with security,
 * performance monitoring, and distributed tracing capabilities.
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import now from 'performance-now'; // v2.1.0
import { logger } from '../../common/utils/logger';

// Constants for logging configuration
const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'x-api-key',
  'x-session-id',
  'x-forwarded-for',
  'x-real-ip'
];

const PERFORMANCE_THRESHOLD_MS = 200; // Target p95 response time
const LOG_SAMPLING_RATE = 0.1; // Production sampling rate for detailed logging

/**
 * Interface for enhanced request logging with security and tracking fields
 */
interface RequestLog {
  correlationId: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  timestamp: string;
  userId?: string;
  clientIp: string;
  userAgent: string;
  region: string;
}

/**
 * Interface for response logging with performance metrics
 */
interface ResponseLog {
  correlationId: string;
  statusCode: number;
  responseTime: number;
  timestamp: string;
  bytesTransferred: number;
  cacheHit: boolean;
}

/**
 * Sanitizes request headers by removing sensitive information
 * @param headers - Original request headers
 * @returns Sanitized headers object
 */
const sanitizeHeaders = (headers: Record<string, string>): Record<string, string> => {
  const sanitized = { ...headers };
  
  SENSITIVE_HEADERS.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });

  return sanitized;
};

/**
 * Express middleware for comprehensive request/response logging
 * Implements distributed tracing, performance monitoring, and security audit trails
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = now();
  const correlationId = uuidv4();
  
  // Attach correlation ID to request for tracing
  req.headers['x-correlation-id'] = correlationId;
  
  try {
    // Prepare request log entry
    const requestLog: RequestLog = {
      correlationId,
      method: req.method,
      url: req.url,
      headers: sanitizeHeaders(req.headers as Record<string, string>),
      timestamp: new Date().toISOString(),
      userId: (req as any).user?.id, // User ID from auth middleware if available
      clientIp: req.ip,
      userAgent: req.get('user-agent') || 'unknown',
      region: process.env.AZURE_REGION || 'unknown'
    };

    // Log request details
    logger.info('API Request', requestLog);

    // Setup response logging
    res.on('finish', () => {
      const responseTime = (now() - startTime).toFixed(3);
      const responseLog: ResponseLog = {
        correlationId,
        statusCode: res.statusCode,
        responseTime: parseFloat(responseTime),
        timestamp: new Date().toISOString(),
        bytesTransferred: parseInt(res.get('content-length') || '0'),
        cacheHit: res.get('x-cache') === 'HIT'
      };

      // Log response details with appropriate level based on status and performance
      if (res.statusCode >= 500) {
        logger.error('API Response Error', { ...responseLog });
      } else if (res.statusCode >= 400) {
        logger.warn('API Response Warning', { ...responseLog });
      } else {
        // Sample detailed success logs in production
        if (process.env.NODE_ENV === 'production' && Math.random() > LOG_SAMPLING_RATE) {
          logger.debug('API Response Success', { ...responseLog });
        } else {
          logger.info('API Response Success', { ...responseLog });
        }
      }

      // Performance monitoring alert for slow responses
      if (parseFloat(responseTime) > PERFORMANCE_THRESHOLD_MS) {
        logger.warn('Performance Threshold Exceeded', {
          ...responseLog,
          threshold: PERFORMANCE_THRESHOLD_MS,
          route: req.route?.path
        });
      }
    });

    // Error handling for response logging
    res.on('error', (error: Error) => {
      logger.error('Response Error', error, {
        correlationId,
        statusCode: res.statusCode,
        route: req.route?.path
      });
    });

  } catch (error) {
    // Ensure logging errors don't break request processing
    logger.error('Logging Middleware Error', error as Error);
  }

  next();
};

export default requestLogger;