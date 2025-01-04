/**
 * @fileoverview Aircraft validation schemas and functions using Zod
 * @version 1.0.0
 * 
 * Implements comprehensive validation for aircraft-related data with enhanced
 * security checks and business rule enforcement for the JetStream platform.
 */

import { z } from 'zod'; // v3.22.0

// Internal imports
import { IAircraft, AircraftCategory, AircraftStatus } from '../interfaces/aircraft.interface';
import { validateAircraftRegistration } from '../utils/validation.utils';

/**
 * Core aircraft validation schema with comprehensive validation rules
 */
export const aircraftSchema = z.object({
  id: z.string().uuid({
    message: 'Invalid aircraft identifier format'
  }),
  registration: z.string().refine(
    async (val) => {
      const result = await validateAircraftRegistration(val);
      return result.isValid;
    },
    {
      message: 'Invalid aircraft registration format'
    }
  ),
  type: z.string()
    .min(2, 'Type must be at least 2 characters')
    .max(50, 'Type cannot exceed 50 characters')
    .regex(/^[A-Z0-9\-\s]+$/, 'Type must contain only uppercase letters, numbers, hyphens, and spaces'),
  category: z.nativeEnum(AircraftCategory, {
    required_error: 'Aircraft category is required',
    invalid_type_error: 'Invalid aircraft category'
  }),
  operator: z.string()
    .min(2, 'Operator must be at least 2 characters')
    .max(100, 'Operator cannot exceed 100 characters')
    .regex(/^[A-Za-z0-9\s\-\.]+$/, 'Operator must contain only letters, numbers, spaces, hyphens, and periods'),
  status: z.nativeEnum(AircraftStatus, {
    required_error: 'Aircraft status is required',
    invalid_type_error: 'Invalid aircraft status'
  }),
  isActive: z.boolean({
    required_error: 'Active status is required',
    invalid_type_error: 'Active status must be a boolean'
  }),
  lastUpdated: z.date().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

/**
 * Schema for aircraft creation with strict business rules
 */
export const aircraftCreateSchema = z.object({
  registration: z.string().refine(
    async (val) => {
      const result = await validateAircraftRegistration(val);
      return result.isValid;
    },
    {
      message: 'Invalid aircraft registration format'
    }
  ),
  type: z.string()
    .min(2, 'Type must be at least 2 characters')
    .max(50, 'Type cannot exceed 50 characters')
    .regex(/^[A-Z0-9\-\s]+$/, 'Type must contain only uppercase letters, numbers, hyphens, and spaces'),
  category: z.nativeEnum(AircraftCategory, {
    required_error: 'Aircraft category is required',
    invalid_type_error: 'Invalid aircraft category'
  }),
  operator: z.string()
    .min(2, 'Operator must be at least 2 characters')
    .max(100, 'Operator cannot exceed 100 characters')
    .regex(/^[A-Za-z0-9\s\-\.]+$/, 'Operator must contain only letters, numbers, spaces, hyphens, and periods'),
  metadata: z.record(z.string(), z.unknown()).optional()
});

/**
 * Schema for aircraft updates with status transition rules
 */
export const aircraftUpdateSchema = z.object({
  status: z.nativeEnum(AircraftStatus).optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  lastUpdated: z.date().optional()
}).refine(
  (data) => {
    // Ensure at least one field is being updated
    return Object.keys(data).length > 0;
  },
  {
    message: 'At least one field must be provided for update'
  }
);

/**
 * Validates a complete aircraft object against the schema
 * @param data - Data to validate
 * @returns Promise resolving to validated aircraft data
 * @throws ZodError with validation details if validation fails
 */
export async function validateAircraft(data: unknown): Promise<IAircraft> {
  return await aircraftSchema.parseAsync(data);
}

/**
 * Validates data for creating a new aircraft
 * @param data - Data to validate for aircraft creation
 * @returns Promise resolving to validated creation data
 * @throws ZodError with creation-specific validation context
 */
export async function validateAircraftCreate(data: unknown): Promise<z.infer<typeof aircraftCreateSchema>> {
  return await aircraftCreateSchema.parseAsync(data);
}

/**
 * Validates data for updating an existing aircraft
 * @param data - Data to validate for aircraft update
 * @returns Promise resolving to validated update data
 * @throws ZodError with update-specific validation context
 */
export async function validateAircraftUpdate(data: unknown): Promise<z.infer<typeof aircraftUpdateSchema>> {
  return await aircraftUpdateSchema.parseAsync(data);
}