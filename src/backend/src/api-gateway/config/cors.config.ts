/**
 * @file CORS Configuration for JetStream API Gateway
 * @version 1.0.0
 * @description Implements secure cross-origin resource sharing policies with environment-specific configurations
 * and enhanced security headers for the JetStream platform API Gateway.
 */

// cors@2.8.5 - CORS middleware configuration for Express
import cors from 'cors';

/**
 * Interface defining comprehensive CORS configuration structure with security options
 */
interface ICorsConfig extends cors.CorsOptions {
  successCallback: (origin: string) => void;
  errorCallback: (error: Error) => void;
}

/**
 * Environment-specific allowed origins
 */
const ALLOWED_ORIGINS = {
  development: ['http://localhost:5173', 'http://localhost:3000'],
  staging: ['https://staging.jetstream.flyusa.com'],
  production: ['https://jetstream.flyusa.com', 'https://api.jetstream.flyusa.com']
};

/**
 * Allowed HTTP methods
 */
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

/**
 * Allowed request headers
 */
const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Accept',
  'Origin',
  'Access-Control-Allow-Headers',
  'X-API-Key',
  'X-Transaction-ID'
];

/**
 * Security headers exposed to clients
 */
const SECURITY_HEADERS = [
  'Content-Security-Policy',
  'X-Content-Type-Options',
  'X-Frame-Options',
  'X-XSS-Protection'
];

/**
 * Validates incoming origin against allowed list with pattern matching
 * @param origin - Origin to validate
 * @returns boolean indicating if origin is allowed
 */
const validateOrigin = (origin: string): boolean => {
  const environment = process.env.NODE_ENV || 'development';
  const allowedOriginsList = ALLOWED_ORIGINS[environment as keyof typeof ALLOWED_ORIGINS];

  if (!origin) {
    return false;
  }

  return allowedOriginsList.some(allowedOrigin => {
    // Exact match check
    if (allowedOrigin === origin) {
      return true;
    }

    // Pattern matching for subdomains in production
    if (environment === 'production') {
      const originPattern = new RegExp(
        `^https:\/\/[a-zA-Z0-9-]+\.jetstream\.flyusa\.com$`
      );
      return originPattern.test(origin);
    }

    return false;
  });
};

/**
 * Returns environment-specific CORS configuration with enhanced security options
 */
const getCorsConfig = (): ICorsConfig => {
  return {
    origin: (origin: string, callback: (error: Error | null, allow: boolean) => void) => {
      try {
        if (validateOrigin(origin)) {
          corsConfig.successCallback(origin);
          callback(null, true);
        } else {
          const error = new Error(`Origin ${origin} not allowed by CORS policy`);
          corsConfig.errorCallback(error);
          callback(error, false);
        }
      } catch (error) {
        corsConfig.errorCallback(error as Error);
        callback(error as Error, false);
      }
    },
    methods: ALLOWED_METHODS,
    allowedHeaders: ALLOWED_HEADERS,
    exposedHeaders: SECURITY_HEADERS,
    credentials: true,
    maxAge: 3600,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    successCallback: (origin: string) => {
      console.info(`CORS: Allowed origin ${origin}`);
    },
    errorCallback: (error: Error) => {
      console.error(`CORS Error: ${error.message}`);
    }
  };
};

/**
 * Export the CORS configuration with enhanced security controls
 */
export const corsConfig = getCorsConfig();

/**
 * Export individual configuration elements for flexible usage
 */
export const {
  origin,
  methods,
  allowedHeaders,
  exposedHeaders,
  credentials,
  maxAge,
  preflightContinue,
  optionsSuccessStatus
} = corsConfig;