/**
 * @fileoverview Event type constants for the JetStream platform
 * Defines standardized event types for real-time updates, notifications,
 * and service communication across the platform.
 * @version 1.0
 */

/**
 * Current version of the event type definitions
 */
export const EVENT_VERSION = '1.0';

/**
 * Events related to aircraft position tracking and movement
 * Used for real-time position updates with <5s latency requirement
 */
export enum AircraftEvents {
    POSITION_UPDATE = 'aircraft.position.update',
    TRACKING_START = 'aircraft.tracking.start',
    TRACKING_END = 'aircraft.tracking.end',
    ALTITUDE_CHANGE = 'aircraft.altitude.change',
    SPEED_CHANGE = 'aircraft.speed.change'
}

/**
 * Events related to trip management and status updates
 * Supports cross-team communication and service coordination
 */
export enum TripEvents {
    TRIP_CREATED = 'trip.created',
    STATUS_UPDATED = 'trip.status.updated',
    MILESTONE_ADDED = 'trip.milestone.added',
    SERVICE_REQUESTED = 'trip.service.requested',
    SCHEDULE_CHANGED = 'trip.schedule.changed',
    CREW_ASSIGNED = 'trip.crew.assigned'
}

/**
 * Events related to system notifications and integrations
 * Enables Teams notifications and CRM synchronization
 */
export enum NotificationEvents {
    TEAMS_NOTIFICATION = 'notification.teams.send',
    CRM_SYNC = 'notification.crm.sync',
    ALERT_GENERATED = 'notification.alert.generated',
    PRIORITY_ALERT = 'notification.alert.priority',
    STATUS_BROADCAST = 'notification.status.broadcast'
}

/**
 * Events related to WebSocket connection management
 * Handles real-time communication state and subscriptions
 */
export enum WebSocketEvents {
    CONNECT = 'websocket.connect',
    DISCONNECT = 'websocket.disconnect',
    SUBSCRIBE = 'websocket.subscribe',
    UNSUBSCRIBE = 'websocket.unsubscribe',
    RECONNECT = 'websocket.reconnect',
    ERROR = 'websocket.error'
}