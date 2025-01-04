/**
 * AircraftLayer Component
 * @description React component for rendering a Mapbox GL layer containing aircraft markers
 * with real-time position updates via WebSocket.
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'; // v18.2.0
import { Layer } from 'react-map-gl'; // v7.1.0

// Internal imports
import AircraftMarker from '../aircraft/AircraftMarker';
import { useAircraftData } from '../../hooks/useAircraftData';
import { Aircraft, AircraftPosition } from '../../types/aircraft.types';

// Constants for component configuration
const LAYER_ID = 'aircraft-layer';
const UPDATE_INTERVAL = 5000; // 5 seconds update interval
const MAX_RETRY_ATTEMPTS = 3;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds health check

/**
 * Connection health status enum
 */
enum ConnectionStatus {
  Connected = 'connected',
  Disconnected = 'disconnected',
  Reconnecting = 'reconnecting'
}

/**
 * Props interface for AircraftLayer component
 */
interface AircraftLayerProps {
  aircraftList: Aircraft[];
  onAircraftClick: (aircraft: Aircraft) => void;
  visible: boolean;
  onConnectionError: (error: Error) => void;
  onConnectionHealthChange: (status: ConnectionStatus) => void;
}

/**
 * AircraftLayer component for real-time aircraft position visualization
 */
const AircraftLayer: React.FC<AircraftLayerProps> = React.memo(({
  aircraftList,
  onAircraftClick,
  visible,
  onConnectionError,
  onConnectionHealthChange
}) => {
  // State management
  const [aircraftPositions, setAircraftPositions] = useState<Map<string, AircraftPosition>>(new Map());
  const [connectionHealth, setConnectionHealth] = useState<ConnectionStatus>(ConnectionStatus.Connecting);
  
  // Refs for tracking component lifecycle
  const healthCheckInterval = useRef<NodeJS.Timeout>();
  const positionSubscriptions = useRef<Map<string, ReturnType<typeof useAircraftData>>>(new Map());

  /**
   * Handles aircraft position updates with validation
   */
  const handlePositionUpdate = useCallback((aircraftId: string, position: AircraftPosition) => {
    setAircraftPositions(current => {
      const updated = new Map(current);
      updated.set(aircraftId, position);
      return updated;
    });
  }, []);

  /**
   * Handles WebSocket connection errors
   */
  const handleConnectionError = useCallback((error: Error) => {
    setConnectionHealth(ConnectionStatus.Disconnected);
    onConnectionError(error);
  }, [onConnectionError]);

  /**
   * Initializes aircraft position tracking
   */
  const initializeTracking = useCallback((aircraft: Aircraft) => {
    const subscription = useAircraftData(aircraft.id, {
      updateInterval: UPDATE_INTERVAL,
      enableTelemetry: true,
      retryAttempts: MAX_RETRY_ATTEMPTS,
      validatePosition: true
    });

    subscription.refreshData().catch(handleConnectionError);
    positionSubscriptions.current.set(aircraft.id, subscription);

    return () => {
      subscription.cleanup();
      positionSubscriptions.current.delete(aircraft.id);
    };
  }, [handleConnectionError]);

  /**
   * Monitors connection health status
   */
  const monitorConnectionHealth = useCallback(() => {
    healthCheckInterval.current = setInterval(() => {
      const allConnected = Array.from(positionSubscriptions.current.values())
        .every(sub => sub.connectionHealth.status === 'connected');

      const newStatus = allConnected ? 
        ConnectionStatus.Connected : 
        ConnectionStatus.Disconnected;

      if (newStatus !== connectionHealth) {
        setConnectionHealth(newStatus);
        onConnectionHealthChange(newStatus);
      }
    }, HEALTH_CHECK_INTERVAL);

    return () => {
      if (healthCheckInterval.current) {
        clearInterval(healthCheckInterval.current);
      }
    };
  }, [connectionHealth, onConnectionHealthChange]);

  /**
   * Memoized aircraft markers for optimized rendering
   */
  const aircraftMarkers = useMemo(() => {
    return aircraftList.map(aircraft => {
      const position = aircraftPositions.get(aircraft.id);
      if (!position) return null;

      return (
        <AircraftMarker
          key={aircraft.id}
          aircraft={aircraft}
          position={position}
          onClick={onAircraftClick}
        />
      );
    }).filter(Boolean);
  }, [aircraftList, aircraftPositions, onAircraftClick]);

  /**
   * Initialize tracking for new aircraft
   */
  useEffect(() => {
    const cleanupFunctions = aircraftList.map(aircraft => initializeTracking(aircraft));
    const healthCheckCleanup = monitorConnectionHealth();

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
      healthCheckCleanup();
    };
  }, [aircraftList, initializeTracking, monitorConnectionHealth]);

  /**
   * Render optimized layer with aircraft markers
   */
  return (
    <Layer
      id={LAYER_ID}
      type="symbol"
      layout={{
        visibility: visible ? 'visible' : 'none',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'symbol-z-order': 'source'
      }}
    >
      {aircraftMarkers}
    </Layer>
  );
});

// Display name for debugging
AircraftLayer.displayName = 'AircraftLayer';

export default AircraftLayer;