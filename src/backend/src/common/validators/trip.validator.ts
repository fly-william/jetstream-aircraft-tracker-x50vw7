/**
 * @fileoverview Trip validation schemas and functions for JetStream platform
 * @version 1.0.0
 * 
 * Implements comprehensive validation for trip-related data structures using Zod
 * with enhanced error handling, caching, and performance optimizations.
 */

import { z } from 'zod'; // v3.22.0
import NodeCache from 'node-cache'; // v5.1.2

// Internal imports
import { ITrip, TripStatus, ServiceRequestType } from '../interfaces/trip.interface';
import { validateUUID, validateTripTimeline } from '../utils/validation.utils';

// Validation cache configuration
const validationCache = new NodeCache({
    stdTTL: 300, // 5 minutes cache TTL
    checkperiod: 60, // Check for expired entries every minute
    useClones: false
});

// Constants for validation rules
const TRIP_STATUS_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
    [TripStatus.SCHEDULED]: [TripStatus.IN_POSITION, TripStatus.CANCELLED],
    [TripStatus.IN_POSITION]: [TripStatus.BOARDING, TripStatus.CANCELLED],
    [TripStatus.BOARDING]: [TripStatus.DEPARTED, TripStatus.CANCELLED],
    [TripStatus.DEPARTED]: [TripStatus.ENROUTE],
    [TripStatus.ENROUTE]: [TripStatus.ARRIVED],
    [TripStatus.ARRIVED]: [TripStatus.COMPLETED],
    [TripStatus.COMPLETED]: [],
    [TripStatus.CANCELLED]: []
};

const VALIDATION_CACHE_TTL = 300; // 5 minutes
const MAX_VALIDATION_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Interface for validation results with detailed error context
 */
interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    context?: Record<string, unknown>;
}

/**
 * Interface for structured validation errors
 */
interface ValidationError {
    code: string;
    message: string;
    field?: string;
    value?: unknown;
}

/**
 * Decorator for caching validation results
 */
function cached(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function(...args: any[]) {
        const cacheKey = `${propertyKey}:${JSON.stringify(args)}`;
        const cachedResult = validationCache.get(cacheKey);
        
        if (cachedResult) {
            return cachedResult;
        }

        const result = await originalMethod.apply(this, args);
        validationCache.set(cacheKey, result, VALIDATION_CACHE_TTL);
        return result;
    };
    return descriptor;
}

/**
 * Decorator for implementing retry logic
 */
function retryable(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function(...args: any[]) {
        let lastError;
        for (let attempt = 1; attempt <= MAX_VALIDATION_RETRIES; attempt++) {
            try {
                return await originalMethod.apply(this, args);
            } catch (error) {
                lastError = error;
                if (attempt < MAX_VALIDATION_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                }
            }
        }
        throw lastError;
    };
    return descriptor;
}

/**
 * Enhanced Zod schema for trip validation with custom error messages
 */
export const tripSchema = z.object({
    id: z.string().uuid().refine(async (id) => {
        const result = await validateUUID(id);
        return result.isValid;
    }, {
        message: "Invalid trip ID format"
    }),
    aircraftId: z.string().uuid().refine(async (id) => {
        const result = await validateUUID(id);
        return result.isValid;
    }, {
        message: "Invalid aircraft ID format"
    }),
    startTime: z.preprocess(
        (val) => new Date(val as string | number | Date),
        z.date()
    ),
    endTime: z.preprocess(
        (val) => new Date(val as string | number | Date),
        z.date()
    ),
    status: z.nativeEnum(TripStatus),
    metadata: z.record(z.string(), z.unknown()).optional(),
    milestones: z.array(z.object({
        id: z.string().uuid(),
        type: z.string(),
        timestamp: z.date(),
        details: z.record(z.string(), z.unknown())
    })).optional()
}).refine(async (data) => {
    const timelineResult = await validateTripTimeline(
        data.startTime,
        data.endTime,
        ServiceRequestType.CATERING // Default type for basic timeline validation
    );
    return timelineResult.isValid;
}, {
    message: "Invalid trip timeline"
});

/**
 * Validates if a trip status transition is allowed
 * @param currentStatus Current trip status
 * @param newStatus Proposed new status
 * @returns Validation result with detailed error context
 */
@cached
@retryable
export async function validateTripStatus(
    currentStatus: TripStatus,
    newStatus: TripStatus
): Promise<ValidationResult> {
    try {
        const allowedTransitions = TRIP_STATUS_TRANSITIONS[currentStatus];
        
        if (!allowedTransitions) {
            return {
                isValid: false,
                errors: [{
                    code: 'INVALID_CURRENT_STATUS',
                    message: `Invalid current status: ${currentStatus}`,
                    value: currentStatus
                }]
            };
        }

        const isValidTransition = allowedTransitions.includes(newStatus);
        
        return {
            isValid: isValidTransition,
            errors: isValidTransition ? [] : [{
                code: 'INVALID_STATUS_TRANSITION',
                message: `Cannot transition from ${currentStatus} to ${newStatus}`,
                context: {
                    currentStatus,
                    newStatus,
                    allowedTransitions
                }
            }],
            context: {
                currentStatus,
                newStatus,
                allowedTransitions
            }
        };
    } catch (error) {
        return {
            isValid: false,
            errors: [{
                code: 'STATUS_VALIDATION_ERROR',
                message: `Status validation failed: ${error.message}`,
                context: { currentStatus, newStatus }
            }]
        };
    }
}

/**
 * Validates service request data structure and business rules
 * @param request Service request to validate
 * @returns Validation result with detailed error context
 */
@retryable
export async function validateServiceRequest(
    request: {
        id: string;
        tripId: string;
        type: ServiceRequestType;
        scheduledTime: Date;
        vendorId: string;
        details: Record<string, unknown>;
    }
): Promise<ValidationResult> {
    try {
        const errors: ValidationError[] = [];

        // Validate UUIDs
        const idValidation = await validateUUID(request.id);
        const tripIdValidation = await validateUUID(request.tripId);
        const vendorIdValidation = await validateUUID(request.vendorId);

        if (!idValidation.isValid) {
            errors.push({
                code: 'INVALID_REQUEST_ID',
                message: 'Invalid service request ID',
                value: request.id
            });
        }

        if (!tripIdValidation.isValid) {
            errors.push({
                code: 'INVALID_TRIP_ID',
                message: 'Invalid trip ID',
                value: request.tripId
            });
        }

        if (!vendorIdValidation.isValid) {
            errors.push({
                code: 'INVALID_VENDOR_ID',
                message: 'Invalid vendor ID',
                value: request.vendorId
            });
        }

        // Validate scheduled time is in future
        if (request.scheduledTime <= new Date()) {
            errors.push({
                code: 'INVALID_SCHEDULED_TIME',
                message: 'Scheduled time must be in the future',
                value: request.scheduledTime
            });
        }

        // Validate service type
        if (!Object.values(ServiceRequestType).includes(request.type)) {
            errors.push({
                code: 'INVALID_SERVICE_TYPE',
                message: 'Invalid service request type',
                value: request.type
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            context: {
                requestType: request.type,
                scheduledTime: request.scheduledTime
            }
        };
    } catch (error) {
        return {
            isValid: false,
            errors: [{
                code: 'SERVICE_REQUEST_VALIDATION_ERROR',
                message: `Service request validation failed: ${error.message}`,
                context: { request }
            }]
        };
    }
}