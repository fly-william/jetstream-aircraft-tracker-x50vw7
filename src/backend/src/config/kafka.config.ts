/**
 * @fileoverview Comprehensive Kafka configuration for JetStream's event-driven architecture
 * supporting real-time aircraft tracking, trip management, and system notifications.
 * Version: kafkajs@2.2.4
 */

import { KafkaConfig } from 'kafkajs';
import { logger } from '../common/utils/logger';

/**
 * Environment-specific Kafka configuration interface with enhanced security and monitoring
 */
interface KafkaEnvironmentConfig {
  brokers: string[];
  clientId: string;
  groupId: string;
  ssl: boolean;
  sasl: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };
  monitoring: {
    metricInterval: number;
    logLevel: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG';
  };
}

/**
 * Kafka topic configuration for different event types
 */
export const KAFKA_TOPICS = {
  AIRCRAFT_POSITIONS: 'jetstream.aircraft.positions',
  TRIP_UPDATES: 'jetstream.trip.updates',
  NOTIFICATIONS: 'jetstream.notifications',
  ERROR_EVENTS: 'jetstream.errors',
  DEAD_LETTER: 'jetstream.dlq',
  HEALTH_CHECKS: 'jetstream.health'
} as const;

/**
 * Retry and circuit breaker configuration
 */
export const KAFKA_RETRY_OPTIONS = {
  retries: 5,
  initialRetryTime: 1000, // 1 second
  maxRetryTime: 30000, // 30 seconds
  factor: 2,
  multiplier: 1.5,
  failureThreshold: 3,
  circuitBreakerTimeout: 60000 // 1 minute
} as const;

/**
 * Consumer configuration with optimized settings for real-time data processing
 */
export const KAFKA_CONSUMER_CONFIG = {
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
  maxBytesPerPartition: 1048576, // 1MB
  autoCommitInterval: 5000,
  fetchMinBytes: 1,
  fetchMaxBytes: 5242880, // 5MB
  maxWaitTimeInMs: 100,
  allowAutoTopicCreation: false,
  partitionAssignmentStrategy: ['roundrobin', 'range']
} as const;

/**
 * Producer configuration with reliability and performance settings
 */
export const KAFKA_PRODUCER_CONFIG = {
  acks: 'all',
  compression: 'gzip',
  idempotent: true,
  maxInFlightRequests: 5,
  batchSize: 16384, // 16KB
  lingerMs: 10,
  requestTimeout: 30000
} as const;

/**
 * Creates comprehensive Kafka configuration with security, monitoring, and performance settings
 */
export const createKafkaConfig = (): KafkaConfig => {
  try {
    // Load environment configuration
    const envConfig: KafkaEnvironmentConfig = {
      brokers: process.env.KAFKA_BROKERS?.split(',') || [],
      clientId: process.env.KAFKA_CLIENT_ID || 'jetstream-service',
      groupId: process.env.KAFKA_GROUP_ID || 'jetstream-consumer-group',
      ssl: process.env.KAFKA_SSL === 'true',
      sasl: {
        mechanism: (process.env.KAFKA_SASL_MECHANISM || 'plain') as 'plain' | 'scram-sha-256' | 'scram-sha-512',
        username: process.env.KAFKA_SASL_USERNAME || '',
        password: process.env.KAFKA_SASL_PASSWORD || ''
      },
      monitoring: {
        metricInterval: parseInt(process.env.KAFKA_METRIC_INTERVAL || '30000', 10),
        logLevel: (process.env.KAFKA_LOG_LEVEL || 'INFO') as 'INFO' | 'ERROR' | 'WARN' | 'DEBUG'
      }
    };

    // Validate required configuration
    if (!envConfig.brokers.length) {
      throw new Error('Kafka brokers configuration is required');
    }

    logger.info('Initializing Kafka configuration', { clientId: envConfig.clientId });

    // Create comprehensive Kafka configuration
    const config: KafkaConfig = {
      clientId: envConfig.clientId,
      brokers: envConfig.brokers,
      ssl: envConfig.ssl,
      sasl: envConfig.ssl ? envConfig.sasl : undefined,
      connectionTimeout: 10000,
      authenticationTimeout: 10000,
      retry: {
        initialRetryTime: KAFKA_RETRY_OPTIONS.initialRetryTime,
        maxRetryTime: KAFKA_RETRY_OPTIONS.maxRetryTime,
        retries: KAFKA_RETRY_OPTIONS.retries,
        factor: KAFKA_RETRY_OPTIONS.factor,
        multiplier: KAFKA_RETRY_OPTIONS.multiplier
      },
      logLevel: envConfig.monitoring.logLevel,
      instrumentationEmitter: {
        emit: (event: any) => {
          if (event.type === 'error') {
            logger.error('Kafka instrumentation error', event.payload);
          }
        }
      }
    };

    logger.info('Kafka configuration initialized successfully');
    return config;

  } catch (error) {
    logger.error('Failed to create Kafka configuration', error);
    throw error;
  }
};

export default {
  createKafkaConfig,
  KAFKA_TOPICS,
  KAFKA_RETRY_OPTIONS,
  KAFKA_CONSUMER_CONFIG,
  KAFKA_PRODUCER_CONFIG
};