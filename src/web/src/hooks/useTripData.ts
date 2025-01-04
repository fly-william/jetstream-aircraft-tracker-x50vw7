/**
 * Advanced React hook for managing trip data with real-time updates
 * @version 1.0.0
 * @description Implements comprehensive trip management with WebSocket integration,
 * optimistic updates, and Teams notifications
 */

// External imports - React 18.2.x
import { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from 'lodash'; // version: 4.17.x

// Internal imports
import {
  tripApi,
  getTrips,
  getTripById,
  updateTripStatus,
  addTripMilestone,
  createServiceRequest,
  retryOperation
} from '../services/api/trip.api';
import TripSocket, { ConnectionState } from '../services/websocket/trip.socket';
import { Trip, TripStatus, Milestone, ServiceRequest, TripStatusUpdate } from '../types/trip.types';
import { ApiResponse, ApiError } from '../types/api.types';

/**
 * Interface for notification preferences
 */
interface NotificationPreferences {
  notifyOperations: boolean;
  notifySales: boolean;
  notifyManagement: boolean;
  notificationChannels: string[];
  isUrgent: boolean;
}

/**
 * Interface for hook return value
 */
interface UseTripDataReturn {
  trips: Trip[];
  loading: boolean;
  error: Error | null;
  socketState: ConnectionState;
  refreshTrips: () => Promise<void>;
  updateTripStatus: (tripId: string, status: TripStatus, preferences: NotificationPreferences) => Promise<void>;
  addMilestone: (tripId: string, milestone: Milestone) => Promise<void>;
  createServiceRequest: (tripId: string, request: ServiceRequest) => Promise<void>;
  setNotificationPreferences: (preferences: NotificationPreferences) => void;
  retryFailedOperation: () => Promise<void>;
}

/**
 * Custom hook for managing trip data with real-time updates
 */
export const useTripData = (
  filters: Record<string, any>,
  defaultNotificationPrefs: NotificationPreferences
): UseTripDataReturn => {
  // State management
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [socketState, setSocketState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(defaultNotificationPrefs);

  // Refs for managing WebSocket and retry state
  const socketRef = useRef<TripSocket | null>(null);
  const lastOperationRef = useRef<(() => Promise<void>) | null>(null);

  /**
   * Initialize WebSocket connection
   */
  const initializeSocket = useCallback(async () => {
    if (!socketRef.current) {
      socketRef.current = new TripSocket();
      
      socketRef.current.setErrorHandler((error: Error) => {
        console.error('WebSocket error:', error);
        setError(error);
      });

      try {
        await socketRef.current.connect();
        setSocketState(ConnectionState.CONNECTED);
      } catch (error) {
        setError(error as Error);
        setSocketState(ConnectionState.DISCONNECTED);
      }
    }
  }, []);

  /**
   * Set up WebSocket subscriptions
   */
  const setupSubscriptions = useCallback(() => {
    if (!socketRef.current) return;

    socketRef.current.subscribeToTripUpdates((updatedTrip: Trip) => {
      setTrips(prevTrips => 
        prevTrips.map(trip => 
          trip.id === updatedTrip.id ? updatedTrip : trip
        )
      );
    });

    socketRef.current.subscribeToMilestones((milestone: Milestone) => {
      setTrips(prevTrips =>
        prevTrips.map(trip => {
          if (trip.id === milestone.tripId) {
            return {
              ...trip,
              milestones: [...trip.milestones, milestone]
            };
          }
          return trip;
        })
      );
    });

    socketRef.current.subscribeToServiceRequests((request: ServiceRequest) => {
      setTrips(prevTrips =>
        prevTrips.map(trip => {
          if (trip.id === request.tripId) {
            return {
              ...trip,
              serviceRequests: [...trip.serviceRequests, request]
            };
          }
          return trip;
        })
      );
    });
  }, []);

  /**
   * Fetch initial trip data
   */
  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await tripApi.getTrips(filters, {
        page: 1,
        pageSize: 100,
        sortBy: 'startTime',
        sortOrder: 'desc'
      });
      setTrips(response.data.items);
    } catch (error) {
      setError(error as Error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  /**
   * Debounced refresh function
   */
  const debouncedRefresh = useCallback(
    debounce(async () => {
      await fetchTrips();
    }, 500),
    [fetchTrips]
  );

  /**
   * Update trip status with optimistic updates
   */
  const updateTripStatus = useCallback(async (
    tripId: string,
    status: TripStatus,
    preferences: NotificationPreferences
  ) => {
    const statusUpdate: TripStatusUpdate = {
      tripId,
      newStatus: status,
      notes: '',
      ...preferences
    };

    // Optimistic update
    setTrips(prevTrips =>
      prevTrips.map(trip =>
        trip.id === tripId ? { ...trip, status } : trip
      )
    );

    try {
      await tripApi.updateTripStatus(tripId, statusUpdate, preferences);
      socketRef.current?.sendTripStatusUpdate(statusUpdate);
    } catch (error) {
      // Revert optimistic update on error
      setError(error as Error);
      await fetchTrips();
    }
  }, [fetchTrips]);

  /**
   * Add milestone with optimistic update
   */
  const addMilestone = useCallback(async (
    tripId: string,
    milestone: Milestone
  ) => {
    // Optimistic update
    setTrips(prevTrips =>
      prevTrips.map(trip =>
        trip.id === tripId
          ? { ...trip, milestones: [...trip.milestones, milestone] }
          : trip
      )
    );

    try {
      await tripApi.recordMilestone(tripId, milestone);
    } catch (error) {
      setError(error as Error);
      await fetchTrips();
    }
  }, [fetchTrips]);

  /**
   * Create service request with optimistic update
   */
  const createServiceRequest = useCallback(async (
    tripId: string,
    request: ServiceRequest
  ) => {
    // Optimistic update
    setTrips(prevTrips =>
      prevTrips.map(trip =>
        trip.id === tripId
          ? { ...trip, serviceRequests: [...trip.serviceRequests, request] }
          : trip
      )
    );

    try {
      await tripApi.manageServiceRequests(tripId, [request]);
    } catch (error) {
      setError(error as Error);
      await fetchTrips();
    }
  }, [fetchTrips]);

  /**
   * Retry last failed operation
   */
  const retryFailedOperation = useCallback(async () => {
    if (lastOperationRef.current) {
      setError(null);
      try {
        await lastOperationRef.current();
      } catch (error) {
        setError(error as Error);
      }
    }
  }, []);

  // Initialize WebSocket and fetch data on mount
  useEffect(() => {
    initializeSocket();
    setupSubscriptions();
    fetchTrips();

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [initializeSocket, setupSubscriptions, fetchTrips]);

  // Monitor WebSocket connection state
  useEffect(() => {
    const checkConnection = setInterval(() => {
      if (socketRef.current) {
        setSocketState(socketRef.current.getConnectionState());
      }
    }, 5000);

    return () => clearInterval(checkConnection);
  }, []);

  return {
    trips,
    loading,
    error,
    socketState,
    refreshTrips: debouncedRefresh,
    updateTripStatus,
    addMilestone,
    createServiceRequest,
    setNotificationPreferences: setNotificationPrefs,
    retryFailedOperation
  };
};

export default useTripData;