/**
 * @fileoverview TypeScript type definitions for the JetStream notification system
 * @version 1.0.0
 * @description Defines comprehensive types for real-time notifications, status updates,
 * and Teams integration supporting < 5s latency requirements
 */

// Internal imports
import { TripStatus } from './trip.types';
import { ApiResponse } from './api.types';

/**
 * Enumeration of notification types supporting all system events
 */
export enum NotificationType {
    TRIP_STATUS = 'TRIP_STATUS',
    SERVICE_REQUEST = 'SERVICE_REQUEST',
    SYSTEM_ALERT = 'SYSTEM_ALERT',
    TEAMS_MESSAGE = 'TEAMS_MESSAGE',
    POSITION_UPDATE = 'POSITION_UPDATE'
}

/**
 * Enumeration of notification priority levels
 */
export enum NotificationPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

/**
 * Enumeration of notification target audiences
 */
export enum NotificationTarget {
    ALL = 'ALL',
    OPERATIONS = 'OPERATIONS',
    SALES = 'SALES',
    CUSTOMER_SERVICE = 'CUSTOMER_SERVICE'
}

/**
 * Core interface defining a comprehensive notification entity
 */
export interface Notification {
    /** Unique identifier for the notification */
    readonly id: string;
    /** Type of notification */
    readonly type: NotificationType;
    /** Priority level */
    readonly priority: NotificationPriority;
    /** Target audience */
    readonly target: NotificationTarget;
    /** Notification title */
    readonly title: string;
    /** Detailed message */
    readonly message: string;
    /** Creation timestamp */
    readonly timestamp: string;
    /** Read status */
    readonly read: boolean;
    /** Acknowledgment status */
    readonly acknowledged: boolean;
    /** Source identifier (e.g., tripId, aircraftId) */
    readonly sourceId: string;
    /** Source type (e.g., 'TRIP', 'AIRCRAFT') */
    readonly sourceType: string;
    /** Categorization tags */
    readonly tags: string[];
    /** Additional contextual data */
    readonly metadata: Record<string, any>;
}

/**
 * Interface for managing notification state in the application
 */
export interface NotificationState {
    /** Array of all notifications */
    readonly notifications: Notification[];
    /** Count of unread notifications */
    readonly unreadCount: number;
    /** Count of critical notifications */
    readonly criticalCount: number;
    /** Counts by priority level */
    readonly priorityCounts: Record<NotificationPriority, number>;
    /** Counts by notification type */
    readonly typeCounts: Record<NotificationType, number>;
    /** WebSocket connection status */
    readonly isConnected: boolean;
    /** Last synchronization timestamp */
    readonly lastSyncTime: Date;
}

/**
 * Interface for filtering notifications
 */
export interface NotificationFilter {
    /** Filter by notification types */
    readonly types?: NotificationType[];
    /** Filter by priority levels */
    readonly priorities?: NotificationPriority[];
    /** Filter by target audiences */
    readonly targets?: NotificationTarget[];
    /** Filter by tags */
    readonly tags?: string[];
    /** Filter for unread notifications only */
    readonly unreadOnly?: boolean;
    /** Filter by start date */
    readonly startDate?: Date;
    /** Filter by end date */
    readonly endDate?: Date;
}

/**
 * Type alias for API response containing notification data
 */
export type NotificationResponse = ApiResponse<Notification>;

/**
 * Type definition for notification event handler function
 */
export type NotificationHandler = (
    notification: Notification,
    context?: NotificationContext
) => Promise<void>;

/**
 * Type definition for notification context data
 */
export type NotificationContext = {
    /** User ID processing the notification */
    readonly userId: string;
    /** Current session identifier */
    readonly sessionId: string;
    /** Processing timestamp */
    readonly timestamp: Date;
    /** Additional context metadata */
    readonly metadata?: Record<string, any>;
};