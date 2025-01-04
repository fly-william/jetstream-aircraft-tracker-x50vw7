/**
 * Trip API Service Test Suite
 * @version 1.0.0
 * @description Comprehensive test coverage for trip management API operations
 */

// External imports
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'; // version: 0.34.x
import { rest } from 'msw'; // version: 1.x
import { waitFor } from '@testing-library/react'; // version: 14.x

// Internal imports
import {
  getTrips,
  getTripById,
  updateTripStatus,
  createServiceRequest,
  getTripMilestones
} from '../../src/services/api/trip.api';
import {
  generateMockTrip,
  MockWebSocket,
  cleanupMockWebSockets
} from '../utils/test-helpers';
import { Trip, TripStatus, ServiceRequest } from '../../src/types/trip.types';

describe('Trip API Service', () => {
  let mockTrip: Trip;
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    mockTrip = generateMockTrip();
    mockWebSocket = new MockWebSocket('wss://api.jetstream.flyusa.com/ws');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanupMockWebSockets();
  });

  describe('getTrips', () => {
    it('should retrieve paginated list of trips', async () => {
      const mockTrips = Array.from({ length: 3 }, () => generateMockTrip());
      const mockResponse = {
        items: mockTrips,
        total: 3,
        page: 1,
        pageSize: 10,
        totalPages: 1
      };

      const response = await getTrips(
        { status: [TripStatus.SCHEDULED] },
        { page: 1, pageSize: 10 }
      );

      expect(response.data).toEqual(mockResponse);
      expect(response.status).toBe(200);
    });

    it('should handle filtering by multiple statuses', async () => {
      const response = await getTrips(
        {
          status: [TripStatus.SCHEDULED, TripStatus.IN_POSITION],
          startDate: new Date(),
          endDate: new Date()
        },
        { page: 1, pageSize: 10 }
      );

      expect(response.data.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            status: expect.stringMatching(/SCHEDULED|IN_POSITION/)
          })
        ])
      );
    });

    it('should handle API errors gracefully', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await expect(
        getTrips(
          { status: [TripStatus.SCHEDULED] },
          { page: -1, pageSize: 10 }
        )
      ).rejects.toThrow('Invalid page number');
    });
  });

  describe('getTripById', () => {
    it('should retrieve trip details by ID', async () => {
      const response = await getTripById(mockTrip.id);

      expect(response.data).toEqual(
        expect.objectContaining({
          id: mockTrip.id,
          status: expect.any(String)
        })
      );
    });

    it('should handle non-existent trip ID', async () => {
      const nonExistentId = 'non-existent-id';
      
      await expect(getTripById(nonExistentId)).rejects.toThrow(
        'Trip not found'
      );
    });

    it('should include all trip relationships', async () => {
      const response = await getTripById(mockTrip.id);

      expect(response.data).toEqual(
        expect.objectContaining({
          milestones: expect.any(Array),
          serviceRequests: expect.any(Array)
        })
      );
    });
  });

  describe('updateTripStatus', () => {
    const mockStatusUpdate = {
      tripId: mockTrip.id,
      newStatus: TripStatus.IN_POSITION,
      notes: 'Aircraft arrived at FBO',
      notifyOperations: true,
      notifySales: true,
      notifyManagement: false,
      updateReason: 'Regular update',
      statusMetadata: {},
      isUrgent: false,
      notificationChannels: ['teams', 'email']
    };

    it('should update trip status and trigger WebSocket notification', async () => {
      const wsMessageSpy = vi.fn();
      mockWebSocket.onmessage = wsMessageSpy;

      const response = await updateTripStatus(
        mockTrip.id,
        mockStatusUpdate,
        {
          notifyOperations: true,
          notifySales: true,
          notifyManagement: false,
          notificationChannels: ['teams'],
          isUrgent: false
        }
      );

      expect(response.data.status).toBe(TripStatus.IN_POSITION);
      await waitFor(() => {
        expect(wsMessageSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.stringContaining('TRIP_UPDATE')
          })
        );
      });
    });

    it('should handle Teams notification failures gracefully', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const response = await updateTripStatus(
        mockTrip.id,
        mockStatusUpdate,
        {
          notifyOperations: true,
          notifySales: true,
          notifyManagement: false,
          notificationChannels: ['teams'],
          isUrgent: false
        }
      );

      expect(response.data.status).toBe(TripStatus.IN_POSITION);
    });

    it('should validate status transitions', async () => {
      const invalidUpdate = {
        ...mockStatusUpdate,
        newStatus: TripStatus.COMPLETED
      };

      await expect(
        updateTripStatus(
          mockTrip.id,
          invalidUpdate,
          {
            notifyOperations: true,
            notifySales: false,
            notifyManagement: false,
            notificationChannels: ['teams'],
            isUrgent: false
          }
        )
      ).rejects.toThrow('Invalid status transition');
    });
  });

  describe('createServiceRequest', () => {
    const mockServiceRequest: Partial<ServiceRequest> = {
      tripId: mockTrip.id,
      type: 'CATERING',
      scheduledTime: new Date(),
      vendorId: 'vendor-123',
      vendorName: 'Sky Catering',
      vendorContact: 'contact@skycatering.com',
      priority: 'HIGH'
    };

    it('should create new service request', async () => {
      const response = await createServiceRequest(mockTrip.id, mockServiceRequest);

      expect(response.data).toEqual(
        expect.objectContaining({
          tripId: mockTrip.id,
          type: 'CATERING',
          status: 'PENDING'
        })
      );
    });

    it('should validate service request parameters', async () => {
      const invalidRequest = {
        ...mockServiceRequest,
        scheduledTime: new Date(Date.now() - 86400000) // Past date
      };

      await expect(
        createServiceRequest(mockTrip.id, invalidRequest)
      ).rejects.toThrow('Invalid scheduled time');
    });

    it('should handle vendor availability checks', async () => {
      const response = await createServiceRequest(mockTrip.id, mockServiceRequest);

      expect(response.data.vendorId).toBe(mockServiceRequest.vendorId);
      expect(response.data.status).toBe('PENDING_VENDOR_CONFIRMATION');
    });
  });

  describe('getTripMilestones', () => {
    it('should retrieve trip milestones in chronological order', async () => {
      const response = await getTripMilestones(mockTrip.id);

      expect(response.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            tripId: mockTrip.id,
            timestamp: expect.any(String)
          })
        ])
      );

      // Verify chronological order
      const timestamps = response.data.map(m => new Date(m.timestamp).getTime());
      expect(timestamps).toEqual([...timestamps].sort());
    });

    it('should include milestone metadata', async () => {
      const response = await getTripMilestones(mockTrip.id);

      expect(response.data[0]).toEqual(
        expect.objectContaining({
          type: expect.any(String),
          details: expect.any(Object),
          userId: expect.any(String)
        })
      );
    });

    it('should handle large milestone datasets', async () => {
      const response = await getTripMilestones(mockTrip.id, { limit: 1000 });

      expect(response.data.length).toBeLessThanOrEqual(1000);
      expect(response.status).toBe(200);
    });
  });
});