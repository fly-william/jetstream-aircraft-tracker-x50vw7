/**
 * Enhanced custom React hook for managing aircraft data state and real-time updates
 * @version 1.0.0
 */

// External imports
import { useState, useEffect, useCallback, useRef } from 'react'; // v18.2.0

// Internal imports
import { AircraftAPI } from '../services/api/aircraft.api';
import { AircraftSocket } from '../services/websocket/aircraft.socket';
import { Aircraft, AircraftPosition } from '../types/aircraft.types';

/**
 * Connection health status interface
 */
interface ConnectionHealth {
  status: 'connected' | 'disconnected' | 'reconnecting';
  latency: number | null;
  lastUpdate: Date | null;
  retryCount: number;
  errorRate: number;
}

/**
 * Performance metrics interface
 */
interface PerformanceMetrics {
  updateLatency: number[];
  connectionStability: number;
  errorRate: number;
  lastUpdateTime: Date | null;
}

/**
 * Hook options interface
 */
interface UseAircraftDataOptions {
  updateInterval?: number;
  enableTelemetry?: boolean;
  retryAttempts?: number;
  validatePosition?: boolean;
}

/**
 * Enhanced aircraft data hook return type
 */
interface UseAircraftDataReturn {
  aircraft: Aircraft | null;
  position: AircraftPosition | null;
  isLoading: boolean;
  error: Error | null;
  connectionHealth: ConnectionHealth;
  performanceMetrics: PerformanceMetrics;
  refreshData: () => Promise<void>;
  reconnect: () => Promise<void>;
}

/**
 * Enhanced custom hook for managing aircraft data and real-time updates
 */
export const useAircraftData = (
  aircraftId: string,
  options: UseAircraftDataOptions = {}
): UseAircraftDataReturn => {
  // State management
  const [aircraft, setAircraft] = useState<Aircraft | null>(null);
  const [position, setPosition] = useState<AircraftPosition | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth>({
    status: 'disconnected',
    latency: null,
    lastUpdate: null,
    retryCount: 0,
    errorRate: 0
  });
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    updateLatency: [],
    connectionStability: 100,
    errorRate: 0,
    lastUpdateTime: null
  });

  // Refs for tracking component lifecycle and performance
  const isMounted = useRef<boolean>(true);
  const errorCount = useRef<number>(0);
  const updateCount = useRef<number>(0);
  const socketRef = useRef<AircraftSocket | null>(null);

  /**
   * Fetches initial aircraft data with enhanced error handling
   */
  const fetchAircraftData = useCallback(async () => {
    if (!aircraftId) return;

    try {
      setIsLoading(true);
      const startTime = Date.now();

      // Fetch aircraft details with retry logic
      const aircraftDetails = await AircraftAPI.getAircraftDetails(aircraftId);
      const currentPosition = await AircraftAPI.getAircraftPosition(aircraftId);

      if (isMounted.current) {
        setAircraft(aircraftDetails);
        setPosition(currentPosition);
        setError(null);

        // Update performance metrics
        const latency = Date.now() - startTime;
        setPerformanceMetrics(prev => ({
          ...prev,
          updateLatency: [...prev.updateLatency.slice(-10), latency],
          lastUpdateTime: new Date()
        }));
      }
    } catch (err) {
      errorCount.current++;
      const error = err instanceof Error ? err : new Error('Failed to fetch aircraft data');
      setError(error);
      setPerformanceMetrics(prev => ({
        ...prev,
        errorRate: (errorCount.current / ++updateCount.current) * 100
      }));
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [aircraftId]);

  /**
   * Initializes WebSocket connection with health monitoring
   */
  const initializeWebSocket = useCallback(() => {
    if (!aircraftId || socketRef.current) return;

    const socket = new AircraftSocket(
      null!, // Socket instance will be created internally
      {
        onPositionUpdate: (newPosition: AircraftPosition, timestamp: number) => {
          if (isMounted.current) {
            setPosition(newPosition);
            setConnectionHealth(prev => ({
              ...prev,
              status: 'connected',
              lastUpdate: new Date(),
              latency: Date.now() - timestamp
            }));
          }
        },
        onStatusChange: (updatedAircraft: Aircraft) => {
          if (isMounted.current) {
            setAircraft(updatedAircraft);
          }
        },
        onTrackingStart: () => {
          setConnectionHealth(prev => ({
            ...prev,
            status: 'connected',
            retryCount: 0
          }));
        },
        onTrackingStop: () => {
          setConnectionHealth(prev => ({
            ...prev,
            status: 'disconnected'
          }));
        },
        onError: (error: Error) => {
          errorCount.current++;
          setError(error);
          setConnectionHealth(prev => ({
            ...prev,
            status: 'disconnected',
            errorRate: (errorCount.current / ++updateCount.current) * 100
          }));
        },
        onReconnect: (attemptNumber: number) => {
          setConnectionHealth(prev => ({
            ...prev,
            status: 'reconnecting',
            retryCount: attemptNumber
          }));
        }
      },
      null! // Logger instance will be created internally
    );

    socketRef.current = socket;
    socket.initialize().then(() => {
      socket.startTracking(aircraftId, {
        updateInterval: options.updateInterval,
        enableTelemetry: options.enableTelemetry,
        retryAttempts: options.retryAttempts
      });
    });
  }, [aircraftId, options]);

  /**
   * Handles cleanup of WebSocket connection and resources
   */
  const cleanup = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.cleanup();
      socketRef.current = null;
    }
  }, []);

  /**
   * Refreshes aircraft data manually
   */
  const refreshData = useCallback(async () => {
    await fetchAircraftData();
  }, [fetchAircraftData]);

  /**
   * Reconnects WebSocket connection
   */
  const reconnect = useCallback(async () => {
    cleanup();
    initializeWebSocket();
  }, [cleanup, initializeWebSocket]);

  // Initialize data and WebSocket connection
  useEffect(() => {
    fetchAircraftData();
    initializeWebSocket();

    return () => {
      isMounted.current = false;
      cleanup();
    };
  }, [aircraftId, fetchAircraftData, initializeWebSocket, cleanup]);

  return {
    aircraft,
    position,
    isLoading,
    error,
    connectionHealth,
    performanceMetrics,
    refreshData,
    reconnect
  };
};

export default useAircraftData;