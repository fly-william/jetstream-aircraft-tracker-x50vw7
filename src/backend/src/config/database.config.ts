/**
 * @fileoverview Database configuration module for JetStream platform providing comprehensive
 * connection settings and options for PostgreSQL and TimescaleDB instances with high-availability,
 * security, and performance optimizations.
 */

import { TypeOrmModuleOptions } from '@nestjs/typeorm'; // v10.0.0
import { DataSource } from 'typeorm'; // v0.3.17
import { logger } from '../common/utils/logger';

/**
 * Comprehensive interface defining all database configuration options
 */
interface DatabaseConfig {
  type: 'postgres';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  schema: string;
  ssl: {
    rejectUnauthorized: boolean;
    ca: string;
    key: string;
    cert: string;
  };
  replication?: {
    master: {
      host: string;
      port: number;
      username: string;
      password: string;
      database: string;
    };
    slaves: Array<{
      host: string;
      port: number;
      username: string;
      password: string;
      database: string;
    }>;
  };
  pool: {
    max: number;
    min: number;
    idleTimeout: number;
  };
  logging: boolean;
}

/**
 * Base configuration constants for main PostgreSQL database
 */
const MAIN_DB_CONFIG: Partial<DatabaseConfig> = {
  type: 'postgres',
  schema: 'public',
  logging: process.env.NODE_ENV !== 'production',
  pool: {
    max: 20,
    min: 5,
    idleTimeout: 30000,
  },
  ssl: {
    rejectUnauthorized: true,
    ca: process.env.DB_SSL_CA || '/path/to/ca.crt',
    key: process.env.DB_SSL_KEY || '/path/to/client-key.pem',
    cert: process.env.DB_SSL_CERT || '/path/to/client-cert.pem',
  },
};

/**
 * Base configuration constants for TimescaleDB instance
 */
const TIMESERIES_DB_CONFIG: Partial<DatabaseConfig> = {
  type: 'postgres',
  schema: 'timeseries',
  logging: process.env.NODE_ENV !== 'production',
  pool: {
    max: 30,
    min: 10,
    idleTimeout: 20000,
  },
  ssl: {
    rejectUnauthorized: true,
    ca: process.env.TSDB_SSL_CA || '/path/to/ca.crt',
    key: process.env.TSDB_SSL_KEY || '/path/to/client-key.pem',
    cert: process.env.TSDB_SSL_CERT || '/path/to/client-cert.pem',
  },
};

/**
 * Creates comprehensive configuration for main PostgreSQL database with high availability
 * and security settings
 */
export const createMainDatabaseConfig = (): TypeOrmModuleOptions => {
  try {
    const config: TypeOrmModuleOptions = {
      ...MAIN_DB_CONFIG,
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      synchronize: false,
      migrationsRun: true,
      replication: {
        master: {
          host: process.env.DB_MASTER_HOST || process.env.DB_HOST,
          port: parseInt(process.env.DB_MASTER_PORT || process.env.DB_PORT || '5432', 10),
          username: process.env.DB_MASTER_USERNAME || process.env.DB_USERNAME,
          password: process.env.DB_MASTER_PASSWORD || process.env.DB_PASSWORD,
          database: process.env.DB_DATABASE,
        },
        slaves: [
          {
            host: process.env.DB_SLAVE_HOST_1,
            port: parseInt(process.env.DB_SLAVE_PORT_1 || '5432', 10),
            username: process.env.DB_SLAVE_USERNAME_1,
            password: process.env.DB_SLAVE_PASSWORD_1,
            database: process.env.DB_DATABASE,
          },
        ].filter(slave => slave.host != null), // Only include configured slaves
      },
      extra: {
        max: MAIN_DB_CONFIG.pool?.max,
        min: MAIN_DB_CONFIG.pool?.min,
        idleTimeoutMillis: MAIN_DB_CONFIG.pool?.idleTimeout,
        statement_timeout: 10000, // 10s query timeout
        ssl: MAIN_DB_CONFIG.ssl,
      },
      autoLoadEntities: true,
      keepConnectionAlive: true,
    };

    logger.info('Main database configuration created successfully');
    return config;
  } catch (error) {
    logger.error('Failed to create main database configuration', error);
    throw error;
  }
};

/**
 * Creates specialized configuration for TimescaleDB instance with time-series optimizations
 */
export const createTimeSeriesDatabaseConfig = (): TypeOrmModuleOptions => {
  try {
    const config: TypeOrmModuleOptions = {
      ...TIMESERIES_DB_CONFIG,
      host: process.env.TSDB_HOST,
      port: parseInt(process.env.TSDB_PORT || '5432', 10),
      username: process.env.TSDB_USERNAME,
      password: process.env.TSDB_PASSWORD,
      database: process.env.TSDB_DATABASE,
      synchronize: false,
      migrationsRun: true,
      extra: {
        max: TIMESERIES_DB_CONFIG.pool?.max,
        min: TIMESERIES_DB_CONFIG.pool?.min,
        idleTimeoutMillis: TIMESERIES_DB_CONFIG.pool?.idleTimeout,
        // TimescaleDB specific settings
        timescaledb: {
          enableCompression: true,
          compressionInterval: '7 days',
          retentionInterval: '90 days',
          chunkTimeInterval: '1 day',
        },
        statement_timeout: 30000, // 30s for time-series queries
        ssl: TIMESERIES_DB_CONFIG.ssl,
      },
      autoLoadEntities: true,
      keepConnectionAlive: true,
    };

    logger.info('TimescaleDB configuration created successfully');
    return config;
  } catch (error) {
    logger.error('Failed to create TimescaleDB configuration', error);
    throw error;
  }
};

/**
 * Export database configuration factories
 */
export const databaseConfig = {
  createMainDatabaseConfig,
  createTimeSeriesDatabaseConfig,
};

export default databaseConfig;