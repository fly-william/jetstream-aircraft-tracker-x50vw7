/**
 * @fileoverview Position interface definition for aircraft tracking in JetStream platform
 * @version 1.0.0
 * @module common/interfaces/position
 */

import { UUID } from 'crypto'; // Latest version

/**
 * Interface representing an aircraft position record with complete tracking data.
 * Supports both real-time ADS-B tracking and historical position storage.
 * 
 * @interface IPosition
 * @description Comprehensive interface for aircraft position data supporting:
 * - Real-time tracking (5-second update frequency)
 * - Historical position records (90-day retention)
 * - Map visualization requirements
 */
export interface IPosition {
    /**
     * Unique identifier for the position record
     * @type {UUID}
     */
    id: UUID;

    /**
     * Reference to the aircraft this position belongs to
     * @type {UUID}
     */
    aircraftId: UUID;

    /**
     * Aircraft latitude in decimal degrees
     * @type {number}
     * @validation Range: -90 to 90 degrees
     */
    latitude: number;

    /**
     * Aircraft longitude in decimal degrees
     * @type {number}
     * @validation Range: -180 to 180 degrees
     */
    longitude: number;

    /**
     * Aircraft altitude in feet above mean sea level (MSL)
     * @type {number}
     * @unit Feet MSL
     */
    altitude: number;

    /**
     * Aircraft ground speed
     * @type {number}
     * @unit Knots
     */
    groundSpeed: number;

    /**
     * Aircraft heading in degrees true
     * @type {number}
     * @validation Range: 0-359 degrees
     */
    heading: number;

    /**
     * Timestamp when the position was recorded
     * @type {Date}
     * @performance Update frequency: 5 seconds
     * @retention 90 days in hot storage
     */
    recorded: Date;
}

/**
 * Type guard to validate IPosition object properties
 * @param position - Object to validate as IPosition
 * @returns {boolean} True if object conforms to IPosition interface
 */
export function isValidPosition(position: any): position is IPosition {
    return (
        position &&
        typeof position.id === 'string' &&
        typeof position.aircraftId === 'string' &&
        typeof position.latitude === 'number' &&
        position.latitude >= -90 &&
        position.latitude <= 90 &&
        typeof position.longitude === 'number' &&
        position.longitude >= -180 &&
        position.longitude <= 180 &&
        typeof position.altitude === 'number' &&
        typeof position.groundSpeed === 'number' &&
        typeof position.heading === 'number' &&
        position.heading >= 0 &&
        position.heading < 360 &&
        position.recorded instanceof Date
    );
}