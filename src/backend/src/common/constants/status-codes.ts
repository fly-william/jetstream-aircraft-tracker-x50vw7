/**
 * @fileoverview HTTP Status Codes for JetStream Platform
 * Defines standardized status codes used across the platform for consistent API responses,
 * error handling, and system health monitoring. These codes are critical for maintaining
 * the platform's 99.9% uptime target and <0.1% error rate requirements.
 * 
 * @version 1.0.0
 */

/**
 * Standardized HTTP status codes for JetStream API responses.
 * Used across all platform services to ensure consistent error handling,
 * monitoring, and reporting capabilities.
 * 
 * Success codes (2xx) support tracking of successful operations
 * Error codes (4xx, 5xx) enable precise error rate monitoring
 * All codes contribute to response time and availability metrics
 */
export enum HttpStatusCode {
  /**
   * Standard success response (200)
   * Used for successful operations like:
   * - Retrieving aircraft positions
   * - Fetching trip details
   * - Getting status updates
   */
  OK = 200,

  /**
   * Resource created successfully (201)
   * Used when new resources are created:
   * - New trip creation
   * - Service request submission
   * - Status update logging
   */
  CREATED = 201,

  /**
   * Operation succeeded with no content response (204)
   * Used for successful operations not requiring response data:
   * - Acknowledgment of status updates
   * - Successful deletions
   * - Cache invalidation confirmations
   */
  NO_CONTENT = 204,

  /**
   * Invalid request parameters or payload (400)
   * Used for client-side validation failures:
   * - Invalid coordinates in position updates
   * - Malformed trip data
   * - Invalid status codes in updates
   */
  BAD_REQUEST = 400,

  /**
   * Authentication required or failed (401)
   * Used for security-related failures:
   * - Missing authentication token
   * - Expired credentials
   * - Invalid API keys
   */
  UNAUTHORIZED = 401,

  /**
   * User lacks required permissions (403)
   * Used for authorization failures:
   * - Insufficient role permissions
   * - Geographic access restrictions
   * - Time-based access violations
   */
  FORBIDDEN = 403,

  /**
   * Requested resource not found (404)
   * Used when requested data is unavailable:
   * - Unknown aircraft identifier
   * - Non-existent trip ID
   * - Deleted status records
   */
  NOT_FOUND = 404,

  /**
   * Resource conflict or concurrent modification (409)
   * Used for data consistency issues:
   * - Duplicate trip creation
   * - Concurrent status updates
   * - Version conflicts in updates
   */
  CONFLICT = 409,

  /**
   * Valid request but business logic prevents processing (422)
   * Used for business rule violations:
   * - Invalid status transitions
   * - Business constraint violations
   * - Logical sequence errors
   */
  UNPROCESSABLE_ENTITY = 422,

  /**
   * Rate limit exceeded for API endpoints (429)
   * Used for throttling control:
   * - API quota exceeded
   * - Too many position updates
   * - Excessive status changes
   */
  TOO_MANY_REQUESTS = 429,

  /**
   * Unexpected server error requiring investigation (500)
   * Used for internal system failures:
   * - Unhandled exceptions
   * - Database failures
   * - Integration errors
   */
  INTERNAL_SERVER_ERROR = 500,

  /**
   * Temporary service outage or maintenance (503)
   * Used for availability issues:
   * - Planned maintenance
   * - Service degradation
   * - Dependency failures
   */
  SERVICE_UNAVAILABLE = 503
}