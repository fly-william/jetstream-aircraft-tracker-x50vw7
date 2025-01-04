/**
 * Aircraft API Service
 * @version 1.0.0
 * @description Implements API client functions for aircraft-related operations with enhanced error handling,
 * retry mechanisms, and real-time data capabilities
 */

// External imports
import circuitBreaker from 'opossum'; // version: ^6.0.0
import { compression } from 'axios-compression'; // version: ^1.0.0

// Internal imports
import { apiClient, handleApiError, retryRequest } from '../../utils/api.utils';
import { apiConfig, endpoints, retryConfig } from '../../config/api.config';
import { 
  Aircraft, 
  AircraftPosition, 
  AircraftList, 
  AircraftStatus,
  AircraftMarker 
} from '../../types/aircraft.types';
import { HTTP_STATUS, RATE_LIMITS } from '../../constants/api.constants';

// Circuit breaker configuration for API calls
const circuitBreakerConfig = {
  timeout: 30000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
};

// Cache configuration for aircraft data
const cacheConfig = {
  ttl: 60000, // 1 minute cache
  maxSize: 100
};

// WebSocket configuration for real-time updates
const websocketConfig = {
  reconnectInterval: 5000,
  maxRetries: 5
};

/**
 * Retrieves paginated list of all aircraft in the fleet
 * @param params - Query parameters for pagination and filtering
 * @returns Promise<AircraftList> - Paginated list of aircraft
 */
export const getAircraftList = async (params: {
  page?: number;
  limit?: number;
  status?: AircraftStatus;
  filter?: Record<string, any>;
}): Promise<AircraftList> => {
  const breaker = new circuitBreaker(async () => {
    try {
      const response = await apiClient.get(endpoints.aircraft.list, {
        params,
        headers: {
          'X-RateLimit-Limit': RATE_LIMITS.DEFAULT.toString()
        },
        ...compression()
      });

      return {
        items: response.data.items,
        total: response.data.total
      };
    } catch (error) {
      throw handleApiError(error);
    }
  }, circuitBreakerConfig);

  return breaker.fire();
};

/**
 * Retrieves detailed information for a specific aircraft
 * @param aircraftId - UUID of the aircraft
 * @returns Promise<Aircraft> - Detailed aircraft information
 */
export const getAircraftDetails = async (aircraftId: string): Promise<Aircraft> => {
  const breaker = new circuitBreaker(async () => {
    try {
      const response = await apiClient.get(
        endpoints.aircraft.details.replace(':id', aircraftId),
        {
          headers: {
            'X-RateLimit-Limit': RATE_LIMITS.DEFAULT.toString()
          }
        }
      );

      if (response.status !== HTTP_STATUS.OK) {
        throw new Error(`Failed to fetch aircraft details: ${response.status}`);
      }

      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }, circuitBreakerConfig);

  return breaker.fire();
};

/**
 * Retrieves current position data for a specific aircraft with real-time capabilities
 * @param aircraftId - UUID of the aircraft
 * @returns Promise<AircraftPosition> - Current aircraft position data
 */
export const getAircraftPosition = async (aircraftId: string): Promise<AircraftPosition> => {
  const breaker = new circuitBreaker(async () => {
    try {
      const response = await apiClient.get(
        endpoints.aircraft.position.replace(':id', aircraftId),
        {
          headers: {
            'X-RateLimit-Limit': RATE_LIMITS.AIRCRAFT_POSITION.toString(),
            'X-Priority': 'high'
          },
          timeout: 5000 // Shorter timeout for position data
        }
      );

      // Validate position data
      const position = response.data;
      if (
        !isValidLatitude(position.latitude) ||
        !isValidLongitude(position.longitude) ||
        !isValidAltitude(position.altitude)
      ) {
        throw new Error('Invalid position data received');
      }

      return {
        aircraftId,
        ...position,
        recorded: new Date(position.recorded)
      };
    } catch (error) {
      throw handleApiError(error);
    }
  }, {
    ...circuitBreakerConfig,
    timeout: 5000 // Override timeout for position requests
  });

  return breaker.fire();
};

/**
 * Validates latitude value
 * @param latitude - Latitude value to validate
 * @returns boolean - True if valid
 */
const isValidLatitude = (latitude: number): boolean => {
  return !isNaN(latitude) && latitude >= -90 && latitude <= 90;
};

/**
 * Validates longitude value
 * @param longitude - Longitude value to validate
 * @returns boolean - True if valid
 */
const isValidLongitude = (longitude: number): boolean => {
  return !isNaN(longitude) && longitude >= -180 && longitude <= 180;
};

/**
 * Validates altitude value
 * @param altitude - Altitude value to validate
 * @returns boolean - True if valid
 */
const isValidAltitude = (altitude: number): boolean => {
  return !isNaN(altitude) && altitude >= 0 && altitude <= 60000;
};

export type { Aircraft, AircraftPosition, AircraftList, AircraftMarker };