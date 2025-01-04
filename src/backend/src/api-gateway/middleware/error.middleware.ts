/**
 * @fileoverview Enhanced error handling middleware for the JetStream API Gateway
 * Provides centralized error handling with security context, monitoring integration,
 * and aviation-specific error handling to maintain <0.1% error rate target.
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { getId as getCorrelationId } from 'correlation-id'; // v3.0.0
import { MetricsService } from '@monitoring/metrics-service'; // v1.0.0
import { ErrorCode } from '../../common/constants/error-codes';
import { HttpStatusCode } from '../../common/constants/status-codes';
import { logger } from '../../common/utils/logger';

/**
 * Sensitive data patterns to mask in error responses
 */
const SENSITIVE_PATTERNS = {
  TAIL_NUMBER: /\b[A-Z]{1,2}-[A-Z]{1,5}\b/g,
  COORDINATES: /\b\d{1,3}\.\d+,\s*-?\d{1,3}\.\d+\b/g,
  API_KEY: /\b[A-Za-z0-9-_]{20,}\b/g,
  JWT: /\bey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*\b/g
};

/**
 * Interface for enhanced API error handling with aviation context
 */
export interface ApiError extends Error {
  statusCode: HttpStatusCode;
  code: ErrorCode;
  details?: Record<string, unknown>;
  correlationId?: string;
  securityContext?: {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    permissions?: string[];
  };
}

/**
 * Custom error class for API errors with enhanced context
 */
export class ApiError extends Error {
  constructor(
    statusCode: HttpStatusCode,
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
    correlationId?: string,
    securityContext?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = this.maskSensitiveData(details);
    this.correlationId = correlationId;
    this.securityContext = securityContext;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Masks sensitive aviation and security data in error details
   */
  private maskSensitiveData(details?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!details) return undefined;

    const maskedDetails = { ...details };
    const stringifyDetails = JSON.stringify(maskedDetails);
    
    let maskedString = stringifyDetails;
    Object.entries(SENSITIVE_PATTERNS).forEach(([key, pattern]) => {
      maskedString = maskedString.replace(pattern, `[REDACTED_${key}]`);
    });

    return JSON.parse(maskedString);
  }
}

/**
 * Enhanced error handling middleware with security, monitoring, and aviation context
 */
export default function errorHandler(
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Extract correlation ID for request tracing
  const correlationId = getCorrelationId() || 'unknown';

  // Capture security context
  const securityContext = {
    userId: req.user?.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    permissions: req.user?.permissions,
    timestamp: new Date().toISOString()
  };

  // Determine error details and status code
  const apiError = error instanceof ApiError ? error : new ApiError(
    HttpStatusCode.INTERNAL_SERVER_ERROR,
    ErrorCode.INTERNAL_SERVER_ERROR,
    error.message || 'An unexpected error occurred',
    { originalError: error.name },
    correlationId,
    securityContext
  );

  // Log error with enhanced context
  logger.error(apiError.message, apiError, {
    correlationId,
    securityContext,
    path: req.path,
    method: req.method,
    statusCode: apiError.statusCode,
    errorCode: apiError.code
  });

  // Track error metrics
  MetricsService.trackError({
    errorCode: apiError.code,
    statusCode: apiError.statusCode,
    path: req.path,
    correlationId
  });

  // Format error response
  const errorResponse = {
    error: {
      code: apiError.code,
      message: apiError.message,
      correlationId,
      details: apiError.details
    }
  };

  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Correlation-ID', correlationId);

  // Send error response
  res.status(apiError.statusCode).json(errorResponse);
}