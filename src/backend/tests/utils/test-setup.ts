/**
 * @fileoverview Global test setup and teardown configuration for JetStream backend services.
 * Implements secure test environment initialization, database management, performance monitoring,
 * and comprehensive cleanup procedures.
 */

import { jest } from '@jest/globals'; // v29.0.0
import dotenv from 'dotenv'; // v16.0.0
import { logger } from '../../src/common/utils/logger';
import { createTestDatabase, cleanupTestDatabase } from './test-helpers';

// Test environment configuration constants
const TEST_CONFIG = {
  TIMEOUT: 30000,
  DB_PREFIX: 'test_',
  METRICS_ENABLED: true,
  PERFORMANCE_THRESHOLDS: {
    setup: 10000,
    teardown: 5000,
    testExecution: 1000
  }
} as const;

// Test metrics storage
const testMetrics = {
  startTime: 0,
  setupDuration: 0,
  teardownDuration: 0,
  testCount: 0,
  failedTests: 0,
  slowTests: new Set<string>()
};

/**
 * Global test environment setup with enhanced security and monitoring
 */
export async function setup(): Promise<void> {
  const setupStart = Date.now();
  
  try {
    // Load test environment variables
    const result = dotenv.config({ path: '.env.test' });
    if (result.error) {
      throw new Error('Failed to load test environment configuration');
    }

    // Configure test timeouts
    jest.setTimeout(TEST_CONFIG.TIMEOUT);

    // Initialize test database with security measures
    await createTestDatabase({
      parallel: true,
      performanceMonitoring: TEST_CONFIG.METRICS_ENABLED,
      extensions: ['pgcrypto'], // Enable encryption
      schema: ['test_data']
    });

    // Configure global test hooks
    beforeEach(async () => {
      await beforeEachTest();
    });

    afterEach(async () => {
      await afterEachTest();
    });

    testMetrics.startTime = Date.now();
    testMetrics.setupDuration = Date.now() - setupStart;

    logger.info('Test environment initialized successfully', {
      setupDuration: testMetrics.setupDuration,
      metricsEnabled: TEST_CONFIG.METRICS_ENABLED
    });

    if (testMetrics.setupDuration > TEST_CONFIG.PERFORMANCE_THRESHOLDS.setup) {
      logger.warn('Test setup exceeded performance threshold', {
        duration: testMetrics.setupDuration,
        threshold: TEST_CONFIG.PERFORMANCE_THRESHOLDS.setup
      });
    }
  } catch (error) {
    logger.error('Failed to initialize test environment', error as Error);
    throw error;
  }
}

/**
 * Global test environment teardown with verification
 */
export async function teardown(): Promise<void> {
  const teardownStart = Date.now();

  try {
    // Generate test execution report
    const testReport = {
      totalDuration: Date.now() - testMetrics.startTime,
      setupDuration: testMetrics.setupDuration,
      teardownDuration: 0,
      totalTests: testMetrics.testCount,
      failedTests: testMetrics.failedTests,
      slowTests: Array.from(testMetrics.slowTests)
    };

    // Perform secure database cleanup
    await cleanupTestDatabase({
      verify: true,
      performanceMonitoring: TEST_CONFIG.METRICS_ENABLED
    });

    // Clear all mocks and spies
    jest.clearAllMocks();
    jest.clearAllTimers();

    testReport.teardownDuration = Date.now() - teardownStart;

    logger.info('Test environment cleanup completed', testReport);

    if (testReport.teardownDuration > TEST_CONFIG.PERFORMANCE_THRESHOLDS.teardown) {
      logger.warn('Test teardown exceeded performance threshold', {
        duration: testReport.teardownDuration,
        threshold: TEST_CONFIG.PERFORMANCE_THRESHOLDS.teardown
      });
    }
  } catch (error) {
    logger.error('Failed to cleanup test environment', error as Error);
    throw error;
  }
}

/**
 * Pre-test initialization with isolation and monitoring
 */
async function beforeEachTest(): Promise<void> {
  const testStart = Date.now();

  try {
    // Reset database state for test isolation
    await cleanupTestDatabase({
      keepSchema: true,
      verify: true
    });

    // Clear mocks and timers
    jest.clearAllMocks();
    jest.clearAllTimers();

    // Initialize test metrics
    testMetrics.testCount++;

    // Set up test-specific monitoring
    if (TEST_CONFIG.METRICS_ENABLED) {
      const testInfo = expect.getState();
      logger.debug('Starting test execution', {
        testName: testInfo.currentTestName,
        testFile: testInfo.testPath
      });
    }
  } catch (error) {
    logger.error('Failed to initialize test', error as Error);
    throw error;
  }
}

/**
 * Post-test cleanup with verification
 */
async function afterEachTest(): Promise<void> {
  try {
    const testInfo = expect.getState();
    const testDuration = Date.now() - testInfo.start;

    // Track slow tests
    if (testDuration > TEST_CONFIG.PERFORMANCE_THRESHOLDS.testExecution) {
      testMetrics.slowTests.add(testInfo.currentTestName || 'unknown');
    }

    // Track test failures
    if (testInfo.status === 'failed') {
      testMetrics.failedTests++;
    }

    // Log test completion metrics
    if (TEST_CONFIG.METRICS_ENABLED) {
      logger.debug('Test execution completed', {
        testName: testInfo.currentTestName,
        duration: testDuration,
        status: testInfo.status
      });
    }

    // Clear test-specific resources
    jest.clearAllMocks();
    jest.clearAllTimers();
  } catch (error) {
    logger.error('Failed to cleanup test', error as Error);
    throw error;
  }
}