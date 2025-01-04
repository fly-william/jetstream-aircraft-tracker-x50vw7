/**
 * @fileoverview Enhanced aircraft tracking map component with real-time updates and accessibility
 * @version 1.0.0
 * @requires mapbox-gl ^2.15.0
 * @requires @mui/material ^5.x
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl, { Map, LngLat } from 'mapbox-gl'; // ^2.15.0
import { Box } from '@mui/material'; // @mui/material v5.x
import { useA11y } from '@react-aria/focus'; // ^3.14.0
import { usePerformanceMonitor } from '@performance-monitor/react'; // ^1.0.0

import { MapContainer } from '../../styles/components/map.styles';
import MapControls from './MapControls';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import useWebSocket from '../../hooks/useWebSocket';
import mapConfig from '../../config/map.config';
import { MapConstants, LAYER_IDS, LAYER_DEFAULTS } from '../../constants/map.constants';
import { websocketConfig } from '../../config/websocket.config';

// Type definitions for aircraft position data
interface AircraftPosition {
  id: string;
  registration: string;
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  groundSpeed: number;
  timestamp: string;
}

interface TrackingMapProps {
  onAircraftSelect: (aircraftId: string) => void;
  onError: (error: Error) => void;
  onConnectionStatus: (status: boolean) => void;
}

interface LayerState {
  aircraft: boolean;
  flightPath: boolean;
  weather: boolean;
}

/**
 * Enhanced aircraft tracking map component with real-time updates and accessibility
 */
