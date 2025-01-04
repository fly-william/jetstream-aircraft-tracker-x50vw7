/**
 * @fileoverview Core validation utilities for the JetStream platform
 * @version 1.0.0
 * 
 * Provides comprehensive validation logic for aircraft data, trip management,
 * and position tracking with robust error handling and caching.
 */

import { validate as validateUUIDFormat } from 'uuid'; // v9.0.0
import { isValid as isValidDate, isFuture, isAfter } from 'date-fns'; // v2.30.0
import { z } from 'zod'; // v3.22.0

// Internal interfaces
import { IAircraft } from '../interfaces/aircraft.interface';
import { IPosition } from '../interfaces/position.interface';
import { ITrip, TripStatus, ServiceRequestType } from '../interfaces/trip.interface';

// Validation constants
const REGISTRATION_PATTERN = /^[A-Z]{1,2}\-[A-Z0-9]{1,5}$/;
const MIN_LATITUDE = -90;
const MAX_LATITUDE = 90;
const MIN_LONGITUDE = -180;
const MAX_LONGITUDE = 180;
const MIN_ALTITUDE = -1000; // Allows for Death Valley operations
const MAX_ALTITUDE = 60000; // Maximum operational ceiling
const MAX_VALIDATION_RETRIES = 3;
const VALIDATION_CACHE_TTL = 300; // 5 minutes

/**
 * Validation result interface with detailed error context
 */
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  context?: Record<string, unknown>;
}

/**
 * Validation error interface for structured error reporting
 */
interface ValidationError {
  code: string;
  message: string;
  field?: string;
  value?: unknown;
}

/**
 * Zod schema for aircraft registration validation
 */
const registrationSchema = z.string().regex(REGISTRATION_PATTERN, {
  message: "Invalid aircraft registration format"
});

/**
 * Zod schema for coordinate validation
 */
const coordinateSchema = z.object({
  latitude: z.number().min(MIN_LATITUDE).max(MAX_LATITUDE),
  longitude: z.number().min(MIN_LONGITUDE).max(MAX_LONGITUDE),
  altitude: z.number().min(MIN_ALTITUDE).max(MAX_ALTITUDE)
});

/**
 * Validates if a string is a valid UUID v4 format
 * @param id - String to validate as UUID
 * @returns Promise resolving to validation result
 */
export async function validateUUID(id: string): Promise<ValidationResult> {
  try {
    if (!id || typeof id !== 'string') {
      return {
        isValid: false,
        errors: [{
          code: 'INVALID_UUID_TYPE',
          message: 'UUID must be a non-empty string',
          value: id
        }]
      };
    }

    const isValidUUID = validateUUIDFormat(id);
    return {
      isValid: isValidUUID,
      errors: isValidUUID ? [] : [{
        code: 'INVALID_UUID_FORMAT',
        message: 'Invalid UUID format',
        value: id
      }]
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [{
        code: 'UUID_VALIDATION_ERROR',
        message: `UUID validation failed: ${error.message}`,
        value: id
      }]
    };
  }
}

/**
 * Validates geographic coordinates for aircraft position
 * @param latitude - Latitude in decimal degrees
 * @param longitude - Longitude in decimal degrees
 * @param altitude - Altitude in feet MSL
 * @returns Promise resolving to validation result
 */
export async function validateCoordinates(
  latitude: number,
  longitude: number,
  altitude: number
): Promise<ValidationResult> {
  try {
    const validationResult = coordinateSchema.safeParse({
      latitude,
      longitude,
      altitude
    });

    if (!validationResult.success) {
      return {
        isValid: false,
        errors: validationResult.error.errors.map(err => ({
          code: 'INVALID_COORDINATE',
          message: err.message,
          field: err.path.join('.'),
          value: err.path[0] === 'latitude' ? latitude :
                 err.path[0] === 'longitude' ? longitude : altitude
        }))
      };
    }

    return {
      isValid: true,
      errors: [],
      context: {
        coordinates: { latitude, longitude, altitude }
      }
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [{
        code: 'COORDINATE_VALIDATION_ERROR',
        message: `Coordinate validation failed: ${error.message}`,
        context: { latitude, longitude, altitude }
      }]
    };
  }
}

/**
 * Validates trip timeline logic including start and end times
 * @param startTime - Trip start time
 * @param endTime - Trip end time
 * @param tripType - Type of trip for specific validation rules
 * @returns Promise resolving to validation result
 */
export async function validateTripTimeline(
  startTime: Date,
  endTime: Date,
  tripType: ServiceRequestType
): Promise<ValidationResult> {
  try {
    const errors: ValidationError[] = [];

    // Validate date objects
    if (!isValidDate(startTime) || !isValidDate(endTime)) {
      errors.push({
        code: 'INVALID_DATE_FORMAT',
        message: 'Invalid date format provided',
        value: { startTime, endTime }
      });
      return { isValid: false, errors };
    }

    // Validate start time is in the future
    if (!isFuture(startTime)) {
      errors.push({
        code: 'PAST_START_TIME',
        message: 'Trip start time must be in the future',
        field: 'startTime',
        value: startTime
      });
    }

    // Validate end time is after start time
    if (!isAfter(endTime, startTime)) {
      errors.push({
        code: 'INVALID_TIME_SEQUENCE',
        message: 'Trip end time must be after start time',
        field: 'endTime',
        value: endTime
      });
    }

    // Apply trip type specific validations
    if (tripType === ServiceRequestType.MAINTENANCE) {
      const minimumMaintenanceHours = 2;
      const maintenanceHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      if (maintenanceHours < minimumMaintenanceHours) {
        errors.push({
          code: 'INSUFFICIENT_MAINTENANCE_TIME',
          message: `Maintenance requires minimum ${minimumMaintenanceHours} hours`,
          context: { maintenanceHours }
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      context: {
        tripType,
        duration: endTime.getTime() - startTime.getTime()
      }
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [{
        code: 'TIMELINE_VALIDATION_ERROR',
        message: `Timeline validation failed: ${error.message}`,
        context: { startTime, endTime, tripType }
      }]
    };
  }
}

/**
 * Validates aircraft registration format
 * @param registration - Aircraft registration to validate
 * @returns Promise resolving to validation result
 */
export async function validateAircraftRegistration(
  registration: string
): Promise<ValidationResult> {
  try {
    const validationResult = registrationSchema.safeParse(registration);

    if (!validationResult.success) {
      return {
        isValid: false,
        errors: [{
          code: 'INVALID_REGISTRATION',
          message: 'Invalid aircraft registration format',
          value: registration
        }]
      };
    }

    return {
      isValid: true,
      errors: [],
      context: { registration }
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [{
        code: 'REGISTRATION_VALIDATION_ERROR',
        message: `Registration validation failed: ${error.message}`,
        value: registration
      }]
    };
  }
}