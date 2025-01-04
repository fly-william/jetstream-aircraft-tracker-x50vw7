import React from 'react';
import { CircularProgress, Box } from '@mui/material'; // @mui/material v5.x
import { styled } from '@mui/material/styles'; // @mui/material/styles v5.x
import { aviationTheme } from '../../styles/theme/aviation.theme';

// Interface for LoadingSpinner component props
interface LoadingSpinnerProps {
  size?: number;
  color?: 'primary' | 'secondary';
  overlay?: boolean;
}

// Styled component for overlay container
const SpinnerOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  zIndex: 1000,
  transition: 'opacity 0.2s ease-in-out',
  ...(theme.palette.mode === 'dark' && {
    backgroundColor: 'rgba(26, 27, 31, 0.8)'
  })
}));

// Memoized LoadingSpinner component
const LoadingSpinner: React.FC<LoadingSpinnerProps> = React.memo(({
  size = 40,
  color = 'primary',
  overlay = false
}) => {
  const spinnerColor = aviationTheme.palette[color]?.main || aviationTheme.palette.primary.main;

  const spinner = (
    <CircularProgress
      size={size}
      sx={{
        color: spinnerColor,
        '& .MuiCircularProgress-circle': {
          strokeLinecap: 'round'
        }
      }}
      aria-label="Loading content"
      role="progressbar"
    />
  );

  if (overlay) {
    return (
      <SpinnerOverlay
        role="alert"
        aria-busy="true"
        aria-live="polite"
      >
        {spinner}
      </SpinnerOverlay>
    );
  }

  return spinner;
});

// Display name for debugging
LoadingSpinner.displayName = 'LoadingSpinner';

export default LoadingSpinner;