/**
 * Test suite for useTripData hook
 * @version 1.0.0
 */

// External imports
import { renderHook, act, waitFor } from '@testing-library/react'; // version: 14.x
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest'; // version: 0.34.x

// Internal imports
import { useTripData } from '../../src/hooks/useTripData';
import { tripApi } from '../../src/services/api/trip.api';
import TripSocket, { ConnectionState } from '../../src/services/websocket/trip.socket';
import { generateMockTrip, MockWebSocket, renderWithProviders } from '../utils/test-helpers';
import { TripStatus, Trip, Milestone, ServiceRequest } from '../../src/types/trip.types';

// Mock implementations
vi.mock('../../src/services/api/trip.api');
vi.mock('../../src/services/websocket/trip.socket');

describe('useTripData Hook', () => {
  // Test setup variables
  let mockTrips: Trip[];
  let mockSocket: MockWebSocket;
  let defaultNotificationPrefs: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Generate mock data
    mockTrips = [
      generateMockTrip({ status: TripStatus.SCHEDULED }),
      generateMockTrip({ status: TripStatus.IN_POSITION })
    ];

    // Setup default notification preferences
    defaultNotificationPrefs = {
      notifyOperations: true,
      notifySales: false,
      notifyManagement: false,
      notificationChannels: ['teams'],
      isUrgent: false
    };

    // Mock API responses
    vi.mocked(tripApi.getTrips).mockResolvedValue({
      data: { items: mockTrips, total: mockTrips.length },
      status: 200,
      message: 'Success',
      timestamp: new Date().toISOString()
    });

    // Setup WebSocket mock
    mockSocket = new MockWebSocket('ws://test', { latencyMs: 50 });
    vi.mocked(TripSocket).mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      subscribeToTripUpdates: vi.fn(),
      subscribeToMilestones: vi.fn(),
      subscribeToServiceRequests: vi.fn(),
      sendTripStatusUpdate: vi.fn(),
      getConnectionState: vi.fn().mockReturnValue(ConnectionState.CONNECTED),
      setErrorHandler: vi.fn()
    }));
  });

  afterEach(() => {
    mockSocket.close();
  });

  it('should initialize with loading state and fetch trips', async () => {
    const { result } = renderHook(() => useTripData({}, defaultNotificationPrefs), {
      wrapper: ({ children }) => renderWithProviders(children)
    });

    // Initial loading state
    expect(result.current.loading).toBe(true);
    expect(result.current.trips).toEqual([]);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Verify loaded data
    expect(result.current.trips).toEqual(mockTrips);
    expect(result.current.error).toBeNull();
    expect(tripApi.getTrips).toHaveBeenCalledTimes(1);
  });

  it('should handle real-time trip updates via WebSocket', async () => {
    const { result } = renderHook(() => useTripData({}, defaultNotificationPrefs), {
      wrapper: ({ children }) => renderWithProviders(children)
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Simulate WebSocket trip update
    const updatedTrip = {
      ...mockTrips[0],
      status: TripStatus.BOARDING
    };

    act(() => {
      mockSocket.simulateMessage({
        type: 'trip:status',
        payload: updatedTrip
      });
    });

    // Verify trip was updated
    await waitFor(() => {
      const trip = result.current.trips.find(t => t.id === updatedTrip.id);
      expect(trip?.status).toBe(TripStatus.BOARDING);
    });
  });

  it('should handle trip status updates with notifications', async () => {
    const { result } = renderHook(() => useTripData({}, defaultNotificationPrefs), {
      wrapper: ({ children }) => renderWithProviders(children)
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const tripId = mockTrips[0].id;
    const newStatus = TripStatus.BOARDING;

    // Update trip status
    await act(async () => {
      await result.current.updateTripStatus(tripId, newStatus, defaultNotificationPrefs);
    });

    // Verify API call
    expect(tripApi.updateTripStatus).toHaveBeenCalledWith(
      tripId,
      expect.objectContaining({
        newStatus,
        notifyOperations: true,
        notifySales: false,
        notifyManagement: false
      }),
      defaultNotificationPrefs
    );

    // Verify optimistic update
    const updatedTrip = result.current.trips.find(t => t.id === tripId);
    expect(updatedTrip?.status).toBe(newStatus);
  });

  it('should handle error states and retry operations', async () => {
    // Mock API error
    const mockError = new Error('API Error');
    vi.mocked(tripApi.getTrips).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useTripData({}, defaultNotificationPrefs), {
      wrapper: ({ children }) => renderWithProviders(children)
    });

    // Wait for error state
    await waitFor(() => {
      expect(result.current.error).toBe(mockError);
    });

    // Reset mock to succeed on retry
    vi.mocked(tripApi.getTrips).mockResolvedValueOnce({
      data: { items: mockTrips, total: mockTrips.length },
      status: 200,
      message: 'Success',
      timestamp: new Date().toISOString()
    });

    // Retry operation
    await act(async () => {
      await result.current.retryFailedOperation();
    });

    // Verify error was cleared and data loaded
    expect(result.current.error).toBeNull();
    expect(result.current.trips).toEqual(mockTrips);
  });

  it('should handle WebSocket reconnection', async () => {
    const { result } = renderHook(() => useTripData({}, defaultNotificationPrefs), {
      wrapper: ({ children }) => renderWithProviders(children)
    });

    // Simulate WebSocket disconnection
    act(() => {
      mockSocket.close();
    });

    // Verify disconnected state
    await waitFor(() => {
      expect(result.current.socketState).toBe(ConnectionState.DISCONNECTED);
    });

    // Simulate reconnection
    act(() => {
      mockSocket = new MockWebSocket('ws://test');
    });

    // Verify reconnected state
    await waitFor(() => {
      expect(result.current.socketState).toBe(ConnectionState.CONNECTED);
    });
  });

  it('should handle milestone updates', async () => {
    const { result } = renderHook(() => useTripData({}, defaultNotificationPrefs), {
      wrapper: ({ children }) => renderWithProviders(children)
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const tripId = mockTrips[0].id;
    const newMilestone: Milestone = {
      id: crypto.randomUUID(),
      tripId,
      type: 'BOARDING_START',
      timestamp: new Date(),
      details: {},
      userId: crypto.randomUUID()
    };

    // Add milestone
    await act(async () => {
      await result.current.addMilestone(tripId, newMilestone);
    });

    // Verify milestone was added
    const trip = result.current.trips.find(t => t.id === tripId);
    expect(trip?.milestones).toContainEqual(newMilestone);
  });

  it('should handle service request creation', async () => {
    const { result } = renderHook(() => useTripData({}, defaultNotificationPrefs), {
      wrapper: ({ children }) => renderWithProviders(children)
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const tripId = mockTrips[0].id;
    const newRequest: ServiceRequest = {
      id: crypto.randomUUID(),
      tripId,
      type: 'CATERING',
      scheduledTime: new Date(),
      status: 'PENDING',
      details: {},
      vendorId: crypto.randomUUID(),
      vendorName: 'Test Vendor',
      vendorContact: 'contact@test.com',
      confirmedTime: new Date(),
      completedTime: new Date(),
      statusHistory: [],
      requiresFollowUp: false,
      priority: 'NORMAL'
    };

    // Create service request
    await act(async () => {
      await result.current.createServiceRequest(tripId, newRequest);
    });

    // Verify service request was added
    const trip = result.current.trips.find(t => t.id === tripId);
    expect(trip?.serviceRequests).toContainEqual(newRequest);
  });
});