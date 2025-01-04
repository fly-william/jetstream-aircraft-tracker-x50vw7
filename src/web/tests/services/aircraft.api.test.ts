/**
 * Aircraft API Service Tests
 * @version 1.0.0
 * @description Test suite for aircraft API service functions verifying real-time tracking,
 * fleet visibility, error handling, and data transformation capabilities
 */

// External imports - version comments as required
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest'; // version: 0.34.x
import axios from 'axios'; // version: 1.x
import { rest } from 'msw'; // version: 1.x

// Internal imports
import { getAircraftList, getAircraftDetails, getAircraftPosition } from '../../src/services/api/aircraft.api';
import { generateMockAircraft, generateMockTrip } from '../utils/test-helpers';
import { AircraftStatus, AircraftCategory } from '../../src/types/aircraft.types';
import { HTTP_STATUS, RATE_LIMITS } from '../../src/constants/api.constants';
import { apiConfig } from '../../src/config/api.config';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Aircraft API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getAircraftList', () => {
    const mockAircraftList = {
      items: [
        generateMockAircraft({
          id: '123e4567-e89b-12d3-a456-426614174000',
          registration: 'N123JS',
          status: AircraftStatus.ACTIVE
        }),
        generateMockAircraft({
          id: '123e4567-e89b-12d3-a456-426614174001',
          registration: 'N456JS',
          status: AircraftStatus.MAINTENANCE
        })
      ],
      total: 2
    };

    it('should successfully retrieve aircraft list with default parameters', async () => {
      mockedAxios.get.mockResolvedValueOnce({ 
        data: mockAircraftList,
        status: HTTP_STATUS.OK 
      });

      const result = await getAircraftList({});

      expect(mockedAxios.get).toHaveBeenCalledWith(
        apiConfig.endpoints.aircraft.list,
        expect.objectContaining({
          params: {},
          headers: {
            'X-RateLimit-Limit': RATE_LIMITS.DEFAULT.toString()
          }
        })
      );
      expect(result).toEqual(mockAircraftList);
    });

    it('should handle pagination parameters correctly', async () => {
      const params = { page: 1, limit: 10 };
      mockedAxios.get.mockResolvedValueOnce({ 
        data: mockAircraftList,
        status: HTTP_STATUS.OK 
      });

      await getAircraftList(params);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        apiConfig.endpoints.aircraft.list,
        expect.objectContaining({ params })
      );
    });

    it('should filter aircraft by status', async () => {
      const params = { status: AircraftStatus.ACTIVE };
      const filteredList = {
        items: [mockAircraftList.items[0]],
        total: 1
      };

      mockedAxios.get.mockResolvedValueOnce({ 
        data: filteredList,
        status: HTTP_STATUS.OK 
      });

      const result = await getAircraftList(params);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        apiConfig.endpoints.aircraft.list,
        expect.objectContaining({ params })
      );
      expect(result.items.length).toBe(1);
      expect(result.items[0].status).toBe(AircraftStatus.ACTIVE);
    });

    it('should handle network errors with retry mechanism', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({ 
          data: mockAircraftList,
          status: HTTP_STATUS.OK 
        });

      const result = await getAircraftList({});

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockAircraftList);
    });

    it('should handle rate limiting with exponential backoff', async () => {
      mockedAxios.get
        .mockRejectedValueOnce({ 
          response: { status: HTTP_STATUS.TOO_MANY_REQUESTS }
        })
        .mockResolvedValueOnce({ 
          data: mockAircraftList,
          status: HTTP_STATUS.OK 
        });

      const result = await getAircraftList({});

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockAircraftList);
    });
  });

  describe('getAircraftDetails', () => {
    const mockAircraft = generateMockAircraft({
      id: '123e4567-e89b-12d3-a456-426614174000',
      registration: 'N123JS'
    });

    it('should retrieve detailed aircraft information', async () => {
      mockedAxios.get.mockResolvedValueOnce({ 
        data: mockAircraft,
        status: HTTP_STATUS.OK 
      });

      const result = await getAircraftDetails(mockAircraft.id);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        apiConfig.endpoints.aircraft.details.replace(':id', mockAircraft.id),
        expect.objectContaining({
          headers: {
            'X-RateLimit-Limit': RATE_LIMITS.DEFAULT.toString()
          }
        })
      );
      expect(result).toEqual(mockAircraft);
    });

    it('should handle non-existent aircraft', async () => {
      mockedAxios.get.mockRejectedValueOnce({ 
        response: { status: HTTP_STATUS.NOT_FOUND }
      });

      await expect(getAircraftDetails('non-existent-id'))
        .rejects
        .toThrow();
    });

    it('should validate response data structure', async () => {
      const invalidData = { ...mockAircraft, category: 'INVALID_CATEGORY' };
      mockedAxios.get.mockResolvedValueOnce({ 
        data: invalidData,
        status: HTTP_STATUS.OK 
      });

      await expect(getAircraftDetails(mockAircraft.id))
        .rejects
        .toThrow();
    });
  });

  describe('getAircraftPosition', () => {
    const mockPosition = {
      aircraftId: '123e4567-e89b-12d3-a456-426614174000',
      latitude: 42.3601,
      longitude: -71.0589,
      altitude: 35000,
      groundSpeed: 450,
      heading: 270,
      recorded: new Date().toISOString()
    };

    it('should retrieve current aircraft position', async () => {
      mockedAxios.get.mockResolvedValueOnce({ 
        data: mockPosition,
        status: HTTP_STATUS.OK 
      });

      const result = await getAircraftPosition(mockPosition.aircraftId);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        apiConfig.endpoints.aircraft.position.replace(':id', mockPosition.aircraftId),
        expect.objectContaining({
          headers: {
            'X-RateLimit-Limit': RATE_LIMITS.AIRCRAFT_POSITION.toString(),
            'X-Priority': 'high'
          },
          timeout: 5000
        })
      );
      expect(result).toEqual({
        ...mockPosition,
        recorded: expect.any(Date)
      });
    });

    it('should validate position data ranges', async () => {
      const invalidPosition = {
        ...mockPosition,
        latitude: 100, // Invalid latitude
        longitude: 200  // Invalid longitude
      };

      mockedAxios.get.mockResolvedValueOnce({ 
        data: invalidPosition,
        status: HTTP_STATUS.OK 
      });

      await expect(getAircraftPosition(mockPosition.aircraftId))
        .rejects
        .toThrow('Invalid position data received');
    });

    it('should handle position request timeouts', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Timeout'));

      await expect(getAircraftPosition(mockPosition.aircraftId))
        .rejects
        .toThrow();
      
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ timeout: 5000 })
      );
    });

    it('should prioritize position requests with appropriate headers', async () => {
      mockedAxios.get.mockResolvedValueOnce({ 
        data: mockPosition,
        status: HTTP_STATUS.OK 
      });

      await getAircraftPosition(mockPosition.aircraftId);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Priority': 'high'
          })
        })
      );
    });
  });
});