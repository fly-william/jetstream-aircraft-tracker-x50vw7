import React, { memo, useCallback } from 'react'; // react v18.2.0
import { Tooltip } from '@mui/material'; // @mui/material v5.14.0
import { FlightIcon } from '@mui/icons-material'; // @mui/icons-material v5.14.0
import { AircraftMarkerContainer } from '../../styles/components/aircraft.styles';
import { Aircraft, AircraftPosition } from '../../types/aircraft.types';

// Constants for component configuration
const TOOLTIP_DELAY = {
  enter: 200,
  leave: 0,
  touch: 500
} as const;

const MARKER_SIZE = {
  width: 44,
  height: 44,
  touchTarget: 48
} as const;

const ANIMATION_CONFIG = {
  duration: 300,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  gpuAccelerated: true
} as const;

// Interface for component props
interface AircraftMarkerProps {
  aircraft: Aircraft;
  position: AircraftPosition;
  onClick: (aircraft: Aircraft) => void;
}

/**
 * Calculates GPU-accelerated rotation style for aircraft marker
 * @param heading - Aircraft heading in degrees (0-359)
 * @returns CSS transform style object with optimizations
 */
const getRotationStyle = (heading: number) => {
  // Ensure heading is within valid range
  const normalizedHeading = ((heading % 360) + 360) % 360;
  
  return {
    transform: `rotate(${normalizedHeading}deg)`,
    transition: `transform ${ANIMATION_CONFIG.duration}ms ${ANIMATION_CONFIG.easing}`,
    willChange: 'transform',
    backfaceVisibility: 'hidden' as const,
    WebkitFontSmoothing: 'antialiased',
    perspective: 1000
  };
};

/**
 * Aircraft marker component for real-time position visualization
 * Implements WCAG 2.1 accessibility guidelines and touch optimization
 */
const AircraftMarker: React.FC<AircraftMarkerProps> = memo(({ 
  aircraft, 
  position, 
  onClick 
}) => {
  // Memoized click handler
  const handleClick = useCallback(() => {
    onClick(aircraft);
  }, [aircraft, onClick]);

  // Generate tooltip content
  const tooltipContent = `${aircraft.registration} - ${aircraft.type}
    Altitude: ${position.altitude}ft
    Speed: ${position.groundSpeed}kts`;

  return (
    <Tooltip
      title={tooltipContent}
      enterDelay={TOOLTIP_DELAY.enter}
      leaveDelay={TOOLTIP_DELAY.leave}
      enterTouchDelay={TOOLTIP_DELAY.touch}
      placement="top"
      arrow
    >
      <AircraftMarkerContainer
        onClick={handleClick}
        onKeyPress={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Aircraft ${aircraft.registration} - ${aircraft.status}`}
        sx={{
          ...getRotationStyle(position.heading),
          width: MARKER_SIZE.width,
          height: MARKER_SIZE.height,
          minWidth: MARKER_SIZE.touchTarget,
          minHeight: MARKER_SIZE.touchTarget,
        }}
      >
        <FlightIcon
          sx={{
            width: '100%',
            height: '100%',
            color: (theme) => theme.palette.primary.main,
            '&:hover': {
              color: (theme) => theme.palette.primary.dark
            }
          }}
          aria-hidden="true"
        />
      </AircraftMarkerContainer>
    </Tooltip>
  );
});

// Display name for debugging
AircraftMarker.displayName = 'AircraftMarker';

export default AircraftMarker;