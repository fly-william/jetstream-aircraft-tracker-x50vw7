/**
 * @fileoverview Constants and configurations for aircraft-related functionality
 * @version 1.0.0
 */

// External imports
import { useTheme } from '@mui/material'; // version: 5.x

// Internal imports
import { AircraftStatus, AircraftCategory } from '../types/aircraft.types';

/**
 * Theme-aware color mapping for aircraft status visualization
 * Ensures WCAG 2.1 compliance for color contrast
 */
export const AIRCRAFT_STATUS_COLORS: Record<AircraftStatus, string> = {
    [AircraftStatus.ACTIVE]: useTheme().palette.success.main,
    [AircraftStatus.INACTIVE]: useTheme().palette.grey[500],
    [AircraftStatus.MAINTENANCE]: useTheme().palette.warning.main
};

/**
 * Internationalization-ready display labels for aircraft status values
 * @todo: Move to i18n translation system when implemented
 */
export const AIRCRAFT_STATUS_LABELS: Record<AircraftStatus, string> = {
    [AircraftStatus.ACTIVE]: 'Active',
    [AircraftStatus.INACTIVE]: 'Inactive',
    [AircraftStatus.MAINTENANCE]: 'Maintenance'
};

/**
 * Internationalization-ready display labels for aircraft categories
 * @todo: Move to i18n translation system when implemented
 */
export const AIRCRAFT_CATEGORY_LABELS: Record<AircraftCategory, string> = {
    [AircraftCategory.LIGHT_JET]: 'Light Jet',
    [AircraftCategory.MIDSIZE_JET]: 'Midsize Jet',
    [AircraftCategory.HEAVY_JET]: 'Heavy Jet'
};

/**
 * Responsive size configurations for aircraft markers on map
 * Sizes are in pixels and scale with aircraft category
 */
export const AIRCRAFT_MARKER_SIZES: Record<AircraftCategory, number> = {
    [AircraftCategory.LIGHT_JET]: 24,
    [AircraftCategory.MIDSIZE_JET]: 32,
    [AircraftCategory.HEAVY_JET]: 40
};

/**
 * Real-time position update interval in milliseconds
 * Set to 5 seconds as per system requirements for real-time tracking
 */
export const AIRCRAFT_UPDATE_INTERVAL = 5000;

/**
 * Map zoom level thresholds for optimized aircraft marker visibility
 * Ensures appropriate marker scaling and clustering based on zoom level
 */
export const AIRCRAFT_ZOOM_THRESHOLDS = {
    /** Minimum zoom level for showing individual aircraft markers */
    MIN_ZOOM: 6,
    /** Maximum zoom level for detailed aircraft information */
    MAX_ZOOM: 16
} as const;

/**
 * Default map viewport settings for aircraft tracking
 * Provides optimal initial view for continental US coverage
 */
export const DEFAULT_MAP_VIEWPORT = {
    latitude: 39.8283,  // Continental US center latitude
    longitude: -98.5795, // Continental US center longitude
    zoom: 4,
    bearing: 0,
    pitch: 0,
    padding: { top: 20, bottom: 20, left: 20, right: 20 }
} as const;

/**
 * Aircraft marker opacity settings for different states
 * Ensures visual distinction while maintaining WCAG compliance
 */
export const AIRCRAFT_MARKER_OPACITY = {
    NORMAL: 1.0,
    DIMMED: 0.4,
    SELECTED: 1.0
} as const;

/**
 * Aircraft trail configuration for path visualization
 * Defines how historical positions are displayed on the map
 */
export const AIRCRAFT_TRAIL_CONFIG = {
    MAX_POINTS: 20,
    LINE_WIDTH: 2,
    OPACITY: 0.6
} as const;