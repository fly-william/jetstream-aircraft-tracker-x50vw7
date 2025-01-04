/**
 * @fileoverview Utility functions for map operations and aircraft tracking visualization
 * @version 1.0.0
 * @requires mapbox-gl ^2.15.0
 */

import { LngLat, Map } from 'mapbox-gl'; // ^2.15.0
import { MapViewport, MapBounds } from '../types/map.types';
import { MapConstants, DEFAULT_CENTER, MAP_BOUNDS } from '../constants/map.constants';

/**
 * Calculates map bounds that encompass all provided aircraft positions with optimized padding
 * @param positions - Array of aircraft position coordinates
 * @param padding - Padding in pixels to add around the bounds
 * @returns Calculated map boundaries
 */
export function calculateBounds(positions: LngLat[], padding: number = 50): MapBounds {
    if (!positions.length) {
        return MAP_BOUNDS;
    }

    let minLat = 90;
    let maxLat = -90;
    let minLng = 180;
    let maxLng = -180;
    let dateLineCrossing = false;

    // Calculate initial bounds
    positions.forEach(pos => {
        const lat = pos.lat;
        const lng = pos.lng;

        // Check for date line crossing
        if (maxLng < minLng || (lng < 0 && maxLng > 0)) {
            dateLineCrossing = true;
        }

        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        
        if (dateLineCrossing) {
            // Handle date line crossing by normalizing longitudes
            const normalizedLng = lng < 0 ? lng + 360 : lng;
            minLng = Math.min(minLng, normalizedLng);
            maxLng = Math.max(maxLng, normalizedLng);
        } else {
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
        }
    });

    // Apply bounds constraints
    return {
        north: Math.min(Math.max(maxLat, MAP_BOUNDS.south), MAP_BOUNDS.north),
        south: Math.max(Math.min(minLat, MAP_BOUNDS.north), MAP_BOUNDS.south),
        east: Math.min(Math.max(maxLng, MAP_BOUNDS.west), MAP_BOUNDS.east),
        west: Math.max(Math.min(minLng, MAP_BOUNDS.east), MAP_BOUNDS.west)
    };
}

/**
 * Adjusts map viewport to show all aircraft with smooth animation
 * @param map - Mapbox map instance
 * @param positions - Array of aircraft positions
 * @param padding - Padding in pixels around the bounds
 */
export function fitMapToAircraft(map: Map, positions: LngLat[], padding: number = 50): void {
    if (!map || !positions.length) {
        return;
    }

    const bounds = calculateBounds(positions, padding);
    const viewport: Partial<MapViewport> = {
        center: new LngLat(
            (bounds.east + bounds.west) / 2,
            (bounds.north + bounds.south) / 2
        ),
        zoom: calculateOptimalZoom(bounds, map.getContainer().getBoundingClientRect())
    };

    // Animate to new viewport with easing
    map.easeTo({
        center: viewport.center,
        zoom: Math.min(Math.max(viewport.zoom!, MapConstants.MIN_ZOOM), MapConstants.MAX_ZOOM),
        duration: MapConstants.ANIMATION_DURATION,
        easing: (t) => {
            // Custom easing function for smooth animation
            return t * (2 - t);
        }
    });
}

/**
 * Generates optimized flight path coordinates with great circle calculations
 * @param start - Starting position
 * @param end - Ending position
 * @param points - Number of points to generate (default: 100)
 * @returns Array of coordinates forming the flight path
 */
export function calculateFlightPath(start: LngLat, end: LngLat, points: number = 100): LngLat[] {
    if (!start || !end) {
        return [];
    }

    const path: LngLat[] = [];
    const startLat = toRadians(start.lat);
    const startLng = toRadians(start.lng);
    const endLat = toRadians(end.lat);
    const endLng = toRadians(end.lng);

    // Calculate great circle distance
    const d = 2 * Math.asin(Math.sqrt(
        Math.pow(Math.sin((endLat - startLat) / 2), 2) +
        Math.cos(startLat) * Math.cos(endLat) *
        Math.pow(Math.sin((endLng - startLng) / 2), 2)
    ));

    // Optimize number of points based on distance
    const numPoints = Math.min(Math.max(Math.ceil(d * 100), 50), points);

    // Generate path points
    for (let i = 0; i <= numPoints; i++) {
        const f = i / numPoints;
        const A = Math.sin((1 - f) * d) / Math.sin(d);
        const B = Math.sin(f * d) / Math.sin(d);

        const x = A * Math.cos(startLat) * Math.cos(startLng) +
                 B * Math.cos(endLat) * Math.cos(endLng);
        const y = A * Math.cos(startLat) * Math.sin(startLng) +
                 B * Math.cos(endLat) * Math.sin(endLng);
        const z = A * Math.sin(startLat) + B * Math.sin(endLat);

        const lat = Math.atan2(z, Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)));
        const lng = Math.atan2(y, x);

        path.push(new LngLat(toDegrees(lng), toDegrees(lat)));
    }

    return path;
}

/**
 * Calculates optimal zoom level based on bounds and container size
 * @private
 */
function calculateOptimalZoom(bounds: MapBounds, container: DOMRect): number {
    const latRatio = (bounds.north - bounds.south) / (container.height / 256);
    const lngRatio = (bounds.east - bounds.west) / (container.width / 256);
    const ratio = Math.max(latRatio, lngRatio);
    
    return Math.floor(Math.log2(1 / ratio));
}

/**
 * Converts degrees to radians
 * @private
 */
function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Converts radians to degrees
 * @private
 */
function toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
}