/**
 * @fileoverview React component for rendering optimized flight paths on Mapbox
 * @version 1.0.0
 * @requires react ^18.2.0
 * @requires react-map-gl ^7.1.0
 * @requires mapbox-gl ^2.15.0
 */

import React, { memo, useEffect, useMemo, useCallback } from 'react';
import { Layer, Source } from 'react-map-gl'; // ^7.1.0
import { LngLat } from 'mapbox-gl'; // ^2.15.0
import { MapLayer } from '../../types/map.types';
import { calculateFlightPath } from '../../utils/map.utils';

/**
 * Interface for custom flight path styling options
 */
interface FlightPathStyle {
    /** Line color in hex or rgba format */
    color: string;
    /** Line width in pixels */
    width: number;
    /** Optional dash pattern for the line */
    dashArray?: number[];
}

/**
 * Props interface for the FlightPathLayer component
 */
interface FlightPathLayerProps {
    /** Mapbox map instance */
    map: Map | null;
    /** Layer visibility toggle */
    visible: boolean;
    /** Layer opacity value between 0 and 1 */
    opacity: number;
    /** Starting coordinates of flight path */
    startPosition: LngLat;
    /** Ending coordinates of flight path */
    endPosition: LngLat;
    /** Layer ordering priority */
    zIndex?: number;
    /** Custom styling options */
    pathStyle?: FlightPathStyle;
    /** Update interval in milliseconds */
    updateInterval?: number;
}

// Constants for layer configuration
const FLIGHT_PATH_LAYER_ID = 'flight-path-layer';
const FLIGHT_PATH_SOURCE_ID = 'flight-path-source';
const FLIGHT_PATH_POINTS = 100;
const DEFAULT_LINE_COLOR = '#2196F3';
const DEFAULT_LINE_WIDTH = 2;
const UPDATE_INTERVAL = 5000;
const MAX_ALTITUDE_OFFSET = 10000;

/**
 * Enhanced React component for rendering flight paths with real-time updates
 */
const FlightPathLayer: React.FC<FlightPathLayerProps> = memo(({
    map,
    visible = true,
    opacity = 1,
    startPosition,
    endPosition,
    zIndex = 1,
    pathStyle,
    updateInterval = UPDATE_INTERVAL
}) => {
    // Validate required props
    if (!startPosition || !endPosition) {
        return null;
    }

    // Memoize path calculation for performance
    const pathCoordinates = useMemo(() => {
        return calculateFlightPath(startPosition, endPosition, FLIGHT_PATH_POINTS);
    }, [startPosition, endPosition]);

    // Generate GeoJSON for the flight path
    const pathGeoJSON = useMemo(() => ({
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'LineString',
            coordinates: pathCoordinates.map(coord => [
                coord.lng,
                coord.lat,
                // Add altitude variation for visual depth
                Math.sin(pathCoordinates.indexOf(coord) / pathCoordinates.length * Math.PI) * MAX_ALTITUDE_OFFSET
            ])
        }
    }), [pathCoordinates]);

    // Handle real-time updates
    useEffect(() => {
        if (!map || !visible) return;

        const updateTimer = setInterval(() => {
            if (map.getSource(FLIGHT_PATH_SOURCE_ID)) {
                map.getSource(FLIGHT_PATH_SOURCE_ID).setData(pathGeoJSON);
            }
        }, updateInterval);

        return () => clearInterval(updateTimer);
    }, [map, visible, pathGeoJSON, updateInterval]);

    // Merge default and custom styles
    const layerStyle = {
        'line-color': pathStyle?.color || DEFAULT_LINE_COLOR,
        'line-width': pathStyle?.width || DEFAULT_LINE_WIDTH,
        'line-dasharray': pathStyle?.dashArray,
        'line-opacity': opacity
    };

    return (
        <Source
            id={FLIGHT_PATH_SOURCE_ID}
            type="geojson"
            data={pathGeoJSON}
        >
            <Layer
                id={FLIGHT_PATH_LAYER_ID}
                type="line"
                source={FLIGHT_PATH_SOURCE_ID}
                paint={layerStyle}
                layout={{
                    'line-cap': 'round',
                    'line-join': 'round',
                    'visibility': visible ? 'visible' : 'none'
                }}
                beforeId={MapLayer.AIRCRAFT}
                minzoom={0}
                maxzoom={22}
            />
        </Source>
    );
});

// Display name for debugging
FlightPathLayer.displayName = 'FlightPathLayer';

export default FlightPathLayer;