/**
 * @fileoverview Core trip interfaces for the JetStream platform
 * @version 1.0.0
 * 
 * Defines the fundamental data structures for trip management, milestone tracking,
 * and service coordination. These interfaces provide type safety and standardization
 * for all trip-related operations across the platform.
 */

// External imports
// @ts-ignore - UUID type from crypto module
import { UUID } from 'crypto'; // version: latest

// Internal imports
import { IAircraft } from './aircraft.interface';

/**
 * Enumeration of possible trip statuses throughout the lifecycle
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
 * Enumeration of milestone types for trip tracking
 */
export enum MilestoneType {
    STATUS_UPDATE = 'STATUS_UPDATE',
    POSITION_UPDATE = 'POSITION_UPDATE',
    CREW_UPDATE = 'CREW_UPDATE',
    PASSENGER_UPDATE = 'PASSENGER_UPDATE',
    SERVICE_UPDATE = 'SERVICE_UPDATE',
    SCHEDULE_UPDATE = 'SCHEDULE_UPDATE'
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
 * Core interface representing a flight trip with enhanced audit capabilities
 */
export interface ITrip {
    /** Unique identifier for the trip */
    id: UUID;

    /** Reference to the assigned aircraft */
    aircraftId: UUID;

    /** Scheduled departure time */
    startTime: Date;

    /** Scheduled arrival time */
    endTime: Date;

    /** Current trip status */
    status: TripStatus;

    /** Additional trip metadata */
    metadata: Record<string, unknown>;

    /** Collection of trip milestones */
    milestones: IMilestone[];

    /** Trip creation timestamp */
    createdAt: Date;

    /** Last update timestamp */
    updatedAt: Date;

    /** User ID of last update */
    lastUpdatedBy: UUID;
}

/**
 * Interface representing a trip milestone with enhanced audit tracking
 */
export interface IMilestone {
    /** Unique identifier for the milestone */
    id: UUID;

    /** Reference to the parent trip */
    tripId: UUID;

    /** Type of milestone */
    type: MilestoneType;

    /** Timestamp of the milestone */
    timestamp: Date;

    /** Additional milestone details */
    details: Record<string, unknown>;

    /** User ID who created the milestone */
    userId: UUID;

    /** Role of the user who created the milestone */
    userRole: string;

    /** Milestone creation timestamp */
    createdAt: Date;
}

/**
 * Interface representing a service request with enhanced vendor management
 */
export interface IServiceRequest {
    /** Unique identifier for the service request */
    id: UUID;

    /** Reference to the parent trip */
    tripId: UUID;

    /** Type of service requested */
    type: ServiceRequestType;

    /** Scheduled service time */
    scheduledTime: Date;

    /** Current status of the service request */
    status: string;

    /** Additional service request details */
    details: Record<string, unknown>;

    /** Reference to the vendor */
    vendorId: UUID;

    /** Name of the vendor */
    vendorName: string;

    /** Vendor contact information */
    vendorContact: string;

    /** Timestamp of last status update */
    lastStatusUpdate: Date;

    /** User ID of last update */
    lastUpdatedBy: UUID;

    /** Flag indicating if request is active */
    isActive: boolean;
}

/**
 * Interface for creating new trips
 * Omits system-managed fields
 */
export interface ITripCreate {
    aircraftId: UUID;
    startTime: Date;
    endTime: Date;
    metadata?: Record<string, unknown>;
}

/**
 * Interface for updating trip status
 * Limited to modifiable fields
 */
export interface ITripUpdate {
    status: TripStatus;
    metadata?: Record<string, unknown>;
    lastUpdatedBy: UUID;
}

/**
 * Interface for creating service requests
 * Omits system-managed fields
 */
export interface IServiceRequestCreate {
    tripId: UUID;
    type: ServiceRequestType;
    scheduledTime: Date;
    details: Record<string, unknown>;
    vendorId: UUID;
    vendorName: string;
    vendorContact: string;
}