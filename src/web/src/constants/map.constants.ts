/**
 * @fileoverview Map configuration constants for aircraft tracking interface
 * @version 1.0.0
 * @requires mapbox-gl ^2.15.0
 */

import { LngLat } from 'mapbox-gl';

/**
 * Interface defining precise map boundary coordinates for continental US coverage
 */
export interface MapBounds {
  /** Northern boundary latitude with safety margin */
  north: number;
  /** Southern boundary latitude with safety margin */
  south: number;
  /** Eastern boundary longitude with safety margin */
  east: number;
  /** Western boundary longitude with safety margin */
  west: number;
}

/**
 * Core map configuration values for consistent behavior
 */
export enum MapConstants {
  /** Default zoom level for initial map display */
  DEFAULT_ZOOM = 5,
  /** Minimum allowed zoom level */
  MIN_ZOOM = 2,
  /** Maximum allowed zoom level */
  MAX_ZOOM = 16,
  /** Real-time update interval in milliseconds */
  UPDATE_INTERVAL = 5000,
  /** Animation duration for smooth transitions in milliseconds */
  ANIMATION_DURATION = 500
}

/**
 * Default map center coordinates (Continental US)
 */
export const DEFAULT_CENTER: LngLat = new LngLat(-97.0, 39.0);

/**
 * Map boundary coordinates for continental US coverage with safety margins
 */
export const MAP_BOUNDS: MapBounds = {
  north: 50.0, // Northern boundary with Alaska margin
  south: 25.0, // Southern boundary with Florida margin
  east: -65.0, // Eastern boundary with Maine margin
  west: -125.0 // Western boundary with California margin
};

/**
 * Layer identifiers for map visualization components
 */
export enum LAYER_IDS {
  /** Aircraft position markers layer */
  AIRCRAFT = 'aircraft-layer',
  /** Flight path visualization layer */
  FLIGHT_PATH = 'flight-path-layer',
  /** Weather overlay layer */
  WEATHER = 'weather-layer'
}

/**
 * Default styling and behavior configurations for map layers
 */
export const LAYER_DEFAULTS = {
  /** Aircraft layer styling configuration */
  AIRCRAFT: {
    minZoom: 4,
    iconSize: 1.2,
    iconImage: 'aircraft-icon',
    iconAllowOverlap: true,
    iconIgnorePlacement: true
  },
  /** Flight path layer styling configuration */
  FLIGHT_PATH: {
    lineWidth: 2,
    lineColor: '#4A90E2',
    lineOpacity: 0.8,
    lineDasharray: [1, 0]
  },
  /** Weather layer styling configuration */
  WEATHER: {
    opacity: 0.6,
    rasterResampling: 'linear',
    minZoom: 3,
    maxZoom: 12
  }
} as const;

/**
 * Type definitions for layer configuration objects
 */
export type AircraftLayerConfig = typeof LAYER_DEFAULTS.AIRCRAFT;
export type FlightPathLayerConfig = typeof LAYER_DEFAULTS.FLIGHT_PATH;
export type WeatherLayerConfig = typeof LAYER_DEFAULTS.WEATHER;