/**
 * @fileoverview Health check controller providing liveness and readiness probes with 
 * enhanced monitoring capabilities for the JetStream API Gateway.
 */

import { Request, Response } from 'express'; // v4.18.2
import { register, Gauge, Counter } from 'prom-client'; // v14.0.0
import NodeCache from 'node-cache'; // v5.1.2
import { logger } from '../../common/utils/logger';
import { ErrorCode } from '../../common/constants/error-codes';

// Cache configuration for health metrics
const metricsCache = new NodeCache({
  stdTTL: 5, // 5 seconds TTL
  checkperiod: 1, // Check for expired entries every second
});

// Prometheus metrics
const upGauge = new Gauge({
  name: 'api_gateway_up',
  help: 'API Gateway up/down status',
});

const healthCheckCounter = new Counter({
  name: 'api_gateway_health_checks_total',
  help: 'Total number of health checks performed',
  labelNames: ['type', 'status'],
});

/**
 * Interface defining the structure of detailed health metrics
 */
interface HealthMetrics {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  timestamp: string;
  version: string;
  uptime: number;
  system: {
    cpu: number;
    memory: {
      used: number;
      total: number;
    };
    connections: number;
  };
  dependencies: {
    database: {
      status: string;
      responseTime: number;
    };
    cache: {
      status: string;
      responseTime: number;
    };
    messageQueue: {
      status: string;
      responseTime: number;
    };
  };
  metrics: {
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

/**
 * Health check controller providing enhanced monitoring capabilities
 */
class HealthController {
  private readonly startTime: number;
  private readonly version: string;

  constructor() {
    this.startTime = Date.now();
    this.version = process.env.API_VERSION || '1.0.0';
    upGauge.set(1); // Set initial up status
  }

  /**
   * Handles liveness probe requests for Kubernetes health checks
   */
  public getLivenessStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('Liveness check requested', {
        traceId: req.headers['x-trace-id'],
      });

      healthCheckCounter.inc({ type: 'liveness', status: 'success' });

      res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Liveness check failed', error as Error);
      healthCheckCounter.inc({ type: 'liveness', status: 'failure' });
      res.status(500).json({
        status: 'DOWN',
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Enhanced readiness probe handler with circuit breaker pattern
   */
  public getReadinessStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('Readiness check requested', {
        traceId: req.headers['x-trace-id'],
      });

      // Check cache for recent dependency status
      const cachedStatus = metricsCache.get('dependencyStatus');
      if (cachedStatus) {
        healthCheckCounter.inc({ type: 'readiness', status: 'cache_hit' });
        res.status(200).json(cachedStatus);
        return;
      }

      // Check critical dependencies
      const dependencies = await this.checkDependencies();
      const status = this.evaluateDependencyStatus(dependencies);

      // Cache the results
      metricsCache.set('dependencyStatus', status);

      if (status.status === 'UP') {
        healthCheckCounter.inc({ type: 'readiness', status: 'success' });
        res.status(200).json(status);
      } else {
        healthCheckCounter.inc({ type: 'readiness', status: 'failure' });
        res.status(503).json({
          ...status,
          error: ErrorCode.SERVICE_UNAVAILABLE,
        });
      }
    } catch (error) {
      logger.error('Readiness check failed', error as Error);
      healthCheckCounter.inc({ type: 'readiness', status: 'error' });
      res.status(503).json({
        status: 'DOWN',
        error: ErrorCode.SERVICE_UNAVAILABLE,
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Enhanced detailed health metrics provider with caching and Prometheus support
   */
  public getDetailedHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('Detailed health check requested', {
        traceId: req.headers['x-trace-id'],
      });

      const acceptHeader = req.headers.accept;
      const wantsPrometheus = acceptHeader?.includes('text/plain');

      // Check cache based on requested format
      const cacheKey = wantsPrometheus ? 'prometheusMetrics' : 'healthMetrics';
      const cachedMetrics = metricsCache.get(cacheKey);
      if (cachedMetrics) {
        healthCheckCounter.inc({ type: 'detailed', status: 'cache_hit' });
        res.format({
          'application/json': () => res.json(cachedMetrics),
          'text/plain': () => res.send(cachedMetrics),
        });
        return;
      }

      // Collect detailed metrics
      const metrics = await this.collectDetailedMetrics();

      if (wantsPrometheus) {
        const prometheusMetrics = await register.metrics();
        metricsCache.set('prometheusMetrics', prometheusMetrics);
        res.set('Content-Type', register.contentType);
        res.send(prometheusMetrics);
      } else {
        metricsCache.set('healthMetrics', metrics);
        res.json(metrics);
      }

      healthCheckCounter.inc({ type: 'detailed', status: 'success' });
    } catch (error) {
      logger.error('Detailed health check failed', error as Error);
      healthCheckCounter.inc({ type: 'detailed', status: 'error' });
      res.status(500).json({
        status: 'DOWN',
        error: ErrorCode.SERVICE_UNAVAILABLE,
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Checks the status of critical service dependencies
   */
  private async checkDependencies(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    const timeoutMs = 2000; // 2 second timeout

    const checkWithTimeout = async (name: string, checkFn: () => Promise<boolean>) => {
      try {
        const result = await Promise.race([
          checkFn(),
          new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeoutMs)
          ),
        ]);
        results[name] = result;
      } catch (error) {
        results[name] = false;
        logger.error(`Dependency check failed for ${name}`, error as Error);
      }
    };

    await Promise.all([
      checkWithTimeout('database', this.checkDatabase),
      checkWithTimeout('cache', this.checkCache),
      checkWithTimeout('messageQueue', this.checkMessageQueue),
    ]);

    return results;
  }

  /**
   * Evaluates overall system status based on dependency checks
   */
  private evaluateDependencyStatus(dependencies: Record<string, boolean>) {
    const critical = ['database', 'cache'];
    const nonCritical = ['messageQueue'];

    const criticalStatus = critical.every(dep => dependencies[dep]);
    const nonCriticalStatus = nonCritical.every(dep => dependencies[dep]);

    return {
      status: criticalStatus ? (nonCriticalStatus ? 'UP' : 'DEGRADED') : 'DOWN',
      timestamp: new Date().toISOString(),
      dependencies,
    };
  }

  /**
   * Collects detailed system and performance metrics
   */
  private async collectDetailedMetrics(): Promise<HealthMetrics> {
    const metrics: HealthMetrics = {
      status: 'UP',
      timestamp: new Date().toISOString(),
      version: this.version,
      uptime: (Date.now() - this.startTime) / 1000,
      system: {
        cpu: process.cpuUsage().system,
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
        },
        connections: await this.getActiveConnections(),
      },
      dependencies: await this.getDependencyMetrics(),
      metrics: await this.getPerformanceMetrics(),
    };

    return metrics;
  }

  // Dependency check implementations
  private checkDatabase = async (): Promise<boolean> => {
    // Implementation would check actual database connection
    return true;
  };

  private checkCache = async (): Promise<boolean> => {
    // Implementation would check actual cache connection
    return true;
  };

  private checkMessageQueue = async (): Promise<boolean> => {
    // Implementation would check actual message queue connection
    return true;
  };

  // Metric collection helpers
  private async getActiveConnections(): Promise<number> {
    // Implementation would return actual connection count
    return 0;
  }

  private async getDependencyMetrics() {
    // Implementation would collect actual dependency metrics
    return {
      database: { status: 'UP', responseTime: 0 },
      cache: { status: 'UP', responseTime: 0 },
      messageQueue: { status: 'UP', responseTime: 0 },
    };
  }

  private async getPerformanceMetrics() {
    // Implementation would collect actual performance metrics
    return {
      requestsPerSecond: 0,
      averageResponseTime: 0,
      errorRate: 0,
    };
  }
}

// Export controller instance
export const healthController = new HealthController();