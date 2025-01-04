/**
 * @fileoverview Map control interface component with WCAG 2.1 Level AA compliance
 * @version 1.0.0
 * @requires @mui/material ^5.x
 * @requires react ^18.2.0
 */

import React, { useCallback, useMemo } from 'react';
import { FormGroup, FormControlLabel, Switch, IconButton, Tooltip } from '@mui/material'; // @mui/material v5.x
import { MapControlsContainer, LayerControlsWrapper } from '../../styles/components/map.styles';
import mapConfig from '../../config/map.config';

// Type-safe layer configuration
type LayerName = keyof typeof mapConfig.layers;
type LayerVisibility = Record<LayerName, boolean>;
type LayerLoadingState = Record<LayerName, boolean>;

/**
 * Props interface for MapControls component
 */
interface MapControlsProps {
  /** Callback function when layer visibility is toggled */
  onLayerToggle: (layerName: LayerName) => void;
  /** Current layer visibility states */
  visibleLayers: LayerVisibility;
  /** Loading states for each layer */
  layerLoadingStates: LayerLoadingState;
}

/**
 * Constants for accessibility and internationalization
 */
const ARIA_LABELS = {
  controls: 'Map Layer Controls',
  layerGroup: 'Map Layer Visibility Options',
  toggle: (layerName: string) => `Toggle ${layerName} Layer Visibility`
} as const;

/**
 * Human-readable layer labels
 */
const LAYER_LABELS: Record<LayerName, string> = {
  aircraft: 'Aircraft',
  flightPath: 'Flight Paths',
  weather: 'Weather'
} as const;

/**
 * MapControls component providing layer toggle controls with accessibility support
 * @component
 */
const MapControls: React.FC<MapControlsProps> = React.memo(({
  onLayerToggle,
  visibleLayers,
  layerLoadingStates
}) => {
  /**
   * Debounced layer toggle handler with error handling
   * @param {LayerName} layerName - Name of layer being toggled
   */
  const handleLayerToggle = useCallback((layerName: LayerName) => {
    try {
      // Validate layer exists in configuration
      if (!(layerName in mapConfig.layers)) {
        throw new Error(`Invalid layer name: ${layerName}`);
      }
      onLayerToggle(layerName);
    } catch (error) {
      console.error('Error toggling layer:', error);
      // Could integrate with error reporting service here
    }
  }, [onLayerToggle]);

  /**
   * Memoized layer controls to prevent unnecessary re-renders
   */
  const layerControls = useMemo(() => (
    Object.keys(mapConfig.layers).map((layerName) => {
      const name = layerName as LayerName;
      const isLoading = layerLoadingStates[name];
      const isVisible = visibleLayers[name];

      return (
        <Tooltip
          key={name}
          title={isLoading ? 'Loading layer...' : ARIA_LABELS.toggle(LAYER_LABELS[name])}
          placement="left"
          arrow
        >
          <FormControlLabel
            control={
              <Switch
                checked={isVisible}
                onChange={() => handleLayerToggle(name)}
                name={`layer-toggle-${name}`}
                color="primary"
                disabled={isLoading}
                inputProps={{
                  'aria-label': ARIA_LABELS.toggle(LAYER_LABELS[name])
                }}
              />
            }
            label={LAYER_LABELS[name]}
            sx={{
              marginLeft: 0,
              marginRight: 0,
              // Improve touch target size for mobile
              '@media (max-width: 600px)': {
                minHeight: '44px'
              }
            }}
          />
        </Tooltip>
      );
    })
  ), [visibleLayers, layerLoadingStates, handleLayerToggle]);

  return (
    <MapControlsContainer
      role="region"
      aria-label={ARIA_LABELS.controls}
      elevation={3}
    >
      <LayerControlsWrapper>
        <FormGroup
          role="group"
          aria-label={ARIA_LABELS.layerGroup}
        >
          {layerControls}
        </FormGroup>
      </LayerControlsWrapper>
    </MapControlsContainer>
  );
});

// Display name for debugging and development tools
MapControls.displayName = 'MapControls';

export default MapControls;