const TrackingMap: React.FC<TrackingMapProps> = ({
  onAircraftSelect,
  onError,
  onConnectionStatus
}) => {
  // Refs and state
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const { socket, isConnected, connect, error: wsError } = useWebSocket();
  const [layerVisibility, setLayerVisibility] = useState<LayerState>({
    aircraft: true,
    flightPath: true,
    weather: false
  });

  // Performance monitoring
  const { trackMetric } = usePerformanceMonitor({
    metricName: 'map-performance',
    threshold: 100 // ms
  });

  // Accessibility setup
  const { focusWithin, focusProps } = useA11y();

  /**
   * Initialize Mapbox map instance
   */
  const initializeMap = useCallback(() => {
    if (!mapContainer.current) return;

    try {
      mapboxgl.accessToken = mapConfig.accessToken;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapConfig.style,
        center: mapConfig.center,
        zoom: mapConfig.zoom,
        minZoom: mapConfig.minZoom,
        maxZoom: mapConfig.maxZoom,
        bounds: [
          [mapConfig.bounds.west, mapConfig.bounds.south],
          [mapConfig.bounds.east, mapConfig.bounds.north]
        ],
        attributionControl: true,
        preserveDrawingBuffer: true // Enable map image capture
      });

      // Add navigation controls with keyboard support
      map.current.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: true }),
        'top-right'
      );

      // Add scale control
      map.current.addControl(
        new mapboxgl.ScaleControl({ maxWidth: 100, unit: 'nautical' }),
        'bottom-right'
      );

      // Initialize map layers
      map.current.on('load', initializeLayers);

      return () => map.current?.remove();
    } catch (error) {
      const mapError = error instanceof Error ? error : new Error('Map initialization failed');
      onError(mapError);
    }
  }, [onError]);

  /**
   * Initialize map layers with proper ordering
   */
  const initializeLayers = useCallback(() => {
    if (!map.current) return;

    try {
      // Add weather layer
      map.current.addSource(LAYER_IDS.WEATHER, {
        type: 'raster',
        tiles: [mapConfig.layers.weather.tileUrl],
        tileSize: 256,
        attribution: 'Weather data © Weather Provider'
      });

      map.current.addLayer({
        id: LAYER_IDS.WEATHER,
        type: 'raster',
        source: LAYER_IDS.WEATHER,
        layout: { visibility: layerVisibility.weather ? 'visible' : 'none' },
        paint: {
          'raster-opacity': LAYER_DEFAULTS.WEATHER.opacity,
          'raster-resampling': LAYER_DEFAULTS.WEATHER.rasterResampling
        }
      });

      // Add flight path layer
      map.current.addSource(LAYER_IDS.FLIGHT_PATH, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.current.addLayer({
        id: LAYER_IDS.FLIGHT_PATH,
        type: 'line',
        source: LAYER_IDS.FLIGHT_PATH,
        layout: { visibility: layerVisibility.flightPath ? 'visible' : 'none' },
        paint: {
          'line-color': LAYER_DEFAULTS.FLIGHT_PATH.lineColor,
          'line-width': LAYER_DEFAULTS.FLIGHT_PATH.lineWidth,
          'line-opacity': LAYER_DEFAULTS.FLIGHT_PATH.lineOpacity
        }
      });

    } catch (error) {
      const layerError = error instanceof Error ? error : new Error('Layer initialization failed');
      onError(layerError);
    }
  }, [layerVisibility, onError]);

  /**
   * Handle WebSocket aircraft position updates
   */
  const handlePositionUpdate = useCallback((data: AircraftPosition) => {
    if (!map.current) return;

    const start = performance.now();
    try {
      const { id, latitude, longitude, heading } = data;
      const lngLat = new LngLat(longitude, latitude);

      // Update or create marker
      if (markersRef.current[id]) {
        markersRef.current[id].setLngLat(lngLat).setRotation(heading);
      } else {
        const marker = new mapboxgl.Marker({
          element: createAircraftElement(data),
          rotation: heading,
          anchor: 'center',
          rotationAlignment: 'map'
        })
          .setLngLat(lngLat)
          .addTo(map.current);

        markersRef.current[id] = marker;
      }

      // Track performance
      const duration = performance.now() - start;
      trackMetric('position-update', duration);

    } catch (error) {
      const updateError = error instanceof Error ? error : new Error('Position update failed');
      onError(updateError);
    }
  }, [trackMetric, onError]);

  /**
   * Create custom aircraft marker element
   */
  const createAircraftElement = useCallback((data: AircraftPosition): HTMLDivElement => {
    const el = document.createElement('div');
    el.className = 'aircraft-marker';
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `Aircraft ${data.registration}`);
    el.setAttribute('tabindex', '0');
    el.style.width = '24px';
    el.style.height = '24px';
    el.style.backgroundImage = `url(${mapConfig.layers.aircraft.iconImage})`;
    el.style.backgroundSize = 'contain';
    el.style.cursor = 'pointer';

    el.addEventListener('click', () => onAircraftSelect(data.id));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        onAircraftSelect(data.id);
      }
    });

    return el;
  }, [onAircraftSelect]);

  /**
   * Handle layer visibility toggling
   */
  const handleLayerToggle = useCallback((layerName: keyof LayerState) => {
    if (!map.current) return;

    setLayerVisibility(prev => {
      const newState = { ...prev, [layerName]: !prev[layerName] };
      
      try {
        const visibility = newState[layerName] ? 'visible' : 'none';
        map.current?.setLayoutProperty(LAYER_IDS[layerName.toUpperCase()], 'visibility', visibility);
      } catch (error) {
        const toggleError = error instanceof Error ? error : new Error(`Layer toggle failed: ${layerName}`);
        onError(toggleError);
      }

      return newState;
    });
  }, [onError]);

  // Initialize map on mount
  useEffect(() => {
    initializeMap();
  }, [initializeMap]);

  // Handle WebSocket connection
  useEffect(() => {
    connect();
    return () => {
      Object.values(markersRef.current).forEach(marker => marker.remove());
      markersRef.current = {};
    };
  }, [connect]);

  // Subscribe to aircraft position updates
  useEffect(() => {
    if (socket && isConnected) {
      socket.on(websocketConfig.channels.aircraft.position, handlePositionUpdate);
      onConnectionStatus(true);
    } else {
      onConnectionStatus(false);
    }

    return () => {
      socket?.off(websocketConfig.channels.aircraft.position);
    };
  }, [socket, isConnected, handlePositionUpdate, onConnectionStatus]);

  // Handle WebSocket errors
  useEffect(() => {
    if (wsError) {
      onError(new Error(`WebSocket error: ${wsError.message}`));
    }
  }, [wsError, onError]);

  return (
    <ErrorBoundary onError={onError}>
      <MapContainer
        ref={mapContainer}
        role="application"
        aria-label="Aircraft tracking map"
        {...focusProps}
      >
        <MapControls
          onLayerToggle={handleLayerToggle}
          visibleLayers={layerVisibility}
          layerLoadingStates={{
            aircraft: false,
            flightPath: false,
            weather: false
          }}
        />
      </MapContainer>
    </ErrorBoundary>
  );
};

export default React.memo(TrackingMap);