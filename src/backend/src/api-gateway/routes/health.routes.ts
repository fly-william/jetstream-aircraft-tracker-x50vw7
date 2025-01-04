/**
 * @fileoverview Express router configuration for health check endpoints in the API Gateway,
 * providing liveness and readiness probes for Kubernetes and detailed health metrics
 * for monitoring with comprehensive security, rate limiting, and caching features.
 */

import express, { Router, Request, Response, NextFunction } from 'express'; // v4.18.2
import rateLimit from 'express-rate-limit'; // v6.7.0
import promMiddleware from 'express-prometheus-middleware'; // v1.2.0
import cacheMiddleware from 'express-cache-middleware'; // v1.0.0
import { healthController } from '../controllers/health.controller';
import { requestLogger } from '../middleware/logging.middleware';

// Health endpoint path constants
const HEALTH_BASE_PATH = '/health';
const LIVENESS_PATH = '/liveness';
const READINESS_PATH = '/readiness';
const DETAILED_PATH = '/detailed';

// Cache and rate limit configurations
const CACHE_DURATION = 30000; // 30 seconds
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 1000;

/**
 * Configures and returns the health check router with security and monitoring features
 */
const configureHealthRouter = (): Router => {
  const router = express.Router();

  // Apply request logging middleware
  router.use(requestLogger);

  // Configure rate limiting
  const limiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW,
    max: RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 'error',
      message: 'Too many requests, please try again later.',
    },
  });

  // Configure Prometheus metrics middleware
  const metricsMiddleware = promMiddleware({
    metricsPath: '/metrics',
    collectDefaultMetrics: true,
    requestDurationBuckets: [0.1, 0.5, 1, 1.5, 2, 3, 5],
    requestLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
    responseLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
  });

  // Configure response caching
  const cache = new cacheMiddleware({
    duration: CACHE_DURATION,
    cacheHeader: 'x-cache',
  });

  // Apply Prometheus metrics middleware
  router.use(metricsMiddleware);

  // Liveness probe endpoint - basic health check
  router.get(
    `${HEALTH_BASE_PATH}${LIVENESS_PATH}`,
    limiter,
    cache.middleware(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await healthController.getLivenessStatus(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  // Readiness probe endpoint - dependency checks
  router.get(
    `${HEALTH_BASE_PATH}${READINESS_PATH}`,
    limiter,
    cache.middleware(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await healthController.getReadinessStatus(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  // Detailed health metrics endpoint - requires authentication
  router.get(
    `${HEALTH_BASE_PATH}${DETAILED_PATH}`,
    limiter,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await healthController.getDetailedHealth(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  // Error handling middleware
  router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    res.status(500).json({
      status: 'error',
      message: 'Internal server error occurred in health check endpoint',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
};

// Export configured health router
export const healthRouter = configureHealthRouter();