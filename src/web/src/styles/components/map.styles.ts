import { styled } from '@mui/material/styles'; // @mui/material v5.x
import { Box, Paper } from '@mui/material'; // @mui/material v5.x
import { aviationTheme } from '../theme/aviation.theme';

// Constants for container heights across breakpoints
const MAP_CONTAINER_HEIGHT = {
  mobile: 'calc(100vh - 56px)', // Mobile header height adjustment
  tablet: 'calc(100vh - 64px)', // Desktop header height adjustment
  desktop: 'calc(100vh - 64px)' // Desktop header height adjustment
} as const;

// Constants for control positioning and accessibility
const CONTROLS_POSITION = {
  top: '12px',
  right: '12px',
  zIndex: 1000,
  minTouchTarget: '44px' // WCAG 2.1 minimum touch target size
} as const;

// Helper function to determine responsive height based on breakpoint
const getResponsiveHeight = (theme: typeof aviationTheme) => {
  const { up } = theme.breakpoints;
  
  // Apply safe area insets for mobile devices
  const safeAreaInset = 'env(safe-area-inset-bottom, 0px)';
  
  return {
    [up('xs')]: {
      height: `calc(${MAP_CONTAINER_HEIGHT.mobile} - ${safeAreaInset})`,
    },
    [up('md')]: {
      height: MAP_CONTAINER_HEIGHT.tablet,
    },
    [up('lg')]: {
      height: MAP_CONTAINER_HEIGHT.desktop,
    }
  };
};

// Main map container with responsive sizing
export const MapContainer = styled('div')(({ theme }) => ({
  position: 'relative',
  width: '100%',
  ...getResponsiveHeight(theme),
  overflow: 'hidden',
  borderRadius: `${theme.shape.borderRadius}px`,
  willChange: 'transform', // Optimize performance for transforms
  touchAction: 'manipulation', // Improve touch handling
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none', // Honor reduced motion preferences
  },
  // Ensure proper stacking context
  isolation: 'isolate',
  // Improve performance with GPU acceleration
  transform: 'translateZ(0)',
  // Ensure proper sizing in iOS Safari
  WebkitOverflowScrolling: 'touch'
}));

// Container for map controls with proper elevation and accessibility
export const MapControlsContainer = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  top: CONTROLS_POSITION.top,
  right: CONTROLS_POSITION.right,
  zIndex: CONTROLS_POSITION.zIndex,
  padding: theme.spacing(1),
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(4px)',
  '@supports not (backdrop-filter: blur(4px))': {
    backgroundColor: 'rgba(255, 255, 255, 0.98)' // Fallback for browsers without backdrop-filter
  },
  boxShadow: theme.shadows[3],
  minWidth: CONTROLS_POSITION.minTouchTarget,
  minHeight: CONTROLS_POSITION.minTouchTarget,
  // Ensure proper contrast ratio for accessibility
  color: theme.palette.text.primary,
  // Improve touch targets on mobile
  '@media (max-width: 600px)': {
    right: '8px',
    top: '8px'
  },
  // Ensure proper focus indication for keyboard navigation
  '&:focus-within': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px'
  }
}));

// Wrapper for layer toggle controls with proper spacing
export const LayerControlsWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  minWidth: '200px',
  // Responsive adjustments for mobile
  '@media (max-width: 600px)': {
    minWidth: '160px',
    gap: theme.spacing(0.5)
  },
  // Ensure proper touch targets for all children
  '& > *': {
    minHeight: CONTROLS_POSITION.minTouchTarget,
    // Improve touch feedback
    '&:active': {
      transform: 'scale(0.98)'
    }
  },
  // Improve keyboard navigation
  '& > *:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px'
  },
  // Ensure proper text contrast
  '& label': {
    color: theme.palette.text.primary,
    fontSize: '0.875rem',
    fontWeight: 500
  },
  // Improve toggle switch accessibility
  '& input[type="checkbox"]': {
    width: CONTROLS_POSITION.minTouchTarget,
    height: CONTROLS_POSITION.minTouchTarget,
    margin: 0,
    cursor: 'pointer'
  }
}));