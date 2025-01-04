/**
 * @fileoverview Defines standardized error codes and messages used across the JetStream platform
 * for consistent error handling, logging, and client responses. This supports system availability
 * monitoring and error rate tracking requirements.
 */

/**
 * Enumeration of standardized error codes used across the JetStream platform.
 * These codes provide consistent error identification for logging, monitoring,
 * and client responses.
 */
export enum ErrorCode {
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
    RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
    DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
    INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
    EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
    INVALID_POSITION_DATA = 'INVALID_POSITION_DATA',
    WEBSOCKET_ERROR = 'WEBSOCKET_ERROR',
    ADSB_DATA_ERROR = 'ADSB_DATA_ERROR',
    TEAMS_INTEGRATION_ERROR = 'TEAMS_INTEGRATION_ERROR',
    CRM_SYNC_ERROR = 'CRM_SYNC_ERROR'
}

/**
 * Enumeration of human-readable error messages corresponding to error codes.
 * These messages provide clear, actionable information to end users while
 * maintaining consistent messaging across the platform.
 */
export enum ErrorMessage {
    INTERNAL_SERVER_ERROR = 'An unexpected error occurred. Please try again or contact support if the issue persists.',
    VALIDATION_ERROR = 'The provided data is invalid. Please check your input and try again.',
    AUTHENTICATION_ERROR = 'Authentication failed. Please check your credentials and try again.',
    AUTHORIZATION_ERROR = 'You do not have permission to perform this action.',
    RESOURCE_NOT_FOUND = 'The requested resource could not be found.',
    DUPLICATE_RESOURCE = 'This resource already exists in the system.',
    INVALID_STATUS_TRANSITION = 'The requested status transition is not allowed for this trip.',
    SERVICE_UNAVAILABLE = 'The service is temporarily unavailable. Please try again later.',
    EXTERNAL_SERVICE_ERROR = 'An error occurred while communicating with an external service.',
    INVALID_POSITION_DATA = 'The received aircraft position data is invalid or corrupted.',
    WEBSOCKET_ERROR = 'Real-time connection error. Attempting to reconnect...',
    ADSB_DATA_ERROR = 'Error processing ADS-B data feed. Position updates may be delayed.',
    TEAMS_INTEGRATION_ERROR = 'Failed to send notification to Microsoft Teams.',
    CRM_SYNC_ERROR = 'Failed to synchronize data with CRM system.'
}

/**
 * Constant object mapping error codes to their string values for direct access.
 * Useful for static type checking and code completion.
 */
export const ERROR_CODES = {
    INTERNAL_SERVER_ERROR: ErrorCode.INTERNAL_SERVER_ERROR,
    VALIDATION_ERROR: ErrorCode.VALIDATION_ERROR,
    AUTHENTICATION_ERROR: ErrorCode.AUTHENTICATION_ERROR,
    AUTHORIZATION_ERROR: ErrorCode.AUTHORIZATION_ERROR,
    RESOURCE_NOT_FOUND: ErrorCode.RESOURCE_NOT_FOUND,
    DUPLICATE_RESOURCE: ErrorCode.DUPLICATE_RESOURCE,
    INVALID_STATUS_TRANSITION: ErrorCode.INVALID_STATUS_TRANSITION,
    SERVICE_UNAVAILABLE: ErrorCode.SERVICE_UNAVAILABLE,
    EXTERNAL_SERVICE_ERROR: ErrorCode.EXTERNAL_SERVICE_ERROR,
    INVALID_POSITION_DATA: ErrorCode.INVALID_POSITION_DATA,
    WEBSOCKET_ERROR: ErrorCode.WEBSOCKET_ERROR,
    ADSB_DATA_ERROR: ErrorCode.ADSB_DATA_ERROR,
    TEAMS_INTEGRATION_ERROR: ErrorCode.TEAMS_INTEGRATION_ERROR,
    CRM_SYNC_ERROR: ErrorCode.CRM_SYNC_ERROR
} as const;

/**
 * Constant object mapping error codes to their corresponding human-readable messages.
 * Provides easy access to error messages while maintaining type safety.
 */
export const ERROR_MESSAGES = {
    INTERNAL_SERVER_ERROR: ErrorMessage.INTERNAL_SERVER_ERROR,
    VALIDATION_ERROR: ErrorMessage.VALIDATION_ERROR,
    AUTHENTICATION_ERROR: ErrorMessage.AUTHENTICATION_ERROR,
    AUTHORIZATION_ERROR: ErrorMessage.AUTHORIZATION_ERROR,
    RESOURCE_NOT_FOUND: ErrorMessage.RESOURCE_NOT_FOUND,
    DUPLICATE_RESOURCE: ErrorMessage.DUPLICATE_RESOURCE,
    INVALID_STATUS_TRANSITION: ErrorMessage.INVALID_STATUS_TRANSITION,
    SERVICE_UNAVAILABLE: ErrorMessage.SERVICE_UNAVAILABLE,
    EXTERNAL_SERVICE_ERROR: ErrorMessage.EXTERNAL_SERVICE_ERROR,
    INVALID_POSITION_DATA: ErrorMessage.INVALID_POSITION_DATA,
    WEBSOCKET_ERROR: ErrorMessage.WEBSOCKET_ERROR,
    ADSB_DATA_ERROR: ErrorMessage.ADSB_DATA_ERROR,
    TEAMS_INTEGRATION_ERROR: ErrorMessage.TEAMS_INTEGRATION_ERROR,
    CRM_SYNC_ERROR: ErrorMessage.CRM_SYNC_ERROR
} as const;