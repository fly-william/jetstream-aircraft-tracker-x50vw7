/**
 * @fileoverview Redis configuration module for JetStream platform's real-time data caching
 * Implements cluster mode, AOF persistence, and Sentinel monitoring for high availability
 * @version Redis 7.x
 */

import Redis from 'ioredis'; // v5.3.0
import { logger } from '../common/utils/logger';
import { ErrorCode } from '../common/constants/error-codes';

/**
 * Interface defining Redis connection configuration
 */
interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  enableTLS: boolean;
  retryStrategy: {
    maxAttempts: number;
    backoffFactor: number;
    maxDelay: number;
  };
  sentinelConfig: {
    enabled: boolean;
    masterName?: string;
    sentinels?: { host: string; port: number }[];
  };
}

/**
 * Interface defining Redis cluster configuration
 */
interface RedisClusterConfig {
  nodes: RedisNode[];
  enableReadReplicas: boolean;
  maxRedirections: number;
  crossRegionReplicas: RedisNode[];
  failoverStrategy: {
    enableAutoFailover: boolean;
    failoverTimeout: number;
    maxFailoverAttempts: number;
  };
}

/**
 * Interface defining Redis node configuration
 */
interface RedisNode {
  host: string;
  port: number;
}

/**
 * Redis connection configuration
 */
export const REDIS_CONFIG: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 0,
  enableTLS: process.env.REDIS_TLS === 'true',
  retryStrategy: {
    maxAttempts: 5,
    backoffFactor: 1.5,
    maxDelay: 5000,
  },
  sentinelConfig: {
    enabled: process.env.REDIS_SENTINEL_ENABLED === 'true',
    masterName: process.env.REDIS_SENTINEL_MASTER_NAME,
    sentinels: [{
      host: process.env.REDIS_SENTINEL_HOST || 'localhost',
      port: parseInt(process.env.REDIS_SENTINEL_PORT || '26379'),
    }],
  },
};

/**
 * Redis cluster configuration
 */
export const REDIS_CLUSTER_CONFIG: RedisClusterConfig = {
  nodes: [{
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  }],
  enableReadReplicas: true,
  maxRedirections: 16,
  crossRegionReplicas: [{
    host: process.env.REDIS_DR_HOST || 'localhost',
    port: parseInt(process.env.REDIS_DR_PORT || '6379'),
  }],
  failoverStrategy: {
    enableAutoFailover: true,
    failoverTimeout: 10000,
    maxFailoverAttempts: 3,
  },
};

/**
 * Cache TTL configuration (in seconds)
 */
export const CACHE_TTL = {
  POSITION_DATA: 300, // 5 minutes
  TRIP_DATA: 600,    // 10 minutes
  USER_SESSION: 1800 // 30 minutes
};

/**
 * Creates and configures a Redis client instance
 * @param config - Redis configuration
 * @returns Configured Redis client instance
 */
export const createRedisClient = (config: RedisConfig): Redis => {
  const redisOptions: Redis.RedisOptions = {
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db,
    tls: config.enableTLS ? {} : undefined,
    retryStrategy: (times: number) => {
      if (times > config.retryStrategy.maxAttempts) {
        logger.error('Redis connection failed after maximum retry attempts');
        return null;
      }
      const delay = Math.min(
        times * config.retryStrategy.backoffFactor * 1000,
        config.retryStrategy.maxDelay
      );
      return delay;
    },
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
  };

  if (config.sentinelConfig.enabled && config.sentinelConfig.masterName && config.sentinelConfig.sentinels) {
    return new Redis({
      ...redisOptions,
      sentinels: config.sentinelConfig.sentinels,
      name: config.sentinelConfig.masterName,
      role: 'master',
    });
  }

  return new Redis(redisOptions);
};

/**
 * Creates and configures a Redis cluster client
 * @param config - Redis cluster configuration
 * @returns Configured Redis cluster instance
 */
export const createRedisCluster = (config: RedisClusterConfig): Redis.Cluster => {
  const clusterOptions: Redis.ClusterOptions = {
    nodes: config.nodes,
    redisOptions: {
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
    },
    enableReadyCheck: true,
    maxRedirections: config.maxRedirections,
    retryDelayOnFailover: 2000,
    retryDelayOnClusterDown: 1000,
    enableOfflineQueue: true,
    scaleReads: config.enableReadReplicas ? 'slave' : 'master',
  };

  const cluster = new Redis.Cluster(config.nodes, clusterOptions);

  // Configure event handlers
  cluster.on('connect', () => {
    logger.info('Redis cluster connected');
  });

  cluster.on('error', (error) => {
    logger.error('Redis cluster error', error, { errorCode: ErrorCode.SERVICE_UNAVAILABLE });
  });

  cluster.on('node:error', (error, node) => {
    logger.error(`Redis cluster node error: ${node.address}`, error);
  });

  return cluster;
};

// Create singleton instances
export const redisClient = createRedisClient(REDIS_CONFIG);
export const redisCluster = createRedisCluster(REDIS_CLUSTER_CONFIG);

// Export commonly used methods
export const { get, set, del } = redisClient;