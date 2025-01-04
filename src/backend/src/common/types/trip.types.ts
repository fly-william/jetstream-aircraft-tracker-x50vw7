/**
 * @fileoverview Type definitions for trip-related data structures in the JetStream platform
 * @version 1.0.0
 * 
 * Provides comprehensive TypeScript type definitions for trips, milestones, service requests,
 * timeline entries, and audit logs with enhanced vendor management support.
 */

// Internal imports
import { 
    ITrip, 
    IMilestone, 
    TripStatus, 
    MilestoneType, 
    ServiceRequestType 
} from '../interfaces/trip.interface';

// @ts-ignore - UUID type from crypto module
import { UUID } from 'crypto'; // version: latest

/**
 * Enumeration for service request priority levels
 */
export enum ServiceRequestPriority {
    HIGH = 'HIGH',
    MEDIUM = 'MEDIUM',
    LOW = 'LOW'
}

/**
 * Enumeration for timeline entry types
 */
export enum TimelineEntryType {
    STATUS_CHANGE = 'STATUS_CHANGE',
    MILESTONE_ADDED = 'MILESTONE_ADDED',
    SERVICE_REQUEST = 'SERVICE_REQUEST',
    SCHEDULE_UPDATE = 'SCHEDULE_UPDATE',
    NOTE_ADDED = 'NOTE_ADDED'
}

/**
 * Enumeration for audit action types
 */
export enum AuditActionType {
    CREATED = 'CREATED',
    UPDATED = 'UPDATED',
    STATUS_CHANGED = 'STATUS_CHANGED',
    MILESTONE_ADDED = 'MILESTONE_ADDED',
    SERVICE_REQUESTED = 'SERVICE_REQUESTED',
    SCHEDULE_MODIFIED = 'SCHEDULE_MODIFIED'
}

/**
 * Type definition for trip creation input
 * Includes required fields for creating a new trip
 */
export type TripCreateInput = {
    aircraftId: UUID;
    startTime: Date;
    endTime: Date;
    metadata?: Record<string, any>;
};

/**
 * Type definition for trip update input
 * Includes modifiable fields for updating an existing trip
 */
export type TripUpdateInput = {
    status?: TripStatus;
    startTime?: Date;
    endTime?: Date;
    metadata?: Record<string, any>;
};

/**
 * Enhanced type definition for service request creation
 * Includes vendor management and priority handling
 */
export type ServiceRequestCreateInput = {
    tripId: UUID;
    type: ServiceRequestType;
    scheduledTime: Date;
    vendorId: UUID;
    vendorContact: string;
    priority: ServiceRequestPriority;
    details: Record<string, any>;
};

/**
 * Type definition for trip timeline entries
 * Provides chronological tracking of trip-related events
 */
export type TripTimelineEntry = {
    tripId: UUID;
    timestamp: Date;
    entryType: TimelineEntryType;
    details: Record<string, any>;
};

/**
 * Type definition for trip audit logs
 * Tracks all changes and actions performed on a trip
 */
export type TripAuditLog = {
    tripId: UUID;
    userId: UUID;
    action: AuditActionType;
    timestamp: Date;
    changes: Record<string, any>;
};

/**
 * Type definition for milestone creation input
 * Includes required fields for creating trip milestones
 */
export type MilestoneCreateInput = {
    tripId: UUID;
    type: MilestoneType;
    timestamp: Date;
    details: Record<string, any>;
};

/**
 * Type definition for service request status update
 * Handles service request state changes
 */
export type ServiceRequestStatusUpdate = {
    status: string;
    timestamp: Date;
    updatedBy: UUID;
    notes?: string;
};

/**
 * Type definition for trip timeline query parameters
 * Supports filtering and pagination of timeline entries
 */
export type TimelineQueryParams = {
    tripId: UUID;
    startDate?: Date;
    endDate?: Date;
    entryTypes?: TimelineEntryType[];
    limit?: number;
    offset?: number;
};

/**
 * Type definition for trip audit query parameters
 * Supports filtering and pagination of audit logs
 */
export type AuditQueryParams = {
    tripId: UUID;
    startDate?: Date;
    endDate?: Date;
    actions?: AuditActionType[];
    userId?: UUID;
    limit?: number;
    offset?: number;
};

/**
 * Utility type for partial trip updates
 * Makes all fields optional except id
 */
export type PartialTripUpdate = Partial<Omit<ITrip, 'id'>> & { id: UUID };

/**
 * Utility type for trip status change events
 * Captures status transitions with metadata
 */
export type TripStatusChangeEvent = {
    tripId: UUID;
    previousStatus: TripStatus;
    newStatus: TripStatus;
    timestamp: Date;
    changedBy: UUID;
    reason?: string;
};