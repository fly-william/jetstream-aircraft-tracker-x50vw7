import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Drawer,
  useMediaQuery,
  useTheme,
  Skeleton,
  Alert,
  Button,
  Stack
} from '@mui/material';
import { debounce } from 'lodash';

// Internal imports
import DashboardLayout from '../layouts/DashboardLayout';
import TripList from '../components/trip/TripList';
import TripDetails from '../components/trip/TripDetails';
import PageHeader from '../components/common/PageHeader';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { Trip, TripStatus } from '../types/trip.types';
import { useAuth } from '../hooks/useAuth';
import useTripData from '../hooks/useTripData';

// Default notification preferences
const DEFAULT_NOTIFICATION_PREFS = {
  notifyOperations: true,
  notifySales: true,
  notifyManagement: false,
  notificationChannels: ['teams'],
  isUrgent: false
};

// Interface for component state
interface TripManagementState {
  selectedTripId: string | null;
  detailsOpen: boolean;
  filters: Record<string, any>;
  loading: boolean;
  error: Error | null;
  wsStatus: 'connected' | 'disconnected' | 'connecting';
  offlineMode: boolean;
}

/**
 * TripManagement page component with real-time updates and Teams integration
 */
const TripManagement: React.FC = () => {
  // Theme and responsive layout
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { hasPermission } = useAuth();

  // Component state
  const [state, setState] = useState<TripManagementState>({
    selectedTripId: null,
    detailsOpen: false,
    filters: {},
    loading: true,
    error: null,
    wsStatus: 'connecting',
    offlineMode: false
  });

  // Custom hooks for trip data management
  const {
    trips,
    loading,
    error,
    socketState,
    refreshTrips,
    updateTripStatus,
    retryFailedOperation
  } = useTripData(state.filters, DEFAULT_NOTIFICATION_PREFS);

  // Refs for optimization
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle trip selection
  const handleTripSelect = useCallback(async (tripId: string) => {
    try {
      setState(prev => ({
        ...prev,
        selectedTripId: tripId,
        detailsOpen: true,
        error: null
      }));

      // Update URL with selected trip
      const url = new URL(window.location.href);
      url.searchParams.set('tripId', tripId);
      window.history.pushState({}, '', url.toString());
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error
      }));
    }
  }, []);

  // Handle drawer close
  const handleDrawerClose = useCallback(() => {
    setState(prev => ({
      ...prev,
      detailsOpen: false,
      selectedTripId: null
    }));

    // Remove tripId from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('tripId');
    window.history.pushState({}, '', url.toString());
  }, []);

  // Handle filter changes with debounce
  const handleFilterChange = useCallback(
    debounce((newFilters: Record<string, any>) => {
      setState(prev => ({
        ...prev,
        filters: newFilters,
        loading: true
      }));
      refreshTrips();
    }, 500),
    [refreshTrips]
  );

  // Handle error retry
  const handleRetry = useCallback(async () => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null
    }));
    await retryFailedOperation();
  }, [retryFailedOperation]);

  // Initialize from URL params
  useEffect(() => {
    const url = new URL(window.location.href);
    const tripId = url.searchParams.get('tripId');
    if (tripId) {
      handleTripSelect(tripId);
    }
  }, [handleTripSelect]);

  // Monitor WebSocket connection
  useEffect(() => {
    setState(prev => ({
      ...prev,
      wsStatus: socketState,
      offlineMode: socketState === 'disconnected'
    }));
  }, [socketState]);

  // Auto-refresh when offline mode changes
  useEffect(() => {
    if (state.offlineMode) {
      refreshTimeoutRef.current = setInterval(refreshTrips, 30000);
    }
    return () => {
      if (refreshTimeoutRef.current) {
        clearInterval(refreshTimeoutRef.current);
      }
    };
  }, [state.offlineMode, refreshTrips]);

  // Render loading state
  if (loading && !state.selectedTripId) {
    return (
      <DashboardLayout>
        <Box p={3}>
          <Skeleton variant="rectangular" height={200} />
          <Box mt={2}>
            <Skeleton variant="rectangular" height={400} />
          </Box>
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <ErrorBoundary
      onError={(error) => {
        setState(prev => ({
          ...prev,
          error,
          loading: false
        }));
      }}
    >
      <DashboardLayout>
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <PageHeader
            title="Trip Management"
            breadcrumbs={[
              { label: 'Dashboard', path: '/dashboard' },
              { label: 'Trip Management', path: '/trips' }
            ]}
            actions={
              <Stack direction="row" spacing={2}>
                {hasPermission('create:trip') && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => {/* Implement new trip creation */}}
                  >
                    New Trip
                  </Button>
                )}
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={refreshTrips}
                  disabled={loading}
                >
                  Refresh
                </Button>
              </Stack>
            }
          />

          {state.wsStatus !== 'connected' && (
            <Alert
              severity={state.offlineMode ? 'warning' : 'info'}
              sx={{ mx: 3, mb: 2 }}
            >
              {state.offlineMode
                ? 'Working in offline mode. Some features may be limited.'
                : 'Connecting to real-time updates...'}
            </Alert>
          )}

          {error && (
            <Alert
              severity="error"
              sx={{ mx: 3, mb: 2 }}
              action={
                <Button color="inherit" size="small" onClick={handleRetry}>
                  Retry
                </Button>
              }
            >
              {error.message}
            </Alert>
          )}

          <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
            <TripList
              onTripSelect={handleTripSelect}
              filters={state.filters}
              onError={(error) => {
                setState(prev => ({
                  ...prev,
                  error
                }));
              }}
            />
          </Box>

          <Drawer
            anchor={isMobile ? 'bottom' : 'right'}
            open={state.detailsOpen}
            onClose={handleDrawerClose}
            variant="temporary"
            sx={{
              '& .MuiDrawer-paper': {
                width: isMobile ? '100%' : '40%',
                maxWidth: 600,
                height: isMobile ? '80%' : '100%'
              }
            }}
          >
            {state.selectedTripId && (
              <TripDetails
                tripId={state.selectedTripId}
                onClose={handleDrawerClose}
                enableRealTime={!state.offlineMode}
                enableTeamsNotifications={true}
              />
            )}
          </Drawer>
        </Box>
      </DashboardLayout>
    </ErrorBoundary>
  );
};

export default TripManagement;