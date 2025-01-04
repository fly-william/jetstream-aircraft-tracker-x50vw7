/**
 * @fileoverview TypeScript type definitions for aircraft-related data structures
 * @version 1.0.0
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
 * Core interface representing aircraft data in the frontend
 */
export interface Aircraft {
    /** Unique identifier for the aircraft */
    readonly id: UUID;
    /** Aircraft registration/tail number */
    readonly registration: string;
    /** Aircraft type/model designation */
    readonly type: string;
    /** Aircraft size category */
    readonly category: AircraftCategory;
    /** Operating company/entity */
    readonly operator: string;
    /** Current operational status */
    readonly status: AircraftStatus;
    /** Flag indicating if aircraft is currently in service */
    readonly isActive: boolean;
}

/**
 * Interface for aircraft position data with validation ranges
 */
export interface AircraftPosition {
    /** Reference to associated aircraft */
    readonly aircraftId: UUID;
    /** Aircraft latitude coordinate (-90 to 90) */
    readonly latitude: number;
    /** Aircraft longitude coordinate (-180 to 180) */
    readonly longitude: number;
    /** Aircraft altitude in feet (0 to 60000) */
    readonly altitude: number;
    /** Aircraft ground speed in knots (0 to 1000) */
    readonly groundSpeed: number;
    /** Aircraft heading in degrees (0 to 359) */
    readonly heading: number;
    /** Timestamp of position recording */
    readonly recorded: Date;
}

/**
 * Interface for paginated aircraft list responses
 */
export interface AircraftList {
    /** Array of aircraft objects */
    readonly items: readonly Aircraft[];
    /** Total count of aircraft in the system */
    readonly total: number;
}

/**
 * Enhanced interface for aircraft map marker data with visualization properties
 */
export interface AircraftMarker {
    /** Associated aircraft data */
    readonly aircraft: Aircraft;
    /** Current position data */
    readonly position: AircraftPosition;
    /** Rotation angle for aircraft icon (optional) */
    readonly iconRotation?: number;
    /** Flag indicating if marker is selected (optional) */
    readonly selected?: boolean;
    /** Flag indicating if marker should be visible (optional) */
    readonly visible?: boolean;
}