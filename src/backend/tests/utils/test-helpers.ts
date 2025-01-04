/**
 * @fileoverview Comprehensive utility functions for setting up, managing, and cleaning up test data,
 * mocks, and common test operations across the JetStream backend test suites.
 */

import { jest } from '@jest/globals'; // v29.0.0
import { Pool, PoolConfig } from 'pg'; // v8.11.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { logger } from '../../src/common/utils/logger';

/**
 * Test database configuration with performance optimization settings
 */
const TEST_DB_CONFIG: PoolConfig & { name: string; isolation: string } = {
  name: 'jetstream_test',
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  user: process.env.TEST_DB_USER || 'test_user',
  password: process.env.TEST_DB_PASSWORD || 'test_password',
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000
  },
  isolation: 'SERIALIZABLE'
};

/**
 * Default mock coordinates for test data generation
 */
const DEFAULT_MOCK_COORDINATES = {
  latitude: 42.3601,
  longitude: -71.0589,
  accuracy: 0.0001
};

/**
 * Performance thresholds for test operations (in milliseconds)
 */
const TEST_PERFORMANCE_THRESHOLDS = {
  dbCreation: 5000,
  dbCleanup: 3000,
  mockGeneration: 100
};

/**
 * Interface for test database creation options
 */
interface TestDatabaseOptions {
  parallel?: boolean;
  schema?: string[];
  extensions?: string[];
  performanceMonitoring?: boolean;
}

/**
 * Creates and initializes a test database with required schema and extensions
 */
export async function createTestDatabase(options: TestDatabaseOptions = {}): Promise<void> {
  const startTime = Date.now();
  const dbName = options.parallel ? `${TEST_DB_CONFIG.name}_${uuidv4().slice(0, 8)}` : TEST_DB_CONFIG.name;
  
  const pool = new Pool({
    ...TEST_DB_CONFIG,
    database: 'postgres' // Connect to default db first
  });

  try {
    // Create test database
    await pool.query(`CREATE DATABASE ${dbName}`);
    await pool.end();

    // Connect to new test database
    const testPool = new Pool({
      ...TEST_DB_CONFIG,
      database: dbName
    });

    // Initialize extensions
    const defaultExtensions = ['postgis', 'timescaledb'];
    const extensions = [...defaultExtensions, ...(options.extensions || [])];
    for (const extension of extensions) {
      await testPool.query(`CREATE EXTENSION IF NOT EXISTS ${extension}`);
    }

    // Apply schema migrations
    const defaultSchema = ['public', 'tracking', 'trips'];
    const schemas = [...defaultSchema, ...(options.schema || [])];
    for (const schema of schemas) {
      await testPool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    }

    // Set up performance monitoring if enabled
    if (options.performanceMonitoring) {
      await testPool.query(`
        CREATE TABLE IF NOT EXISTS test_metrics (
          id SERIAL PRIMARY KEY,
          operation VARCHAR(100),
          duration INTEGER,
          timestamp TIMESTAMPTZ DEFAULT NOW()
        )
      `);
    }

    const duration = Date.now() - startTime;
    logger.info('Test database created successfully', {
      dbName,
      duration,
      extensions,
      schemas
    });

    if (duration > TEST_PERFORMANCE_THRESHOLDS.dbCreation) {
      logger.warn('Database creation exceeded performance threshold', {
        duration,
        threshold: TEST_PERFORMANCE_THRESHOLDS.dbCreation
      });
    }

    await testPool.end();
  } catch (error) {
    logger.error('Failed to create test database', error as Error);
    throw error;
  }
}

/**
 * Interface for test database cleanup options
 */
interface CleanupOptions {
  verify?: boolean;
  keepSchema?: boolean;
  performanceMonitoring?: boolean;
}

/**
 * Thoroughly cleans up test database ensuring complete data isolation
 */
export async function cleanupTestDatabase(options: CleanupOptions = {}): Promise<void> {
  const startTime = Date.now();
  const pool = new Pool(TEST_DB_CONFIG);

  try {
    // Acquire exclusive lock
    await pool.query('BEGIN');
    await pool.query('LOCK TABLE pg_catalog.pg_database');

    // Terminate existing connections
    await pool.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [TEST_DB_CONFIG.name]);

    // Truncate all tables
    const schemas = await pool.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
    `);

    for (const schema of schemas.rows) {
      await pool.query(`
        DO $$ DECLARE
          r RECORD;
        BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = '${schema.schema_name}')
          LOOP
            EXECUTE 'TRUNCATE TABLE ' || quote_ident(schema.schema_name) || '.' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
        END $$;
      `);
    }

    // Reset sequences
    await pool.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT sequence_name FROM information_schema.sequences)
        LOOP
          EXECUTE 'ALTER SEQUENCE ' || quote_ident(r.sequence_name) || ' RESTART WITH 1';
        END LOOP;
      END $$;
    `);

    // Verify cleanup if requested
    if (options.verify) {
      const tables = await pool.query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        AND table_type = 'BASE TABLE'
      `);
      
      if (tables.rows[0].count > 0) {
        throw new Error('Database cleanup verification failed');
      }
    }

    await pool.query('COMMIT');

    const duration = Date.now() - startTime;
    logger.info('Test database cleaned up successfully', {
      duration,
      verified: options.verify
    });

    if (duration > TEST_PERFORMANCE_THRESHOLDS.dbCleanup) {
      logger.warn('Database cleanup exceeded performance threshold', {
        duration,
        threshold: TEST_PERFORMANCE_THRESHOLDS.dbCleanup
      });
    }

    await pool.end();
  } catch (error) {
    await pool.query('ROLLBACK');
    logger.error('Failed to clean up test database', error as Error);
    throw error;
  }
}

/**
 * Interface for mock trip data generation options
 */
interface MockTripOptions {
  status?: string;
  aircraft?: string;
  departure?: Date;
  arrival?: Date;
  coordinates?: typeof DEFAULT_MOCK_COORDINATES;
}

/**
 * Generates comprehensive mock trip data with realistic values
 */
export function generateMockTrip(options: MockTripOptions = {}): any {
  const startTime = Date.now();
  
  try {
    const tripId = uuidv4();
    const now = new Date();
    const defaultDeparture = new Date(now.getTime() + 3600000); // 1 hour from now
    const defaultArrival = new Date(now.getTime() + 7200000); // 2 hours from now

    const mockTrip = {
      id: tripId,
      status: options.status || 'SCHEDULED',
      aircraft_id: options.aircraft || uuidv4(),
      departure_time: options.departure || defaultDeparture,
      arrival_time: options.arrival || defaultArrival,
      departure_airport: 'KBOS',
      arrival_airport: 'KJFK',
      coordinates: options.coordinates || DEFAULT_MOCK_COORDINATES,
      service_requests: [
        {
          id: uuidv4(),
          trip_id: tripId,
          type: 'CATERING',
          status: 'PENDING'
        }
      ],
      created_at: now,
      updated_at: now
    };

    const duration = Date.now() - startTime;
    if (duration > TEST_PERFORMANCE_THRESHOLDS.mockGeneration) {
      logger.warn('Mock trip generation exceeded performance threshold', {
        duration,
        threshold: TEST_PERFORMANCE_THRESHOLDS.mockGeneration
      });
    }

    return mockTrip;
  } catch (error) {
    logger.error('Failed to generate mock trip data', error as Error);
    throw error;
  }
}