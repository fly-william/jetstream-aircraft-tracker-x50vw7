/**
 * @fileoverview Core aircraft interfaces for the JetStream platform
 * @version 1.0.0
 * 
 * Defines the fundamental data structures for aircraft tracking and fleet management.
 * These interfaces are used throughout the platform for handling aircraft-related data.
 */

// External imports
// @ts-ignore - UUID type from crypto module
import { UUID } from 'crypto'; // version: latest

/**
 * Defines possible operational states of an aircraft
 */
export enum AircraftStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    MAINTENANCE = 'MAINTENANCE'
}

/**
 * Classifies aircraft by size and operational category
 */
export enum AircraftCategory {
    LIGHT_JET = 'LIGHT_JET',
    MIDSIZE_JET = 'MIDSIZE_JET',
    HEAVY_JET = 'HEAVY_JET'
}

/**
 * Core interface representing an aircraft in the system
 * Contains all essential aircraft information and operational status
 */
export interface IAircraft {
    /** Unique identifier for the aircraft */
    id: UUID;
    
    /** Aircraft tail registration number */
    registration: string;
    
    /** Aircraft type/model designation */
    type: string;
    
    /** Aircraft size category classification */
    category: AircraftCategory;
    
    /** Operating company or entity */
    operator: string;
    
    /** Current operational status */
    status: AircraftStatus;
    
    /** Flag indicating if aircraft is currently in service */
    isActive: boolean;
}

/**
 * Interface for creating new aircraft records
 * Omits system-managed fields like id and status
 */
export interface IAircraftCreate {
    /** Aircraft tail registration number */
    registration: string;
    
    /** Aircraft type/model designation */
    type: string;
    
    /** Aircraft size category classification */
    category: AircraftCategory;
    
    /** Operating company or entity */
    operator: string;
}

/**
 * Interface for updating aircraft operational status
 * Limited to modifiable operational fields
 */
export interface IAircraftUpdate {
    /** Updated operational status */
    status: AircraftStatus;
    
    /** Updated active service flag */
    isActive: boolean;
}