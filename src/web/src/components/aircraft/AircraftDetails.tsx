/**
 * Enhanced Aircraft Details Component
 * @version 1.0.0
 * @description Displays real-time aircraft information with WebSocket updates,
 * comprehensive error handling, and accessibility features
 */

// External imports - v18.2.0
import React, { memo, useCallback, useMemo } from 'react';
// Material-UI components - v5.x
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  Alert,
  Tooltip,
  CircularProgress as LoadingSpinner,
  Box,
  Chip
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Internal imports
import { useAircraftData } from '../../hooks/useAircraftData';
import type { Aircraft } from '../../types/aircraft.types';

// Styled components for enhanced visuals
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  position: 'relative',
  '&:hover': {
    boxShadow: theme.shadows[4]
  }
}));

const StatusChip = styled(Chip)<{ status: string }>(({ theme, status }) => ({
  marginLeft: theme.spacing(1),
  backgroundColor: status === 'ACTIVE' ? theme.palette.success.main :
    status === 'MAINTENANCE' ? theme.palette.warning.main :
    theme.palette.error.main,
  color: theme.palette.common.white
}));

const ConnectionIndicator = styled(Box)<{ health: string }>(({ theme, health }) => ({
  width: 12,
  height: 12,
  borderRadius: '50%',
  backgroundColor: health === 'connected' ? theme.palette.success.main :
    health === 'reconnecting' ? theme.palette.warning.main :
    theme.palette.error.main,
  marginRight: theme.spacing(1)
}));

// Component props interface
interface AircraftDetailsProps {
  aircraftId: string;
  className?: string;
  onError?: (error: Error) => void;
}

/**
 * Enhanced aircraft details component with real-time updates
 */
const AircraftDetails: React.FC<AircraftDetailsProps> = memo(({
  aircraftId,
  className,
  onError
}) => {
  // Custom hook for aircraft data management
  const {
    aircraft,
    position,
    isLoading,
    error,
    connectionHealth,
    performanceMetrics,
    refreshData,
    reconnect
  } = useAircraftData(aircraftId, {
    updateInterval: 5000,
    enableTelemetry: true,
    retryAttempts: 3,
    validatePosition: true
  });

  // Error handling callback
  const handleError = useCallback((err: Error) => {
    console.error('Aircraft details error:', err);
    onError?.(err);
  }, [onError]);

  // Format update time with data freshness indicator
  const formatUpdateTime = useCallback((date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    return `${minutes} minutes ago`;
  }, []);

  // Memoized connection status display
  const connectionStatus = useMemo(() => ({
    label: connectionHealth.status === 'connected' ? 'Connected' :
      connectionHealth.status === 'reconnecting' ? 'Reconnecting...' : 'Disconnected',
    ariaLabel: `Connection status: ${connectionHealth.status}`
  }), [connectionHealth.status]);

  // Render loading state
  if (isLoading) {
    return (
      <StyledCard className={className}>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <LoadingSpinner
              aria-label="Loading aircraft details"
              role="progressbar"
            />
          </Box>
        </CardContent>
      </StyledCard>
    );
  }

  // Render error state
  if (error) {
    return (
      <StyledCard className={className}>
        <CardContent>
          <Alert
            severity="error"
            action={
              <Tooltip title="Retry loading aircraft details">
                <Box component="button" onClick={refreshData}>
                  Retry
                </Box>
              </Tooltip>
            }
          >
            {error.message}
          </Alert>
        </CardContent>
      </StyledCard>
    );
  }

  // Render no data state
  if (!aircraft) {
    return (
      <StyledCard className={className}>
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            No aircraft data available
          </Typography>
        </CardContent>
      </StyledCard>
    );
  }

  return (
    <StyledCard className={className}>
      <CardContent>
        {/* Header section with status */}
        <Grid container justifyContent="space-between" alignItems="center">
          <Grid item>
            <Typography variant="h5" component="h2">
              {aircraft.registration}
              <StatusChip
                label={aircraft.status}
                status={aircraft.status}
                aria-label={`Aircraft status: ${aircraft.status}`}
              />
            </Typography>
          </Grid>
          <Grid item>
            <Box display="flex" alignItems="center">
              <ConnectionIndicator
                health={connectionHealth.status}
                role="status"
                aria-label={connectionStatus.ariaLabel}
              />
              <Typography variant="caption" color="text.secondary">
                {connectionStatus.label}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Aircraft details */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Type
            </Typography>
            <Typography variant="body1">
              {aircraft.type}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Operator
            </Typography>
            <Typography variant="body1">
              {aircraft.operator}
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Position information */}
        {position && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">
                Current Position
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" color="text.secondary">
                Latitude
              </Typography>
              <Typography variant="body2">
                {position.latitude.toFixed(6)}°
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" color="text.secondary">
                Longitude
              </Typography>
              <Typography variant="body2">
                {position.longitude.toFixed(6)}°
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" color="text.secondary">
                Altitude
              </Typography>
              <Typography variant="body2">
                {position.altitude.toFixed(0)} ft
              </Typography>
            </Grid>
          </Grid>
        )}

        {/* Update timestamp and performance metrics */}
        <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary">
            Last updated: {formatUpdateTime(performanceMetrics.lastUpdateTime || new Date())}
          </Typography>
          <Tooltip title={`Connection latency: ${performanceMetrics.updateLatency[0]}ms`}>
            <Typography variant="caption" color="text.secondary">
              {performanceMetrics.connectionStability.toFixed(1)}% stable
            </Typography>
          </Tooltip>
        </Box>
      </CardContent>
    </StyledCard>
  );
});

// Display name for debugging
AircraftDetails.displayName = 'AircraftDetails';

export default AircraftDetails;