/**
 * @fileoverview Enhanced aircraft information card component with accessibility and performance optimizations
 * @version 1.0.0
 */

import React, { useCallback, memo } from 'react'; // version: 18.2.x
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Skeleton 
} from '@mui/material'; // version: 5.x

// Internal imports
import { Aircraft } from '../../types/aircraft.types';
import { AircraftCardContainer } from '../../styles/components/aircraft.styles';
import StatusBadge from '../common/StatusBadge';

/**
 * Props interface for AircraftCard component
 */
interface AircraftCardProps {
  /** Aircraft data to display */
  aircraft: Aircraft;
  /** Optional click handler for card interaction */
  onClick?: (aircraft: Aircraft) => void;
  /** Optional CSS class name */
  className?: string;
  /** Loading state indicator */
  loading?: boolean;
  /** Enable status animations */
  animated?: boolean;
}

/**
 * Enhanced aircraft card component with accessibility and performance optimizations
 */
const AircraftCard: React.FC<AircraftCardProps> = memo(({
  aircraft,
  onClick,
  className,
  loading = false,
  animated = true
}) => {
  /**
   * Optimized click handler with touch support
   */
  const handleClick = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (onClick) {
      onClick(aircraft);
    }
  }, [aircraft, onClick]);

  // Loading state with skeleton UI
  if (loading) {
    return (
      <AircraftCardContainer className={className}>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Skeleton variant="text" width="60%" height={32} />
            <Skeleton variant="text" width="40%" height={24} />
            <Skeleton variant="rectangular" width="80px" height={28} />
          </Box>
        </CardContent>
      </AircraftCardContainer>
    );
  }

  return (
    <AircraftCardContainer
      className={className}
      onClick={handleClick}
      onTouchEnd={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Aircraft ${aircraft.registration} details`}
      onKeyPress={(e) => e.key === 'Enter' && handleClick(e as React.MouseEvent)}
    >
      <CardContent>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 1 
        }}>
          {/* Aircraft registration with semantic heading */}
          <Typography 
            variant="h5" 
            component="h2" 
            sx={{ 
              fontWeight: 'bold',
              color: 'text.primary'
            }}
          >
            {aircraft.registration}
          </Typography>

          {/* Aircraft type with enhanced readability */}
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ 
              fontSize: {
                xs: '0.875rem',
                sm: '1rem'
              }
            }}
          >
            {aircraft.type}
          </Typography>

          {/* Status badge with semantic colors */}
          <Box sx={{ mt: 1 }}>
            <StatusBadge
              status={aircraft.status}
              size="medium"
              animated={animated}
            />
          </Box>

          {/* Last update timestamp with relative time */}
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            Last updated: {new Date(aircraft.lastUpdate).toLocaleString()}
          </Typography>
        </Box>
      </CardContent>
    </AircraftCardContainer>
  );
});

// Display name for debugging
AircraftCard.displayName = 'AircraftCard';

// Default export with type safety
export default AircraftCard;

// Named exports for specific use cases
export type { AircraftCardProps };