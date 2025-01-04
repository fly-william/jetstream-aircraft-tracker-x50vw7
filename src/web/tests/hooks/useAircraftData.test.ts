/**
 * Test suite for useAircraftData hook
 * @version 1.0.0
 */

// External imports
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'; // v0.34.x
import { renderHook, act, waitFor } from '@testing-library/react'; // v14.x
import { faker } from '@faker-js/faker'; // v8.x

// Internal imports
import { useAircraftData } from '../../src/hooks/useAircraftData';
import { renderWithProviders, generateMockAircraft, MockWebSocket } from '../utils/test-helpers';
import { Aircraft, AircraftPosition, AircraftStatus } from '../../src/types/aircraft.types';
import { AircraftAPI } from '../../src/services/api/aircraft.api';

// Mock implementations
vi.mock('../../src/services/api/aircraft.api');
vi.mock('../../src/services/websocket/aircraft.socket');

describe('useAircraftData Hook', () => {
  // Test constants
  const TEST_AIRCRAFT_ID = crypto.randomUUID();
  const POSITION_UPDATE_LATENCY = 5000; // 5 seconds max latency requirement
  
  // Mocked data
  let mockAircraft: Aircraft;
  let mockPosition: AircraftPosition;
  let mockSocket: MockWebSocket;

  beforeEach(() => {
    // Reset timers and mocks
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Initialize mock data
    mockAircraft = generateMockAircraft({
      id: TEST_AIRCRAFT_ID,
      status: AircraftStatus.ACTIVE
    });

    mockPosition = {
      aircraftId: TEST_AIRCRAFT_ID,
      latitude: faker.location.latitude(),
      longitude: faker.location.longitude(),
      altitude: faker.number.int({ min: 0, max: 45000 }),
      groundSpeed: faker.number.int({ min: 0, max: 500 }),
      heading: faker.number.int({ min: 0, max: 359 }),
      recorded: new Date()
    };

    // Mock API responses
    vi.mocked(AircraftAPI.getAircraftDetails).mockResolvedValue(mockAircraft);
    vi.mocked(AircraftAPI.getAircraftPosition).mockResolvedValue(mockPosition);

    // Initialize mock WebSocket
    mockSocket = new MockWebSocket('ws://test', { latencyMs: 50 });
  });

  afterEach(() => {
    vi.useRealTimers();
    mockSocket.close();
  });

  describe('Initial State and Loading', () => {
    it('should initialize with correct default values', async () => {
      const { result } = renderHook(() => useAircraftData(TEST_AIRCRAFT_ID));

      expect(result.current.aircraft).toBeNull();
      expect(result.current.position).toBeNull();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.connectionHealth.status).toBe('disconnected');
    });

    it('should fetch initial aircraft data on mount', async () => {
      const { result } = renderHook(() => useAircraftData(TEST_AIRCRAFT_ID));

      await waitFor(() => {
        expect(result.current.aircraft).toEqual(mockAircraft);
        expect(result.current.position).toEqual(mockPosition);
        expect(result.current.isLoading).toBe(false);
      });

      expect(AircraftAPI.getAircraftDetails).toHaveBeenCalledWith(TEST_AIRCRAFT_ID);
      expect(AircraftAPI.getAircraftPosition).toHaveBeenCalledWith(TEST_AIRCRAFT_ID);
    });
  });

  describe('Real-time Updates', () => {
    it('should handle position updates within latency requirements', async () => {
      const { result } = renderHook(() => useAircraftData(TEST_AIRCRAFT_ID));

      // Wait for initial data load
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Simulate position update
      const newPosition: AircraftPosition = {
        ...mockPosition,
        latitude: faker.location.latitude(),
        longitude: faker.location.longitude(),
        recorded: new Date()
      };

      const updateStart = Date.now();
      act(() => {
        mockSocket.simulateMessage({ type: 'position', data: newPosition });
      });

      await waitFor(() => {
        expect(result.current.position).toEqual(newPosition);
        expect(Date.now() - updateStart).toBeLessThan(POSITION_UPDATE_LATENCY);
      });
    });

    it('should maintain connection health monitoring', async () => {
      const { result } = renderHook(() => useAircraftData(TEST_AIRCRAFT_ID));

      await waitFor(() => expect(result.current.connectionHealth.status).toBe('connected'));

      // Simulate successful updates
      act(() => {
        mockSocket.simulateMessage({ type: 'position', data: mockPosition });
      });

      expect(result.current.connectionHealth.latency).toBeLessThan(100);
      expect(result.current.connectionHealth.errorRate).toBe(0);
      expect(result.current.connectionHealth.lastUpdate).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Failed to fetch aircraft data';
      vi.mocked(AircraftAPI.getAircraftDetails).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAircraftData(TEST_AIRCRAFT_ID));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.error?.message).toBe(errorMessage);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle WebSocket disconnections with reconnection attempts', async () => {
      const { result } = renderHook(() => useAircraftData(TEST_AIRCRAFT_ID));

      await waitFor(() => expect(result.current.connectionHealth.status).toBe('connected'));

      act(() => {
        mockSocket.close();
      });

      expect(result.current.connectionHealth.status).toBe('disconnected');

      // Verify reconnection attempt
      await waitFor(() => {
        expect(result.current.connectionHealth.status).toBe('reconnecting');
        expect(result.current.connectionHealth.retryCount).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should maintain update frequency within 5-second requirement', async () => {
      const { result } = renderHook(() => useAircraftData(TEST_AIRCRAFT_ID));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const updates: number[] = [];
      const monitorUpdates = vi.fn((position: AircraftPosition) => {
        updates.push(Date.now());
      });

      // Monitor position updates
      vi.spyOn(result.current, 'position', 'get').mockImplementation(monitorUpdates);

      // Simulate multiple updates
      for (let i = 0; i < 5; i++) {
        act(() => {
          mockSocket.simulateMessage({
            type: 'position',
            data: { ...mockPosition, recorded: new Date() }
          });
        });
        vi.advanceTimersByTime(1000);
      }

      // Verify update intervals
      for (let i = 1; i < updates.length; i++) {
        const interval = updates[i] - updates[i - 1];
        expect(interval).toBeLessThan(POSITION_UPDATE_LATENCY);
      }
    });

    it('should track performance metrics accurately', async () => {
      const { result } = renderHook(() => useAircraftData(TEST_AIRCRAFT_ID));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Simulate successful updates
      act(() => {
        mockSocket.simulateMessage({ type: 'position', data: mockPosition });
      });

      expect(result.current.performanceMetrics).toMatchObject({
        updateLatency: expect.any(Array),
        connectionStability: expect.any(Number),
        errorRate: expect.any(Number),
        lastUpdateTime: expect.any(Date)
      });

      expect(result.current.performanceMetrics.updateLatency.length).toBeGreaterThan(0);
      expect(result.current.performanceMetrics.connectionStability).toBeGreaterThanOrEqual(0);
      expect(result.current.performanceMetrics.errorRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should cleanup resources on unmount', async () => {
      const { result, unmount } = renderHook(() => useAircraftData(TEST_AIRCRAFT_ID));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      unmount();

      expect(mockSocket.readyState).toBe(MockWebSocket.CLOSED);
      expect(result.current.connectionHealth.status).toBe('disconnected');
    });
  });
});