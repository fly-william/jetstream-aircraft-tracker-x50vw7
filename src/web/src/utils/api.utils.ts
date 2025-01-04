/**
 * API Utilities for JetStream Web Application
 * @version 1.0.0
 * @description Provides utility functions for handling API requests, responses, error handling,
 * and request transformations with enhanced security features and real-time data handling
 */

// External imports
import axios, { AxiosInstance, AxiosError, AxiosResponse, AxiosRequestConfig } from 'axios'; // version: ^1.6.0

// Internal imports
import { baseURL, retryConfig } from '../config/api.config';
import { HTTP_STATUS } from '../constants/api.constants';
import { ApiResponse, ApiError, isApiError } from '../types/api.types';

/**
 * Security headers for API requests
 */
const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'",
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};

/**
 * Retry configuration for failed requests
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  backoffFactor: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504]
};

/**
 * Creates and configures an Axios instance with security features
 */
const createApiClient = (): AxiosInstance => {
  const instance = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      ...SECURITY_HEADERS,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  // Request interceptor for authentication and security
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling and retry logic
  instance.interceptors.response.use(
    (response) => transformResponse(response),
    async (error) => {
      const originalRequest = error.config;
      
      if (shouldRetryRequest(error, originalRequest)) {
        originalRequest.retryCount = (originalRequest.retryCount || 0) + 1;
        const delay = calculateRetryDelay(originalRequest.retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return instance(originalRequest);
      }
      
      return Promise.reject(handleApiError(error));
    }
  );

  return instance;
};

/**
 * Transforms API responses into standardized format with metadata
 */
const transformResponse = <T>(response: AxiosResponse<T>): ApiResponse<T> => {
  return {
    data: response.data,
    status: response.status as HTTP_STATUS,
    message: response.statusText,
    timestamp: new Date().toISOString(),
    metadata: {
      requestId: response.headers['x-request-id'],
      version: response.headers['x-api-version'],
      responseTime: response.headers['x-response-time']
    }
  };
};

/**
 * Handles API errors and transforms them into standardized format
 */
const handleApiError = (error: AxiosError): ApiError => {
  if (error.response && isApiError(error.response.data)) {
    return error.response.data;
  }

  return {
    code: error.code || 'UNKNOWN_ERROR',
    message: error.message || 'An unexpected error occurred',
    details: {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url
    },
    timestamp: new Date().toISOString(),
    path: error.config?.url || ''
  };
};

/**
 * Determines if a request should be retried based on error type and retry count
 */
const shouldRetryRequest = (error: AxiosError, request: AxiosRequestConfig & { retryCount?: number }): boolean => {
  const status = error.response?.status;
  const retryCount = request.retryCount || 0;
  
  return (
    retryCount < RETRY_CONFIG.maxRetries &&
    RETRY_CONFIG.retryableStatuses.includes(status || 0) &&
    !request.skipRetry
  );
};

/**
 * Calculates exponential backoff delay for retries
 */
const calculateRetryDelay = (retryCount: number): number => {
  return Math.min(
    1000 * Math.pow(RETRY_CONFIG.backoffFactor, retryCount - 1),
    10000
  );
};

/**
 * Builds URL query string from parameters with proper encoding
 */
const buildQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(`${key}[]`, String(item)));
      } else if (typeof value === 'object') {
        searchParams.append(key, JSON.stringify(value));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  return searchParams.toString();
};

// Create and export configured API client instance
export const apiClient = createApiClient();

// Export utility functions
export {
  handleApiError,
  buildQueryString,
  transformResponse,
  shouldRetryRequest,
  calculateRetryDelay
};