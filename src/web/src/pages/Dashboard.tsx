/**
 * @fileoverview Main dashboard component providing real-time operational overview
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Grid,
  Box,
  Typography,
  Paper,
  Alert,
  useTheme,
  Skeleton
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { debounce } from 'lodash';

// Internal imports
import DashboardLayout from '../layouts/DashboardLayout';
import AircraftList from '../components/aircraft/AircraftList';
import TripList from '../components/trip/TripList';
import ErrorBoundary from '../components/common/ErrorBoundary';
import StatusBadge from '../components/common/StatusBadge';
import { useAircraftData } from '../hooks/useAircraftData';
import { useTripData } from '../hooks/useTripData';

// Default notification preferences
const DEFAULT_NOTIFICATION_PREFS = {
  notifyOperations: true,
  notifySales: true,
  notifyManagement: false,
  notificationChannels: ['teams'],
  isUrgent: false
};

/**
 * Enhanced dashboard component with real-time updates and performance optimizations
 */
const Dashboard: React.FC = () => {
  // Hooks
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<Error | null>(null);

  // Data hooks with WebSocket integration
  const {
    aircraft,
    loading: aircraftLoading,
    error: aircraftError,
    connectionHealth: aircraftConnection,
    refreshData: refreshAircraft
  } = useAircraftData();

  const {
    trips,
    loading: tripsLoading,
    error: tripsError,
    socketState: tripSocketState,
    refreshTrips
  } = useTripData({}, DEFAULT_NOTIFICATION_PREFS);

  // Memoized statistics
  const stats = useMemo(() => ({
    activeAircraft: aircraft?.filter(a => a.isActive).length || 0,
    activeTrips: trips?.filter(t => t.status === 'ENROUTE').length || 0,
    scheduledTrips: trips?.filter(t => t.status === 'SCHEDULED').length || 0,
    completedTrips: trips?.filter(t => t.status === 'COMPLETED').length || 0
  }), [aircraft, trips]);

  // Debounced refresh functions
  const debouncedRefresh = useCallback(
    debounce(() => {
      refreshAircraft();
      refreshTrips();
    }, 500),
    [refreshAircraft, refreshTrips]
  );

  // Error handling
  useEffect(() => {
    const newError = aircraftError || tripsError;
    if (newError) {
      setError(newError);
    }
  }, [aircraftError, tripsError]);

  // Navigation handlers
  const handleAircraftSelect = useCallback((aircraftId: string) => {
    navigate(`/aircraft/${aircraftId}`);
  }, [navigate]);

  const handleTripSelect = useCallback((tripId: string) => {
    navigate(`/trips/${tripId}`);
  }, [navigate]);

  // Render loading skeleton
  if (aircraftLoading || tripsLoading) {
    return (
      <DashboardLayout>
        <Box p={3}>
          <Grid container spacing={3}>
            {[1, 2, 3, 4].map((item) => (
              <Grid item xs={12} sm={6} md={3} key={item}>
                <Paper sx={{ p: 2 }}>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="rectangular" height={48} />
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <ErrorBoundary>
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            height: '100%',
            overflow: 'auto'
          }}
          role="main"
          aria-label="Dashboard"
        >
          {/* Status alerts */}
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 2 }}
              action={
                <Button onClick={debouncedRefresh}>
                  Retry
                </Button>
              }
            >
              {error.message}
            </Alert>
          )}

          {/* Statistics overview */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  height: 120
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Active Aircraft
                </Typography>
                <Typography variant="h3" color="primary">
                  {stats.activeAircraft}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  height: 120
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Active Trips
                </Typography>
                <Typography variant="h3" color="secondary">
                  {stats.activeTrips}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  height: 120
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Scheduled Trips
                </Typography>
                <Typography variant="h3" color="info.main">
                  {stats.scheduledTrips}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  height: 120
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Completed Today
                </Typography>
                <Typography variant="h3" color="success.main">
                  {stats.completedTrips}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Main content */}
          <Grid container spacing={3}>
            <Grid item xs={12} lg={6}>
              <Paper
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%'
                }}
              >
                <Typography variant="h5" gutterBottom>
                  Active Aircraft
                </Typography>
                <AircraftList
                  onAircraftSelect={handleAircraftSelect}
                  filter="active"
                  virtualizeThreshold={20}
                />
              </Paper>
            </Grid>
            <Grid item xs={12} lg={6}>
              <Paper
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%'
                }}
              >
                <Typography variant="h5" gutterBottom>
                  Recent Trips
                </Typography>
                <TripList
                  onTripSelect={handleTripSelect}
                  filters={{ isActive: true }}
                  pageSize={10}
                  onError={setError}
                />
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </ErrorBoundary>
    </DashboardLayout>
  );
};

export default React.memo(Dashboard);