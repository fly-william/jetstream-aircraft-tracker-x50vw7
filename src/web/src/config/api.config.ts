/**
 * API Configuration for JetStream Web Application
 * @version 1.0.0
 * @description Configures API communication settings and endpoints for secure interaction with the JetStream backend
 */

// Global constants for API configuration
const API_VERSION = 'v1';
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY = 1000;

/**
 * Interface for API retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryStatusCodes: number[];
  backoffFactor: number;
}

/**
 * Interface defining all API endpoint paths
 */
export interface APIEndpoints {
  auth: {
    login: string;
    logout: string;
    refresh: string;
    verifyMFA: string;
  };
  aircraft: {
    list: string;
    details: string;
    position: string;
    tracking: string;
  };
  trips: {
    list: string;
    details: string;
    status: string;
    milestones: string;
    services: string;
  };
  notifications: {
    list: string;
    status: string;
    preferences: string;
    subscribe: string;
  };
}

/**
 * Main configuration interface for API settings
 */
export interface APIConfig {
  baseURL: string;
  version: string;
  timeout: number;
  headers: Record<string, string>;
  endpoints: APIEndpoints;
  retryConfig: RetryConfig;
}

/**
 * Default security headers for API requests
 */
const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-API-Version': API_VERSION,
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block'
};

/**
 * API endpoint definitions
 */
const ENDPOINTS: APIEndpoints = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    verifyMFA: '/auth/verify-mfa'
  },
  aircraft: {
    list: '/aircraft',
    details: '/aircraft/:id',
    position: '/aircraft/:id/position',
    tracking: '/aircraft/:id/tracking'
  },
  trips: {
    list: '/trips',
    details: '/trips/:id',
    status: '/trips/:id/status',
    milestones: '/trips/:id/milestones',
    services: '/trips/:id/services'
  },
  notifications: {
    list: '/notifications',
    status: '/notifications/:id/status',
    preferences: '/notifications/preferences',
    subscribe: '/notifications/subscribe'
  }
};

/**
 * Retry configuration for failed API requests
 */
const RETRY_CONFIG: RetryConfig = {
  maxRetries: DEFAULT_RETRY_ATTEMPTS,
  retryDelay: DEFAULT_RETRY_DELAY,
  retryStatusCodes: [408, 429, 500, 502, 503, 504],
  backoffFactor: 2
};

/**
 * Main API configuration object
 */
export const apiConfig: APIConfig = {
  baseURL: process.env.REACT_APP_API_BASE_URL || 'https://api.jetstream.flyusa.com',
  version: API_VERSION,
  timeout: DEFAULT_TIMEOUT,
  headers: DEFAULT_HEADERS,
  endpoints: ENDPOINTS,
  retryConfig: RETRY_CONFIG
};

/**
 * Export individual configuration elements for granular access
 */
export const {
  baseURL,
  version,
  timeout,
  headers,
  endpoints,
  retryConfig
} = apiConfig;