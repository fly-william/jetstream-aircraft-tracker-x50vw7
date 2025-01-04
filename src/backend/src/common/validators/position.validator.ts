/**
 * @fileoverview Position data validator for JetStream platform
 * @version 1.0.0
 * 
 * Implements comprehensive validation logic for aircraft position data
 * with enhanced error handling, caching, and performance optimizations.
 */

import { z } from 'zod'; // v3.22.0
import { IPosition } from '../interfaces/position.interface';
import { validateCoordinates, validateUUID } from '../utils/validation.utils';

// Validation constants
const MIN_ALTITUDE = 0;
const MAX_ALTITUDE = 60000;
const MIN_GROUND_SPEED = 0;
const MAX_GROUND_SPEED = 1000;
const MIN_HEADING = 0;
const MAX_HEADING = 360;
const VALIDATION_CACHE_TTL = 5000; // 5 seconds
const MAX_POSITION_AGE = 30000; // 30 seconds

// Cache for recent validation results
const validationCache = new Map<string, {
  result: ValidationResult;
  timestamp: number;
}>();

/**
 * Interface for validation results with detailed error context
 */
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  context?: Record<string, unknown>;
}

/**
 * Interface for batch validation results
 */
interface BatchValidationResult {
  results: ValidationResult[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    errors: ValidationError[];
  };
}

/**
 * Custom error class for validation failures
 */
export class ValidationError {
  constructor(
    public code: string,
    public message: string,
    public field?: string,
    public value?: unknown
  ) {}
}

/**
 * Zod schema for position data validation
 */
const positionSchema = z.object({
  id: z.string().uuid(),
  aircraftId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().min(MIN_ALTITUDE).max(MAX_ALTITUDE),
  groundSpeed: z.number().min(MIN_GROUND_SPEED).max(MAX_GROUND_SPEED),
  heading: z.number().min(MIN_HEADING).max(MAX_HEADING),
  recorded: z.date()
});

/**
 * Validates a complete aircraft position record
 * @param position - Position record to validate
 * @param previousPosition - Optional previous position for consistency checks
 * @returns Promise resolving to validation result
 */
export async function validatePosition(
  position: IPosition,
  previousPosition?: IPosition
): Promise<ValidationResult> {
  try {
    // Check cache first
    const cacheKey = `${position.aircraftId}-${position.recorded.getTime()}`;
    const cached = validationCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < VALIDATION_CACHE_TTL) {
      return cached.result;
    }

    const errors: ValidationError[] = [];

    // Basic schema validation
    const schemaResult = positionSchema.safeParse(position);
    if (!schemaResult.success) {
      return {
        isValid: false,
        errors: schemaResult.error.errors.map(err => new ValidationError(
          'SCHEMA_VALIDATION_ERROR',
          err.message,
          err.path.join('.'),
          err.path[0]
        ))
      };
    }

    // Validate UUIDs
    const [idValidation, aircraftIdValidation] = await Promise.all([
      validateUUID(position.id),
      validateUUID(position.aircraftId)
    ]);

    if (!idValidation.isValid) errors.push(...idValidation.errors);
    if (!aircraftIdValidation.isValid) errors.push(...aircraftIdValidation.errors);

    // Validate coordinates
    const coordValidation = await validateCoordinates(
      position.latitude,
      position.longitude,
      position.altitude
    );
    if (!coordValidation.isValid) errors.push(...coordValidation.errors);

    // Validate timestamp
    const now = Date.now();
    const recordedTime = position.recorded.getTime();
    if (now - recordedTime > MAX_POSITION_AGE) {
      errors.push(new ValidationError(
        'STALE_POSITION',
        'Position data is too old',
        'recorded',
        position.recorded
      ));
    }

    // Validate consistency with previous position if provided
    if (previousPosition) {
      const timeDiff = position.recorded.getTime() - previousPosition.recorded.getTime();
      const distanceKm = calculateDistance(
        position.latitude,
        position.longitude,
        previousPosition.latitude,
        previousPosition.longitude
      );
      const speedKts = (distanceKm * 0.539957) / (timeDiff / 3600000);

      if (Math.abs(speedKts - position.groundSpeed) > 50) {
        errors.push(new ValidationError(
          'SPEED_CONSISTENCY_ERROR',
          'Ground speed inconsistent with position change',
          'groundSpeed',
          position.groundSpeed
        ));
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      context: {
        position: {
          latitude: position.latitude,
          longitude: position.longitude,
          altitude: position.altitude
        },
        timestamp: position.recorded
      }
    };

    // Cache the result
    validationCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });

    return result;
  } catch (error) {
    return {
      isValid: false,
      errors: [new ValidationError(
        'VALIDATION_ERROR',
        `Position validation failed: ${error.message}`,
        undefined,
        position
      )]
    };
  }
}

/**
 * Validates multiple position records efficiently
 * @param positions - Array of position records to validate
 * @returns Promise resolving to batch validation results
 */
export async function validatePositionBatch(
  positions: IPosition[]
): Promise<BatchValidationResult> {
  const results: ValidationResult[] = [];
  const summary = {
    total: positions.length,
    valid: 0,
    invalid: 0,
    errors: [] as ValidationError[]
  };

  // Process positions in chunks for better performance
  const chunkSize = 10;
  for (let i = 0; i < positions.length; i += chunkSize) {
    const chunk = positions.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(
      chunk.map(async (position, index) => {
        const previousPosition = i + index > 0 ? positions[i + index - 1] : undefined;
        return validatePosition(position, previousPosition);
      })
    );
    results.push(...chunkResults);
  }

  // Compile summary
  results.forEach(result => {
    if (result.isValid) {
      summary.valid++;
    } else {
      summary.invalid++;
      summary.errors.push(...result.errors);
    }
  });

  return { results, summary };
}

/**
 * Calculates distance between two points using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Converts degrees to radians
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
function toRad(degrees: number): number {
  return degrees * Math.PI / 180;
}