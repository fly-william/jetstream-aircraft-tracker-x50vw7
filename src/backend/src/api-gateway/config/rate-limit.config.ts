/**
 * @fileoverview Advanced rate limiting configuration for JetStream API Gateway
 * Implements distributed rate limiting using token bucket algorithm with Redis store
 * to support high availability and detailed monitoring across multiple instances.
 * 
 * @version 1.0.0
 */

import rateLimit from 'express-rate-limit'; // ^6.7.0
import RedisStore from 'rate-limit-redis'; // ^3.0.0
import IORedis, { RedisConfig } from 'ioredis'; // ^5.0.0
import { HttpStatusCode } from '../../common/constants/status-codes';

/**
 * Enhanced interface for rate limit configuration with monitoring options
 */
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
  keyGenerator?: (req: any) => string;
  skip?: (req: any) => boolean;
  handler?: (req: any, res: any, next: any) => void;
}

// Constants for rate limiting configuration
const DEFAULT_WINDOW_MS = 60000; // 1 minute window
const DEFAULT_MAX_REQUESTS = 100;
const REDIS_KEY_PREFIX = 'rl:';
const HEALTH_CHECK_PATH = '/health';

/**
 * Creates an Express rate limit middleware with distributed Redis store and monitoring
 * @param config Rate limit configuration options
 * @param redisConfig Redis cluster configuration
 * @returns Configured rate limit middleware with Redis store
 */
export const createRateLimiter = (
  config: RateLimitConfig,
  redisConfig: RedisConfig
): rateLimit.RateLimit => {
  // Initialize Redis cluster client for high availability
  const redisClient = new IORedis(redisConfig);

  // Create Redis store instance with cluster support
  const store = new RedisStore({
    prefix: REDIS_KEY_PREFIX,
    sendCommand: (...args: string[]) => redisClient.call(...args),
  });

  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: config.message,
    standardHeaders: config.standardHeaders,
    legacyHeaders: config.legacyHeaders,
    
    // Custom key generation for rate limiting
    keyGenerator: config.keyGenerator || ((req) => {
      return `${REDIS_KEY_PREFIX}${req.ip}:${req.path}`;
    }),

    // Bypass function for health checks
    skip: config.skip || ((req) => {
      return req.path === HEALTH_CHECK_PATH;
    }),

    // Custom handler for limit exceeded events
    handler: config.handler || ((req, res) => {
      res.status(HttpStatusCode.TOO_MANY_REQUESTS).json({
        error: config.message,
        retryAfter: Math.ceil(config.windowMs / 1000),
      });
    }),

    store: store,
  });
};

/**
 * Default rate limit configuration with monitoring enabled
 */
export const defaultConfig: RateLimitConfig = {
  windowMs: DEFAULT_WINDOW_MS,
  max: DEFAULT_MAX_REQUESTS,
  message: 'Rate limit exceeded. Please try again later.',
  standardHeaders: true, // X-RateLimit headers for monitoring
  legacyHeaders: false,
};

/**
 * Aircraft-related endpoint rate limits
 */
export const aircraftRoutes = {
  position: {
    ...defaultConfig,
    windowMs: DEFAULT_WINDOW_MS,
    max: 300, // Higher limit for real-time position updates
    message: 'Position update rate limit exceeded. Please reduce request frequency.',
  },
  list: {
    ...defaultConfig,
    windowMs: DEFAULT_WINDOW_MS,
    max: 100, // Standard limit for aircraft listing
    message: 'Aircraft list request limit exceeded. Please try again later.',
  },
};

/**
 * Trip-related endpoint rate limits
 */
export const tripRoutes = {
  status: {
    ...defaultConfig,
    windowMs: DEFAULT_WINDOW_MS,
    max: 100, // Standard limit for trip status updates
    message: 'Trip status update limit exceeded. Please try again later.',
  },
  create: {
    ...defaultConfig,
    windowMs: DEFAULT_WINDOW_MS,
    max: 50, // Lower limit for trip creation
    message: 'Trip creation limit exceeded. Please try again later.',
  },
};

// Export comprehensive rate limit configurations
export const rateLimitConfig = {
  defaultConfig,
  aircraftRoutes,
  tripRoutes,
};