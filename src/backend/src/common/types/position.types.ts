/**
 * @fileoverview Type definitions and type guards for aircraft position data in JetStream platform
 * @version 1.0.0
 * @module common/types/position
 */

import { UUID } from 'crypto'; // Latest version
import { IPosition } from '../interfaces/position.interface';

/**
 * Type definition for real-time position updates from ADS-B feed
 * @description Represents the minimum required data for position updates with 5-second intervals
 */
export type PositionUpdate = {
    aircraftId: UUID;
    latitude: number;
    longitude: number;
    altitude: number;
    groundSpeed: number;
    heading: number;
};

/**
 * Type definition for geographic coordinates used in map visualization
 * @description Represents the latitude/longitude pair for aircraft plotting
 */
export type PositionCoordinates = {
    latitude: number;
    longitude: number;
};

/**
 * Type definition for aircraft altitude data
 * @description Represents altitude in feet above mean sea level (MSL)
 */
export type PositionAltitude = {
    altitude: number;
};

/**
 * Type definition for aircraft velocity data
 * @description Represents ground speed in knots and heading in degrees true
 */
export type PositionVelocity = {
    groundSpeed: number;
    heading: number;
};

/**
 * Type guard to validate if an object conforms to PositionUpdate type
 * @param obj - Object to validate
 * @returns {boolean} True if object is valid PositionUpdate meeting all validation criteria
 */
export function isPositionUpdate(obj: unknown): obj is PositionUpdate {
    if (!obj || typeof obj !== 'object') {
        return false;
    }

    const update = obj as Record<string, unknown>;

    // Validate aircraftId
    if (typeof update.aircraftId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(update.aircraftId)) {
        return false;
    }

    // Validate latitude
    if (typeof update.latitude !== 'number' || update.latitude < -90 || update.latitude > 90) {
        return false;
    }

    // Validate longitude
    if (typeof update.longitude !== 'number' || update.longitude < -180 || update.longitude > 180) {
        return false;
    }

    // Validate altitude
    if (typeof update.altitude !== 'number' || update.altitude < 0) {
        return false;
    }

    // Validate groundSpeed
    if (typeof update.groundSpeed !== 'number' || update.groundSpeed < 0) {
        return false;
    }

    // Validate heading
    if (typeof update.heading !== 'number' || update.heading < 0 || update.heading >= 360) {
        return false;
    }

    // Verify no extraneous properties
    const validKeys = ['aircraftId', 'latitude', 'longitude', 'altitude', 'groundSpeed', 'heading'];
    const updateKeys = Object.keys(update);
    return updateKeys.every(key => validKeys.includes(key)) && validKeys.every(key => updateKeys.includes(key));
}

/**
 * Type guard to validate if an object conforms to PositionCoordinates type
 * @param obj - Object to validate
 * @returns {boolean} True if object contains valid latitude and longitude
 */
export function isPositionCoordinates(obj: unknown): obj is PositionCoordinates {
    if (!obj || typeof obj !== 'object') {
        return false;
    }

    const coords = obj as Record<string, unknown>;
    
    return (
        typeof coords.latitude === 'number' &&
        coords.latitude >= -90 &&
        coords.latitude <= 90 &&
        typeof coords.longitude === 'number' &&
        coords.longitude >= -180 &&
        coords.longitude <= 180 &&
        Object.keys(coords).length === 2
    );
}

/**
 * Type guard to validate if an object conforms to PositionAltitude type
 * @param obj - Object to validate
 * @returns {boolean} True if object contains valid altitude
 */
export function isPositionAltitude(obj: unknown): obj is PositionAltitude {
    if (!obj || typeof obj !== 'object') {
        return false;
    }

    const alt = obj as Record<string, unknown>;
    
    return (
        typeof alt.altitude === 'number' &&
        alt.altitude >= 0 &&
        Object.keys(alt).length === 1
    );
}

/**
 * Type guard to validate if an object conforms to PositionVelocity type
 * @param obj - Object to validate
 * @returns {boolean} True if object contains valid ground speed and heading
 */
export function isPositionVelocity(obj: unknown): obj is PositionVelocity {
    if (!obj || typeof obj !== 'object') {
        return false;
    }

    const vel = obj as Record<string, unknown>;
    
    return (
        typeof vel.groundSpeed === 'number' &&
        vel.groundSpeed >= 0 &&
        typeof vel.heading === 'number' &&
        vel.heading >= 0 &&
        vel.heading < 360 &&
        Object.keys(vel).length === 2
    );
}