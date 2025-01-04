/**
 * @fileoverview React component for managing weather overlay layer on aircraft tracking map
 * @version 1.0.0
 * @requires react ^18.2.0
 * @requires mapbox-gl ^2.15.0
 */

import React, { useEffect, useCallback, memo } from 'react'; // ^18.2.0
import { Map } from 'mapbox-gl'; // ^2.15.0
import { LAYER_IDS } from '../../constants/map.constants';
import mapConfig from '../../config/map.config';
import useMapbox from '../../hooks/useMapbox';

/**
 * Props interface for WeatherLayer component
 */
interface WeatherLayerProps {
  /** Controls weather layer visibility */
  visible: boolean;
  /** Weather data source URL with API key */
  source: string;
  /** Loading state indicator */
  isLoading?: boolean;
  /** Error state object */
  errorState?: {
    hasError: boolean;
    message?: string;
  };
}

/**
 * Adds weather raster layer to map with error handling and performance optimization
 */
const addWeatherLayer = async (map: Map, source: string): Promise<void> => {
  try {
    // Check if source already exists to prevent duplicates
    if (!map.getSource(LAYER_IDS.WEATHER)) {
      await map.addSource(LAYER_IDS.WEATHER, {
        type: 'raster',
        tiles: [source],
        tileSize: 256,
        attribution: 'Weather data provided by weather service'
      });
    }

    // Add weather layer with optimized configuration
    map.addLayer({
      id: LAYER_IDS.WEATHER,
      type: 'raster',
      source: LAYER_IDS.WEATHER,
      paint: {
        'raster-opacity': mapConfig.layers.weather.opacity,
        'raster-resampling': mapConfig.layers.weather.rasterResampling
      },
      layout: {
        visibility: 'none' // Initially hidden until explicitly shown
      },
      minzoom: 3,
      maxzoom: 12
    });

  } catch (error) {
    console.error('Error adding weather layer:', error);
    throw new Error('Failed to initialize weather layer');
  }
};

/**
 * WeatherLayer component for managing weather overlay with enhanced features
 */
const WeatherLayer: React.FC<WeatherLayerProps> = memo(({
  visible,
  source,
  isLoading = false,
  errorState = { hasError: false }
}) => {
  const { mapInstance } = useMapbox();

  /**
   * Updates weather layer visibility with error handling
   */
  const updateLayerVisibility = useCallback(async () => {
    if (!mapInstance) return;

    try {
      const visibility = visible ? 'visible' : 'none';
      
      if (mapInstance.getLayer(LAYER_IDS.WEATHER)) {
        mapInstance.setLayoutProperty(
          LAYER_IDS.WEATHER,
          'visibility',
          visibility
        );
      }
    } catch (error) {
      console.error('Error updating weather layer visibility:', error);
    }
  }, [mapInstance, visible]);

  /**
   * Initialize weather layer on map load
   */
  useEffect(() => {
    if (!mapInstance || !source) return;

    const initializeWeatherLayer = async () => {
      try {
        await addWeatherLayer(mapInstance, source);
        await updateLayerVisibility();
      } catch (error) {
        console.error('Weather layer initialization error:', error);
      }
    };

    initializeWeatherLayer();

    // Cleanup on unmount
    return () => {
      if (mapInstance && mapInstance.getLayer(LAYER_IDS.WEATHER)) {
        mapInstance.removeLayer(LAYER_IDS.WEATHER);
        mapInstance.removeSource(LAYER_IDS.WEATHER);
      }
    };
  }, [mapInstance, source]);

  /**
   * Update visibility when visible prop changes
   */
  useEffect(() => {
    updateLayerVisibility();
  }, [visible, updateLayerVisibility]);

  /**
   * Handle loading and error states
   */
  useEffect(() => {
    if (!mapInstance) return;

    if (isLoading) {
      mapInstance.setLayoutProperty(
        LAYER_IDS.WEATHER,
        'raster-opacity',
        0.3
      );
    } else {
      mapInstance.setLayoutProperty(
        LAYER_IDS.WEATHER,
        'raster-opacity',
        mapConfig.layers.weather.opacity
      );
    }

    if (errorState.hasError) {
      console.error('Weather layer error:', errorState.message);
      // Optionally hide layer on error
      mapInstance.setLayoutProperty(
        LAYER_IDS.WEATHER,
        'visibility',
        'none'
      );
    }
  }, [mapInstance, isLoading, errorState]);

  // Component doesn't render any visible elements
  return null;
});

WeatherLayer.displayName = 'WeatherLayer';

export default WeatherLayer;