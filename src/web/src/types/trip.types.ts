/**
 * @fileoverview TypeScript type definitions for trip-related functionality
 * @version 1.0.0
 */

// External imports
// @ts-ignore - UUID type from crypto module
import { UUID } from 'crypto'; // version: latest

// Internal imports
import { IAircraft } from '../types/aircraft.types';

/**
 * Enumeration of possible trip statuses
 */
export enum TripStatus {
    SCHEDULED = 'SCHEDULED',
    IN_POSITION = 'IN_POSITION',
    BOARDING = 'BOARDING',
    DEPARTED = 'DEPARTED',
    ENROUTE = 'ENROUTE',
    ARRIVED = 'ARRIVED',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED'
}

/**
 * Enumeration of trip milestone types
 */
export enum MilestoneType {
    AIRCRAFT_POSITION = 'AIRCRAFT_POSITION',
    CREW_READY = 'CREW_READY',
    PASSENGER_ARRIVAL = 'PASSENGER_ARRIVAL',
    BOARDING_START = 'BOARDING_START',
    BOARDING_COMPLETE = 'BOARDING_COMPLETE',
    DEPARTURE = 'DEPARTURE',
    ARRIVAL = 'ARRIVAL',
    SERVICE_REQUEST = 'SERVICE_REQUEST',
    STATUS_UPDATE = 'STATUS_UPDATE'
}

/**
 * Enumeration of service request types
 */
export enum ServiceRequestType {
    CATERING = 'CATERING',
    GROUND_TRANSPORT = 'GROUND_TRANSPORT',
    CLEANING = 'CLEANING',
    FUELING = 'FUELING',
    MAINTENANCE = 'MAINTENANCE',
    CUSTOMS = 'CUSTOMS'
}

/**
 * Interface representing a trip milestone or status update
 */
export interface Milestone {
    /** Unique identifier for the milestone */
    readonly id: UUID;
    /** Reference to associated trip */
    readonly tripId: UUID;
    /** Type of milestone */
    readonly type: MilestoneType;
    /** Timestamp when milestone occurred */
    readonly timestamp: Date;
    /** Additional milestone details */
    readonly details: Record<string, any>;
    /** User who created/updated the milestone */
    readonly userId: UUID;
}

/**
 * Enhanced interface representing a service request for a trip
 */
export interface ServiceRequest {
    /** Unique identifier for the service request */
    readonly id: UUID;
    /** Reference to associated trip */
    readonly tripId: UUID;
    /** Type of service requested */
    readonly type: ServiceRequestType;
    /** Scheduled time for service */
    readonly scheduledTime: Date;
    /** Current status of the service request */
    readonly status: string;
    /** Additional service request details */
    readonly details: Record<string, any>;
    /** Reference to service vendor */
    readonly vendorId: UUID;
    /** Name of service vendor */
    readonly vendorName: string;
    /** Vendor contact information */
    readonly vendorContact: string;
    /** Time when vendor confirmed service */
    readonly confirmedTime: Date;
    /** Time when service was completed */
    readonly completedTime: Date;
    /** History of status changes */
    readonly statusHistory: string[];
    /** Flag indicating if follow-up is needed */
    readonly requiresFollowUp: boolean;
    /** Service priority level */
    readonly priority: string;
}

/**
 * Interface representing a flight trip in the frontend
 */
export interface Trip {
    /** Unique identifier for the trip */
    readonly id: UUID;
    /** Reference to associated aircraft */
    readonly aircraftId: UUID;
    /** Scheduled departure time */
    readonly startTime: Date;
    /** Scheduled arrival time */
    readonly endTime: Date;
    /** Current trip status */
    readonly status: TripStatus;
    /** Additional trip metadata */
    readonly metadata: Record<string, any>;
    /** Array of trip milestones */
    readonly milestones: Milestone[];
    /** Array of service requests */
    readonly serviceRequests: ServiceRequest[];
    /** Trip creation timestamp */
    readonly createdAt: Date;
    /** Last update timestamp */
    readonly updatedAt: Date;
}

/**
 * Enhanced interface for trip status update requests
 */
export interface TripStatusUpdate {
    /** Reference to trip being updated */
    readonly tripId: UUID;
    /** New status to be applied */
    readonly newStatus: TripStatus;
    /** Update notes/comments */
    readonly notes: string;
    /** Flag to notify operations team */
    readonly notifyOperations: boolean;
    /** Flag to notify sales team */
    readonly notifySales: boolean;
    /** Flag to notify management */
    readonly notifyManagement: boolean;
    /** Reason for status update */
    readonly updateReason: string;
    /** Additional status metadata */
    readonly statusMetadata: Record<string, any>;
    /** Flag for urgent updates */
    readonly isUrgent: boolean;
    /** Notification channel preferences */
    readonly notificationChannels: string[];
}