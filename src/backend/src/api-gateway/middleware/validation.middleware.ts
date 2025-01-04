/**
 * @fileoverview Enhanced validation middleware for JetStream API Gateway
 * Provides centralized request payload validation with caching, retry logic,
 * and monitoring capabilities to maintain <0.1% error rate target.
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { z } from 'zod'; // v3.22.0
import { createClient } from 'redis'; // v4.6.0
import { aircraftSchema } from '../../common/validators/aircraft.validator';
import { tripSchema } from '../../common/validators/trip.validator';
import { ApiError } from './error.middleware';
import { logger } from '../../common/utils/logger';
import { ErrorCode } from '../../common/constants/error-codes';
import { HttpStatusCode } from '../../common/constants/status-codes';

/**
 * Configuration options for validation middleware
 */
export interface ValidationOptions {
  schema: z.ZodSchema;
  source: 'body' | 'query' | 'params';
  cacheResults?: boolean;
  cacheTTL?: number;
  retryAttempts?: number;
}

// Default validation configuration
const DEFAULT_VALIDATION_OPTIONS: Partial<ValidationOptions> = {
  source: 'body',
  cacheResults: true,
  cacheTTL: 300, // 5 minutes
  retryAttempts: 3
};

// Constants
const VALIDATION_CACHE_PREFIX = 'validation:';
const MAX_VALIDATION_TIME_MS = 1000;

// Initialize Redis client for validation caching
const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
  }
});

redisClient.on('error', (err) => {
  logger.error('Redis client error', err, { context: 'ValidationMiddleware' });
});

/**
 * Generates cache key for validation results
 */
const generateCacheKey = (schema: z.ZodSchema, data: unknown): string => {
  const schemaId = schema._def.description || schema.constructor.name;
  const dataHash = Buffer.from(JSON.stringify(data)).toString('base64');
  return `${VALIDATION_CACHE_PREFIX}${schemaId}:${dataHash}`;
};

/**
 * Attempts to validate data with retry logic
 */
const attemptValidation = async (
  schema: z.ZodSchema,
  data: unknown,
  attempts: number
): Promise<z.SafeParseReturnType<unknown, unknown>> => {
  let lastError: unknown;
  
  for (let i = 0; i < attempts; i++) {
    try {
      const startTime = Date.now();
      const result = await schema.safeParseAsync(data);
      const validationTime = Date.now() - startTime;

      // Log slow validations
      if (validationTime > MAX_VALIDATION_TIME_MS) {
        logger.warn('Slow validation detected', {
          validationTime,
          schemaName: schema._def.description,
          attempt: i + 1
        });
      }

      return result;
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
      }
    }
  }

  throw lastError;
};

/**
 * Enhanced validation middleware factory with caching and monitoring
 */
export const validate = (options: ValidationOptions) => {
  const config = { ...DEFAULT_VALIDATION_OPTIONS, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req[config.source];
      const cacheKey = config.cacheResults ? generateCacheKey(config.schema, data) : null;

      // Check cache for existing validation result
      if (cacheKey) {
        const cachedResult = await redisClient.get(cacheKey);
        if (cachedResult) {
          const parsedResult = JSON.parse(cachedResult);
          if (!parsedResult.success) {
            throw new ApiError(
              HttpStatusCode.BAD_REQUEST,
              ErrorCode.VALIDATION_ERROR,
              'Validation failed',
              parsedResult.error
            );
          }
          req[config.source] = parsedResult.data;
          return next();
        }
      }

      // Perform validation with retry logic
      const validationResult = await attemptValidation(
        config.schema,
        data,
        config.retryAttempts || 1
      );

      // Cache successful validation results
      if (validationResult.success && cacheKey) {
        await redisClient.setEx(
          cacheKey,
          config.cacheTTL || 300,
          JSON.stringify(validationResult)
        );
      }

      if (!validationResult.success) {
        // Log validation failure
        logger.error('Validation failed', null, {
          path: req.path,
          method: req.method,
          errors: validationResult.error.errors,
          source: config.source
        });

        throw new ApiError(
          HttpStatusCode.BAD_REQUEST,
          ErrorCode.VALIDATION_ERROR,
          'Validation failed',
          {
            errors: validationResult.error.errors.map(err => ({
              path: err.path.join('.'),
              message: err.message
            }))
          }
        );
      }

      // Update request with validated data
      req[config.source] = validationResult.data;
      next();
    } catch (error) {
      if (error instanceof ApiError) {
        next(error);
      } else {
        next(new ApiError(
          HttpStatusCode.INTERNAL_SERVER_ERROR,
          ErrorCode.INTERNAL_SERVER_ERROR,
          'Validation processing failed',
          { originalError: error.message }
        ));
      }
    }
  };
};

// Export pre-configured validators for common schemas
export const validateAircraft = validate({
  schema: aircraftSchema,
  source: 'body'
});

export const validateTrip = validate({
  schema: tripSchema,
  source: 'body'
});

export default validate;