/**
 * @fileoverview Validation utilities for aircraft and trip data
 * @version 1.0.0
 */

// External imports
import { isValid } from 'date-fns'; // version: 2.30.0

// Internal imports
import { Aircraft } from '../types/aircraft.types';
import { Trip } from '../types/trip.types';

/**
 * Validates aircraft registration number format
 * @param registration - Aircraft registration/tail number
 * @returns boolean indicating if registration is valid
 */
export const validateAircraftRegistration = (registration: string): boolean => {
  if (!registration || typeof registration !== 'string') {
    return false;
  }

  // US registration format: N followed by 1-5 digits and 1-2 letters
  const registrationPattern = /^N[0-9]{1,5}[A-Z]{1,2}$/;
  return registrationPattern.test(registration);
};

/**
 * Validates aircraft type designation
 * @param type - Aircraft type/model designation
 * @returns boolean indicating if type is valid
 */
export const validateAircraftType = (type: string): boolean => {
  if (!type || typeof type !== 'string') {
    return false;
  }

  // ICAO aircraft type designator format: 2-4 characters
  const typePattern = /^[A-Z0-9]{2,4}$/;
  return typePattern.test(type);
};

/**
 * Validates trip start and end dates
 * @param startTime - Trip start date/time
 * @param endTime - Trip end date/time
 * @returns boolean indicating if dates are valid
 */
export const validateTripDates = (startTime: Date, endTime: Date): boolean => {
  // Verify both dates are valid
  if (!isValid(startTime) || !isValid(endTime)) {
    return false;
  }

  // Convert to timestamps for comparison
  const startTimestamp = startTime.getTime();
  const endTimestamp = endTime.getTime();
  const currentTimestamp = Date.now();

  // Verify start is before end and not in the past
  return startTimestamp < endTimestamp && startTimestamp >= currentTimestamp;
};

/**
 * Validates latitude value with enhanced precision checks
 * @param latitude - Latitude coordinate
 * @returns boolean indicating if latitude is valid
 */
export const validateLatitude = (latitude: number): boolean => {
  if (typeof latitude !== 'number' || isNaN(latitude)) {
    return false;
  }

  // Check range (-90 to 90 degrees)
  if (latitude < -90 || latitude > 90) {
    return false;
  }

  // Validate decimal precision (6 places max)
  const decimalPlaces = latitude.toString().split('.')[1]?.length || 0;
  if (decimalPlaces > 6) {
    return false;
  }

  // Special case: exact pole coordinates
  if (Math.abs(latitude) === 90) {
    // Ensure exact integer for poles
    return Number.isInteger(latitude);
  }

  return true;
};

/**
 * Validates longitude value with enhanced precision checks
 * @param longitude - Longitude coordinate
 * @returns boolean indicating if longitude is valid
 */
export const validateLongitude = (longitude: number): boolean => {
  if (typeof longitude !== 'number' || isNaN(longitude)) {
    return false;
  }

  // Check range (-180 to 180 degrees)
  if (longitude < -180 || longitude > 180) {
    return false;
  }

  // Validate decimal precision (6 places max)
  const decimalPlaces = longitude.toString().split('.')[1]?.length || 0;
  if (decimalPlaces > 6) {
    return false;
  }

  // Special case: prime meridian and international date line
  if (Math.abs(longitude) === 180 || longitude === 0) {
    // Ensure exact integer for meridians
    return Number.isInteger(longitude);
  }

  return true;
};

/**
 * Validates aircraft altitude with enhanced safety checks
 * @param altitude - Aircraft altitude
 * @param unit - Altitude unit ('feet' or 'meters')
 * @returns boolean indicating if altitude is valid
 */
export const validateAltitude = (altitude: number, unit: 'feet' | 'meters' = 'feet'): boolean => {
  if (typeof altitude !== 'number' || isNaN(altitude)) {
    return false;
  }

  // Convert meters to feet if necessary
  const altitudeInFeet = unit === 'meters' ? altitude * 3.28084 : altitude;

  // Verify non-negative and within maximum flight ceiling
  if (altitudeInFeet < 0 || altitudeInFeet > 60000) {
    return false;
  }

  // Validate decimal precision (1 place max for feet, 2 places max for meters)
  const decimalPlaces = altitude.toString().split('.')[1]?.length || 0;
  const maxDecimals = unit === 'meters' ? 2 : 1;
  if (decimalPlaces > maxDecimals) {
    return false;
  }

  return true;
};