/**
 * API Constants for JetStream Web Application
 * @description Defines comprehensive constant values for API communication including endpoints,
 * methods, status codes, security headers, and error codes
 */

import { version as apiVersion } from '../config/api.config';

/**
 * HTTP Methods enum for API requests
 */
export enum HTTP_METHODS {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE'
}

/**
 * API endpoints object with enhanced security endpoints
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VERIFY_MFA: '/auth/verify-mfa',
    SETUP_MFA: '/auth/setup-mfa',
    RESET_MFA: '/auth/reset-mfa'
  },
  AIRCRAFT: {
    LIST: '/aircraft',
    DETAILS: '/aircraft/:id',
    POSITION: '/aircraft/:id/position',
    TRACKING: '/aircraft/:id/tracking',
    TELEMETRY: '/aircraft/:id/telemetry'
  },
  TRIPS: {
    LIST: '/trips',
    DETAILS: '/trips/:id',
    STATUS: '/trips/:id/status',
    MILESTONES: '/trips/:id/milestones',
    SERVICES: '/trips/:id/services',
    COORDINATION: '/trips/:id/coordination'
  },
  NOTIFICATIONS: {
    LIST: '/notifications',
    STATUS: '/notifications/:id/status',
    PREFERENCES: '/notifications/preferences',
    CHANNELS: '/notifications/channels',
    SUBSCRIPTIONS: '/notifications/subscriptions'
  }
} as const;

/**
 * HTTP Status codes enum including rate limiting
 */
export enum HTTP_STATUS {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  TOO_MANY_REQUESTS = 429,
  SERVER_ERROR = 500
}

/**
 * API Headers object with enhanced security headers
 */
export const API_HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  ACCEPT: 'Accept',
  AUTHORIZATION: 'Authorization',
  API_VERSION: 'X-API-Version',
  CONTENT_SECURITY_POLICY: 'Content-Security-Policy',
  FRAME_OPTIONS: 'X-Frame-Options',
  XSS_PROTECTION: 'X-XSS-Protection',
  HSTS: 'Strict-Transport-Security'
} as const;

/**
 * API Error codes enum with enhanced security error types
 */
export enum ERROR_CODES {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  INVALID_TOKEN_ERROR = 'INVALID_TOKEN_ERROR',
  MFA_REQUIRED_ERROR = 'MFA_REQUIRED_ERROR'
}

/**
 * Default API version from configuration
 */
export const API_VERSION = apiVersion;

/**
 * Content type constants for API requests
 */
export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM: 'application/x-www-form-urlencoded',
  MULTIPART: 'multipart/form-data'
} as const;

/**
 * Security header values
 */
export const SECURITY_HEADERS = {
  CONTENT_SECURITY_POLICY: "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self' https://api.jetstream.flyusa.com",
  FRAME_OPTIONS: 'DENY',
  XSS_PROTECTION: '1; mode=block',
  HSTS: 'max-age=31536000; includeSubDomains; preload'
} as const;

/**
 * Rate limiting constants
 */
export const RATE_LIMITS = {
  DEFAULT: 100,
  AIRCRAFT_POSITION: 300,
  TRIP_STATUS: 100,
  NOTIFICATIONS: 200
} as const;