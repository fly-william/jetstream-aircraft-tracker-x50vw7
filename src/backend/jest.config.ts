import type { Config } from '@jest/types'; // @version ^29.0.0

const config: Config.InitialOptions = {
  // Use ts-jest as the TypeScript preprocessor
  preset: 'ts-jest',
  
  // Set Node.js as the test environment
  testEnvironment: 'node',
  
  // Define root directories for tests and source files
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests'
  ],
  
  // Pattern matching for test files
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx)',
    '**/?(*.)+(spec|test).+(ts|tsx)'
  ],
  
  // TypeScript transformation configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  
  // Path aliases for cleaner imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // Test setup and teardown configuration
  setupFilesAfterEnv: [
    '<rootDir>/tests/utils/test-setup.ts'
  ],
  globalSetup: '<rootDir>/tests/utils/global-setup.ts',
  globalTeardown: '<rootDir>/tests/utils/global-teardown.ts',
  
  // Coverage configuration
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'lcov',
    'json-summary',
    'html'
  ],
  
  // Files to include in coverage analysis
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**/*',
    '!src/migrations/**/*',
    '!src/**/index.ts'
  ],
  
  // Coverage thresholds to maintain code quality
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Test execution configuration
  testTimeout: 30000,
  verbose: true,
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],
  
  // File extensions to consider
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],
  
  // Performance and reliability settings
  maxWorkers: '50%',
  errorOnDeprecated: true,
  detectOpenHandles: true,
  forceExit: true,
  
  // Global variables available in all test files
  globals: {
    'TEST_TIMEOUT': 30000,
    'NODE_ENV': 'test'
  }
};

export default config;