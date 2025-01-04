/**
 * @fileoverview Map configuration settings for aircraft tracking interface
 * @version 1.0.0
 * @requires mapbox-gl ^2.15.0
 */

import { LngLat } from 'mapbox-gl'; // ^2.15.0
import { MapConstants, DEFAULT_CENTER } from '../constants/map.constants';

/**
 * Configuration interface for aircraft symbol layer
 */
interface AircraftLayerConfig {
  /** Minimum zoom level for aircraft visibility */
  minZoom: number;
  /** Size multiplier for aircraft icons */
  iconSize: number;
  /** Reference to aircraft icon sprite */
  iconImage: string;
}

/**
 * Configuration interface for flight path visualization
 */
interface FlightPathLayerConfig {
  /** Width of flight path lines */
  lineWidth: number;
  /** Color of flight path lines */
  lineColor: string;
  /** Opacity of flight path lines */
  lineOpacity: number;
}

/**
 * Configuration interface for weather overlay layer
 */
interface WeatherLayerConfig {
  /** Opacity of weather overlay */
  opacity: number;
  /** Resampling method for weather raster tiles */
  rasterResampling: string;
}

/**
 * Comprehensive interface for map configuration options
 */
interface MapConfig {
  /** Mapbox GL JS access token for authentication */
  accessToken: string;
  /** Mapbox style URL for map appearance */
  style: string;
  /** Default map center coordinates */
  center: LngLat;
  /** Default zoom level */
  zoom: number;
  /** Minimum allowed zoom level */
  minZoom: number;
  /** Maximum allowed zoom level */
  maxZoom: number;
  /** Map view boundaries for continental US */
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  /** Map control settings */
  controls: {
    navigation: boolean;
    scale: boolean;
    fullscreen: boolean;
    geolocate: boolean;
  };
  /** Layer-specific configurations */
  layers: {
    aircraft: AircraftLayerConfig;
    flightPath: FlightPathLayerConfig;
    weather: WeatherLayerConfig;
  };
  /** Interval for real-time position updates in milliseconds */
  updateInterval: number;
}

/**
 * Comprehensive map configuration object for aircraft tracking system
 */
const mapConfig: MapConfig = {
  accessToken: process.env.VITE_MAPBOX_ACCESS_TOKEN as string,
  style: 'mapbox://styles/mapbox/light-v11',
  center: DEFAULT_CENTER,
  zoom: MapConstants.DEFAULT_ZOOM,
  minZoom: 2,
  maxZoom: 16,
  bounds: {
    north: 50.0,
    south: 25.0,
    east: -65.0,
    west: -125.0
  },
  controls: {
    navigation: true,
    scale: true,
    fullscreen: true,
    geolocate: false
  },
  layers: {
    aircraft: {
      minZoom: 4,
      iconSize: 1.2,
      iconImage: 'aircraft-icon'
    },
    flightPath: {
      lineWidth: 2,
      lineColor: '#4A90E2',
      lineOpacity: 0.8
    },
    weather: {
      opacity: 0.6,
      rasterResampling: 'linear'
    }
  },
  updateInterval: 5000
};

export default mapConfig;