/**
 * @fileoverview Jest configuration for JetStream web frontend application
 * @version 1.0.0
 */

import type { Config } from '@jest/types'; // version: 29.x

/**
 * Creates and exports the Jest configuration object with comprehensive testing setup
 * for React components and real-time features
 */
const createJestConfig = (): Config.InitialOptions => ({
  // Use ts-jest for TypeScript compilation
  preset: 'ts-jest',

  // Configure jsdom test environment for DOM testing
  testEnvironment: 'jsdom',

  // Setup file for global test configuration
  setupFilesAfterEnv: ['<rootDir>/tests/utils/test-setup.ts'],

  // Module name mapping for TypeScript path aliases and asset mocking
  moduleNameMapper: {
    // TypeScript path aliases
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',

    // Asset mocks
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/tests/utils/file-mock.ts'
  },

  // TypeScript configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json'
    }]
  },

  // Test file patterns
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Coverage configuration
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover', 'html'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/vite-env.d.ts',
    '!src/main.tsx',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__mocks__/**'
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    }
  },

  // TypeScript compiler options for ts-jest
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
      isolatedModules: true
    }
  },

  // Paths to ignore during testing
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/.storybook/'
  ],
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/.storybook/'
  ],

  // Test timeout configuration
  testTimeout: 10000
});

// Export the configuration
export default createJestConfig();