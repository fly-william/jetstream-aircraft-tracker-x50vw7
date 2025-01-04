/**
 * @fileoverview Custom React hook for managing Mapbox GL JS map instance and state
 * @version 1.0.0
 * @requires mapbox-gl ^2.15.0
 * @requires react ^18.2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Map, MapboxOptions, LngLatBounds } from 'mapbox-gl'; // ^2.15.0
import mapConfig from '../config/map.config';
import { MapState, MapLayer, MapOptions, MapViewport } from '../types/map.types';
import { LAYER_IDS, MAP_BOUNDS, DEFAULT_CENTER, MapConstants } from '../constants/map.constants';

/**
 * Interface for hook return value with comprehensive map controls
 */
interface UseMapboxReturn {
  mapInstance: Map | null;
  isLoaded: boolean;
  isError: boolean;
  mapState: MapState;
  setViewport: (viewport: Partial<MapViewport>) => void;
  toggleLayer: (layer: MapLayer) => void;
  resetView: () => void;
  reinitializeMap: () => void;
}

/**
 * Custom hook for managing Mapbox map instance with comprehensive functionality
 * @param containerId - HTML element ID for map mounting
 * @param options - Optional map initialization configuration
 */
const useMapbox = (
  containerId: string,
  options?: Partial<MapOptions>
): UseMapboxReturn => {
  // Map instance state with null safety
  const [mapInstance, setMapInstance] = useState<Map | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  // Map state management
  const [mapState, setMapState] = useState<MapState>({
    viewport: {
      center: DEFAULT_CENTER,
      zoom: MapConstants.DEFAULT_ZOOM,
      bearing: 0,
      pitch: 0
    },
    layers: {
      [MapLayer.AIRCRAFT]: { visible: true, opacity: 1, minZoom: 4, maxZoom: 16 },
      [MapLayer.FLIGHT_PATH]: { visible: true, opacity: 0.8, minZoom: 2, maxZoom: 16 },
      [MapLayer.WEATHER]: { visible: false, opacity: 0.6, minZoom: 3, maxZoom: 12 }
    },
    controls: {
      navigation: true,
      scale: true,
      fullscreen: true,
      geolocate: false
    },
    selectedAircraft: null
  });

  /**
   * Initialize map instance with error handling
   */
  const initializeMap = useCallback(() => {
    try {
      const container = document.getElementById(containerId);
      if (!container) {
        throw new Error(`Map container element with id "${containerId}" not found`);
      }

      // Configure map options with type safety
      const mapOptions: MapboxOptions = {
        container,
        accessToken: mapConfig.accessToken,
        style: options?.styleUrl || mapConfig.style,
        center: mapState.viewport.center,
        zoom: mapState.viewport.zoom,
        bearing: mapState.viewport.bearing,
        pitch: mapState.viewport.pitch,
        minZoom: mapConfig.minZoom,
        maxZoom: mapConfig.maxZoom,
        bounds: new LngLatBounds([MAP_BOUNDS.west, MAP_BOUNDS.south], [MAP_BOUNDS.east, MAP_BOUNDS.north])
      };

      const map = new Map(mapOptions);

      // Set up map event listeners
      map.on('load', () => {
        setIsLoaded(true);
        setIsError(false);
      });

      map.on('error', (error) => {
        console.error('Mapbox error:', error);
        setIsError(true);
      });

      map.on('moveend', () => {
        const center = map.getCenter();
        const zoom = map.getZoom();
        const bearing = map.getBearing();
        const pitch = map.getPitch();

        setMapState(prev => ({
          ...prev,
          viewport: { center, zoom, bearing, pitch }
        }));
      });

      setMapInstance(map);
    } catch (error) {
      console.error('Map initialization error:', error);
      setIsError(true);
    }
  }, [containerId, options, mapState.viewport]);

  /**
   * Update map viewport with bounds validation
   */
  const setViewport = useCallback((newViewport: Partial<MapViewport>) => {
    if (!mapInstance) return;

    try {
      const updatedViewport = {
        ...mapState.viewport,
        ...newViewport
      };

      mapInstance.easeTo({
        center: updatedViewport.center,
        zoom: updatedViewport.zoom,
        bearing: updatedViewport.bearing,
        pitch: updatedViewport.pitch,
        duration: MapConstants.ANIMATION_DURATION
      });

      setMapState(prev => ({
        ...prev,
        viewport: updatedViewport
      }));
    } catch (error) {
      console.error('Viewport update error:', error);
    }
  }, [mapInstance, mapState.viewport]);

  /**
   * Toggle layer visibility with type safety
   */
  const toggleLayer = useCallback((layer: MapLayer) => {
    if (!mapInstance) return;

    const layerId = LAYER_IDS[layer.toUpperCase()];
    const isVisible = mapInstance.getLayoutProperty(layerId, 'visibility') === 'visible';

    mapInstance.setLayoutProperty(
      layerId,
      'visibility',
      isVisible ? 'none' : 'visible'
    );

    setMapState(prev => ({
      ...prev,
      layers: {
        ...prev.layers,
        [layer]: {
          ...prev.layers[layer],
          visible: !isVisible
        }
      }
    }));
  }, [mapInstance]);

  /**
   * Reset map to default view
   */
  const resetView = useCallback(() => {
    if (!mapInstance) return;

    mapInstance.easeTo({
      center: DEFAULT_CENTER,
      zoom: MapConstants.DEFAULT_ZOOM,
      bearing: 0,
      pitch: 0,
      duration: MapConstants.ANIMATION_DURATION
    });

    setMapState(prev => ({
      ...prev,
      viewport: {
        center: DEFAULT_CENTER,
        zoom: MapConstants.DEFAULT_ZOOM,
        bearing: 0,
        pitch: 0
      }
    }));
  }, [mapInstance]);

  /**
   * Reinitialize map instance
   */
  const reinitializeMap = useCallback(() => {
    if (mapInstance) {
      mapInstance.remove();
    }
    initializeMap();
  }, [mapInstance, initializeMap]);

  // Initialize map on mount
  useEffect(() => {
    initializeMap();

    // Cleanup on unmount
    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [initializeMap]);

  return {
    mapInstance,
    isLoaded,
    isError,
    mapState,
    setViewport,
    toggleLayer,
    resetView,
    reinitializeMap
  };
};

export default useMapbox;