/**
 * @fileoverview TypeScript type definitions for map-related components and functionality
 * @version 1.0.0
 */

// Internal imports
import { Aircraft } from './aircraft.types';

// External imports - MapboxGL v2.15.0
import { LngLat, Map } from 'mapbox-gl';

/**
 * Interface defining the current view state of the map
 */
export interface MapViewport {
    /** Center coordinates of the map view */
    center: LngLat;
    /** Zoom level (0-22) */
    zoom: number;
    /** Map rotation in degrees */
    bearing: number;
    /** Map tilt angle in degrees */
    pitch: number;
}

/**
 * Interface defining the geographical boundaries of the map view
 */
export interface MapBounds {
    /** Northern latitude boundary */
    north: number;
    /** Southern latitude boundary */
    south: number;
    /** Eastern longitude boundary */
    east: number;
    /** Western longitude boundary */
    west: number;
}

/**
 * Enum defining available map layer types
 */
export enum MapLayer {
    /** Aircraft position markers layer */
    AIRCRAFT = 'aircraft',
    /** Flight path visualization layer */
    FLIGHT_PATH = 'flight_path',
    /** Weather data visualization layer */
    WEATHER = 'weather'
}

/**
 * Interface defining configuration options for map layers
 */
export interface MapLayerConfig {
    /** Layer visibility toggle */
    visible: boolean;
    /** Layer opacity (0-1) */
    opacity: number;
    /** Minimum zoom level for layer visibility */
    minZoom: number;
    /** Maximum zoom level for layer visibility */
    maxZoom: number;
}

/**
 * Interface defining map control element settings
 */
export interface MapControls {
    /** Navigation controls visibility */
    navigation: boolean;
    /** Scale indicator visibility */
    scale: boolean;
    /** Fullscreen control visibility */
    fullscreen: boolean;
    /** Geolocation control visibility */
    geolocate: boolean;
}

/**
 * Interface defining complete state for map component
 */
export interface MapState {
    /** Current map viewport settings */
    viewport: MapViewport;
    /** Layer configuration settings */
    layers: Record<MapLayer, MapLayerConfig>;
    /** Map control settings */
    controls: MapControls;
    /** Currently selected aircraft */
    selectedAircraft: Aircraft | null;
}

/**
 * Type for map interaction event handlers
 */
export type MapEventHandler = (map: Map, event: MouseEvent) => void;

/**
 * Interface for map initialization options
 */
export interface MapOptions {
    /** Initial viewport settings */
    initialViewport: MapViewport;
    /** Initial layer configurations */
    initialLayers?: Partial<Record<MapLayer, Partial<MapLayerConfig>>>;
    /** Initial control settings */
    initialControls?: Partial<MapControls>;
    /** Map style URL */
    styleUrl: string;
    /** Map container element ID */
    containerId: string;
}

/**
 * Default values for map configuration
 */
export const DEFAULT_MAP_CONFIG = {
    viewport: {
        zoom: 5,
        bearing: 0,
        pitch: 0
    },
    layerConfig: {
        visible: true,
        opacity: 1,
        minZoom: 0,
        maxZoom: 22
    },
    controls: {
        navigation: true,
        scale: true,
        fullscreen: true,
        geolocate: true
    }
} as const;