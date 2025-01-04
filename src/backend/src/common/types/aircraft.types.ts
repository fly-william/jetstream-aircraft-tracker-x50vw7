/**
 * @fileoverview TypeScript type definitions and type guards for aircraft-related data structures
 * @version 1.0.0
 */

// External imports
import { UUID } from 'crypto'; // version: latest

// Internal imports
import { 
    IAircraft, 
    AircraftStatus, 
    AircraftCategory 
} from '../interfaces/aircraft.interface';

/**
 * Core aircraft type definition with validation
 */
export type AircraftType = Pick<IAircraft, 'id' | 'registration' | 'type' | 'category' | 'status'>;

/**
 * Type definition for paginated aircraft list responses
 */
export type AircraftListType = {
    items: AircraftType[];
    total: number;
    pageSize: number;
    currentPage: number;
    hasMore: boolean;
};

/**
 * Type definition for aircraft validation errors
 */
export type AircraftValidationError = {
    code: string;
    message: string;
    field: string;
};

/**
 * Type definition for aircraft filtering options
 */
export type AircraftFilterType = {
    category?: AircraftCategory[];
    status?: AircraftStatus[];
    searchTerm?: string;
};

/**
 * Validates aircraft registration format according to international standards
 * @param registration - Aircraft registration string to validate
 * @returns boolean indicating if registration format is valid
 */
export const validateAircraftRegistration = (registration: string): boolean => {
    // FAA N-number format: N followed by 1-5 digits (e.g., N12345)
    const faaFormat = /^N\d{1,5}$/;
    
    // EASA format: Letter prefix followed by dash and alphanumeric (e.g., G-ABCD)
    const easaFormat = /^[A-Z]-[A-Z0-9]{1,5}$/;
    
    // General validation rules
    const isValidLength = registration.length >= 2 && registration.length <= 7;
    const hasValidChars = /^[A-Z0-9-]+$/.test(registration);
    
    return (
        isValidLength &&
        hasValidChars &&
        (faaFormat.test(registration) || easaFormat.test(registration))
    );
};

/**
 * Type guard function to validate if an object matches the IAircraft interface
 * @param obj - Object to validate
 * @returns boolean indicating if object is valid IAircraft
 */
export const isAircraft = (obj: unknown): obj is IAircraft => {
    if (!obj || typeof obj !== 'object') {
        return false;
    }

    const aircraft = obj as IAircraft;

    // Validate required properties exist
    const hasRequiredProps = (
        'id' in aircraft &&
        'registration' in aircraft &&
        'type' in aircraft &&
        'category' in aircraft &&
        'status' in aircraft
    );

    if (!hasRequiredProps) {
        return false;
    }

    // Validate property types
    const hasValidTypes = (
        typeof aircraft.id === 'string' &&
        typeof aircraft.registration === 'string' &&
        typeof aircraft.type === 'string' &&
        typeof aircraft.operator === 'string' &&
        typeof aircraft.isActive === 'boolean'
    );

    if (!hasValidTypes) {
        return false;
    }

    // Validate registration format
    if (!validateAircraftRegistration(aircraft.registration)) {
        return false;
    }

    // Validate category is valid AircraftCategory
    const isValidCategory = Object.values(AircraftCategory).includes(aircraft.category);
    if (!isValidCategory) {
        return false;
    }

    // Validate status is valid AircraftStatus
    const isValidStatus = Object.values(AircraftStatus).includes(aircraft.status);
    if (!isValidStatus) {
        return false;
    }

    return true;
};