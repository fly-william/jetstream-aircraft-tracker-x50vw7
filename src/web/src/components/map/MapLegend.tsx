/**
 * @fileoverview A React component that displays a legend for the aircraft tracking map
 * @version 1.0.0
 */

import React from 'react'; // version: 18.2.x
import { Box, Typography, Divider, useTheme } from '@mui/material'; // version: 5.x
import { useTranslation } from 'i18next'; // version: ^22.0.0
import { MapControlsContainer } from '../../styles/components/map.styles';
import StatusBadge from '../common/StatusBadge';
import { LAYER_IDS } from '../../constants/map.constants';
import { TripStatus } from '../../types/trip.types';

interface MapLegendProps {
  /** Optional CSS class name */
  className?: string;
  /** Array of currently visible layer IDs */
  visibleLayers: string[];
  /** Toggle compact mode for small screens */
  compact?: boolean;
}

const LEGEND_ITEMS = [
  {
    id: TripStatus.SCHEDULED,
    label: 'legend.scheduled',
    description: 'legend.scheduled.description',
    ariaLabel: 'legend.scheduled.aria'
  },
  {
    id: TripStatus.IN_POSITION,
    label: 'legend.inPosition',
    description: 'legend.inPosition.description',
    ariaLabel: 'legend.inPosition.aria'
  },
  {
    id: TripStatus.ENROUTE,
    label: 'legend.enroute',
    description: 'legend.enroute.description',
    ariaLabel: 'legend.enroute.aria'
  },
  {
    id: TripStatus.DELAYED,
    label: 'legend.delayed',
    description: 'legend.delayed.description',
    ariaLabel: 'legend.delayed.aria'
  }
] as const;

const LAYER_ITEMS = [
  {
    id: LAYER_IDS.AIRCRAFT,
    label: 'legend.layer.aircraft',
    description: 'legend.layer.aircraft.description'
  },
  {
    id: LAYER_IDS.FLIGHT_PATH,
    label: 'legend.layer.flightPath',
    description: 'legend.layer.flightPath.description'
  },
  {
    id: LAYER_IDS.WEATHER,
    label: 'legend.layer.weather',
    description: 'legend.layer.weather.description'
  }
] as const;

const isLayerVisible = (visibleLayers: string[], layerId: string): boolean => {
  return visibleLayers.includes(layerId);
};

const MapLegend: React.FC<MapLegendProps> = React.memo(({ 
  className,
  visibleLayers,
  compact = false
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <MapControlsContainer 
      className={className}
      role="complementary"
      aria-label={t('legend.ariaLabel')}
    >
      <Box sx={{ 
        p: compact ? 1 : 2,
        minWidth: compact ? '200px' : '280px'
      }}>
        {/* Legend Title */}
        <Typography 
          variant="h6" 
          component="h2" 
          sx={{ mb: 2, fontSize: compact ? '0.875rem' : '1rem' }}
        >
          {t('legend.title')}
        </Typography>

        {/* Status Indicators */}
        <Box sx={{ mb: 2 }}>
          <Typography 
            variant="subtitle2" 
            sx={{ mb: 1 }}
            color="text.secondary"
          >
            {t('legend.status.title')}
          </Typography>
          <Box sx={{ 
            display: 'grid',
            gap: 1,
            gridTemplateColumns: compact ? '1fr' : '1fr 1fr'
          }}>
            {LEGEND_ITEMS.map((item) => (
              <Box 
                key={item.id}
                sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <StatusBadge
                  status={item.id}
                  size={compact ? 'small' : 'medium'}
                  aria-label={t(item.ariaLabel)}
                />
                <Typography 
                  variant="body2"
                  component="span"
                  sx={{ 
                    fontSize: compact ? '0.75rem' : '0.875rem',
                    color: 'text.secondary'
                  }}
                >
                  {t(item.label)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Layer Visibility */}
        <Box>
          <Typography 
            variant="subtitle2" 
            sx={{ mb: 1 }}
            color="text.secondary"
          >
            {t('legend.layers.title')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {LAYER_ITEMS.map((layer) => (
              <Box 
                key={layer.id}
                sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: isLayerVisible(visibleLayers, layer.id) 
                      ? theme.palette.primary.main 
                      : theme.palette.action.disabled
                  }}
                  role="img"
                  aria-label={t(
                    isLayerVisible(visibleLayers, layer.id)
                      ? 'legend.layer.visible'
                      : 'legend.layer.hidden',
                    { layer: t(layer.label) }
                  )}
                />
                <Typography 
                  variant="body2"
                  component="span"
                  sx={{ 
                    fontSize: compact ? '0.75rem' : '0.875rem',
                    color: 'text.secondary'
                  }}
                >
                  {t(layer.label)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </MapControlsContainer>
  );
});

MapLegend.displayName = 'MapLegend';

export default MapLegend;