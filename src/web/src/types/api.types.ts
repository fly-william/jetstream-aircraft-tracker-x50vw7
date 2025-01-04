/**
 * @fileoverview TypeScript type definitions for API requests, responses, and error handling
 * @version 1.0.0
 */

// External imports
import { AxiosResponse, AxiosError } from 'axios'; // version: ^1.6.0

// Internal imports
import { Aircraft, AircraftList } from './aircraft.types';
import { Trip, TripStatus } from './trip.types';
import { HTTP_STATUS } from '../constants/api.constants';

/**
 * Generic API response interface with enhanced status typing
 */
export interface ApiResponse<T = unknown> {
  /** Response data of generic type T */
  readonly data: T;
  /** HTTP status code from response */
  readonly status: HTTP_STATUS;
  /** Response message */
  readonly message: string;
  /** Response timestamp */
  readonly timestamp: string;
}

/**
 * Enhanced API error response interface
 */
export interface ApiError {
  /** Error code identifier */
  readonly code: string;
  /** Error message */
  readonly message: string;
  /** Detailed error information */
  readonly details: Record<string, unknown>;
  /** Error timestamp */
  readonly timestamp: string;
  /** Request path that caused the error */
  readonly path: string;
}

/**
 * Enhanced generic paginated response interface
 */
export interface PaginatedResponse<T> {
  /** Array of items of type T */
  readonly items: T[];
  /** Total number of items */
  readonly total: number;
  /** Current page number */
  readonly page: number;
  /** Number of items per page */
  readonly pageSize: number;
  /** Total number of pages */
  readonly totalPages: number;
}

/**
 * Enhanced authentication response interface
 */
export interface AuthResponse {
  /** JWT access token */
  readonly accessToken: string;
  /** JWT refresh token */
  readonly refreshToken: string;
  /** Token expiration time in seconds */
  readonly expiresIn: number;
  /** Token type (e.g., 'Bearer') */
  readonly tokenType: string;
  /** Array of granted scopes */
  readonly scope: string[];
}

/**
 * Type alias for API response with specific data type
 */
export type ApiResponseType<T> = ApiResponse<T>;

/**
 * Type alias for paginated response with specific item type
 */
export type PaginatedResponseType<T> = PaginatedResponse<T>;

/**
 * Type alias for API error with specific error details
 */
export type ApiErrorType<T = Record<string, unknown>> = ApiError & { details: T };

/**
 * Type guard for checking if response is an API error
 */
export function isApiError(response: unknown): response is ApiError {
  return (
    typeof response === 'object' &&
    response !== null &&
    'code' in response &&
    'message' in response &&
    'details' in response &&
    'timestamp' in response &&
    'path' in response
  );
}

/**
 * Type guard for checking if response is an auth response
 */
export function isAuthResponse(response: unknown): response is AuthResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'accessToken' in response &&
    'refreshToken' in response &&
    'expiresIn' in response &&
    'tokenType' in response &&
    'scope' in response
  );
}

/**
 * Common API request types
 */
export interface ApiRequestHeaders {
  /** Authorization header */
  readonly Authorization?: string;
  /** API version header */
  readonly 'X-API-Version': string;
  /** Content type header */
  readonly 'Content-Type': string;
  /** Accept header */
  readonly Accept: string;
}

/**
 * Aircraft-specific API response types
 */
export type AircraftResponseType = ApiResponse<Aircraft>;
export type AircraftListResponseType = ApiResponse<PaginatedResponse<Aircraft>>;
export type AircraftErrorType = ApiErrorType<{ aircraftId: string }>;

/**
 * Trip-specific API response types
 */
export type TripResponseType = ApiResponse<Trip>;
export type TripListResponseType = ApiResponse<PaginatedResponse<Trip>>;
export type TripStatusResponseType = ApiResponse<{ status: TripStatus }>;
export type TripErrorType = ApiErrorType<{ tripId: string }>;

/**
 * Enhanced error handling types
 */
export interface ApiErrorResponse extends AxiosError<ApiError> {
  /** Response data with error details */
  response?: AxiosResponse<ApiError>;
}

/**
 * WebSocket message types
 */
export interface WebSocketMessage<T = unknown> {
  /** Message type identifier */
  readonly type: string;
  /** Message payload */
  readonly payload: T;
  /** Message timestamp */
  readonly timestamp: string;
}

/**
 * Real-time update message types
 */
export type AircraftPositionUpdate = WebSocketMessage<{
  aircraftId: string;
  position: {
    latitude: number;
    longitude: number;
    altitude: number;
    timestamp: string;
  };
}>;

export type TripStatusUpdate = WebSocketMessage<{
  tripId: string;
  status: TripStatus;
  timestamp: string;
}>;