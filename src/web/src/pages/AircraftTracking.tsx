/**
 * @fileoverview Main aircraft tracking page component with real-time updates and accessibility
 * @version 1.0.0
 * @requires react ^18.2.0
 * @requires @mui/material ^5.0.0
 * @requires react-use-websocket ^4.3.1
 */

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  Grid,
  Box,
  Drawer,
  IconButton,
  TextField,
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme
} from '@mui/material';
import TrackingMap from '../components/map/TrackingMap';
import ErrorBoundary from '../components/common/ErrorBoundary';
import useWebSocket from '../hooks/useWebSocket';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { websocketConfig } from '../config/websocket.config';

// Interface for aircraft tracking state management
interface AircraftTrackingState {
  selectedAircraftId: string | null;
  wsConnectionStatus: boolean;
  error: Error | null;
  isLoading: boolean;
  searchQuery: string;
  detailsOpen: boolean;
}

/**
 * Main aircraft tracking page component with real-time updates and error handling
 */
const AircraftTracking: React.FC = () => {
  // Theme and responsive layout handling
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State management
  const [state, setState] = useState<AircraftTrackingState>({
    selectedAircraftId: null,
    wsConnectionStatus: false,
    error: null,
    isLoading: true,
    searchQuery: '',
    detailsOpen: false
  });

  // WebSocket connection management
  const {
    socket,
    isConnected,
    connect,
    error: wsError,
    stats: wsStats,
    resetConnection
  } = useWebSocket();

  /**
   * Handles WebSocket connection status changes
   */
  const handleConnectionStatus = useCallback((status: boolean) => {
    setState(prev => ({
      ...prev,
      wsConnectionStatus: status,
      error: status ? null : new Error('WebSocket connection lost')
    }));
  }, []);

  /**
   * Handles aircraft selection from map
   */
  const handleAircraftSelect = useCallback((aircraftId: string) => {
    setState(prev => ({
      ...prev,
      selectedAircraftId: aircraftId,
      detailsOpen: true
    }));
  }, []);

  /**
   * Handles error states throughout the component
   */
  const handleError = useCallback((error: Error) => {
    setState(prev => ({
      ...prev,
      error,
      isLoading: false
    }));

    // Log error to monitoring service
    console.error('Aircraft tracking error:', error);
  }, []);

  /**
   * Handles search input changes
   */
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({
      ...prev,
      searchQuery: event.target.value
    }));
  }, []);

  /**
   * Handles details drawer close
   */
  const handleDetailsClose = useCallback(() => {
    setState(prev => ({
      ...prev,
      detailsOpen: false
    }));
  }, []);

  /**
   * Memoized connection status component
   */
  const connectionStatus = useMemo(() => {
    if (!state.wsConnectionStatus) {
      return (
        <Alert 
          severity="warning"
          action={
            <IconButton
              color="inherit"
              size="small"
              onClick={resetConnection}
              aria-label="Retry connection"
            >
              Retry
            </IconButton>
          }
        >
          Connection lost. Attempting to reconnect...
        </Alert>
      );
    }
    return null;
  }, [state.wsConnectionStatus, resetConnection]);

  // Initialize WebSocket connection
  useEffect(() => {
    connect().catch(handleError);

    return () => {
      setState(prev => ({
        ...prev,
        isLoading: false,
        selectedAircraftId: null
      }));
    };
  }, [connect, handleError]);

  // Handle WebSocket errors
  useEffect(() => {
    if (wsError) {
      handleError(new Error(`WebSocket error: ${wsError.message}`));
    }
  }, [wsError, handleError]);

  // Main render
  return (
    <ErrorBoundary onError={handleError}>
      <Box
        sx={{
          height: '100%',
          width: '100%',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {state.isLoading && (
          <LoadingSpinner
            size={40}
            color="primary"
            overlay={true}
          />
        )}

        {connectionStatus}

        <Grid container spacing={0} sx={{ height: '100%' }}>
          <Grid item xs={12} md={9} lg={10}>
            <TrackingMap
              onAircraftSelect={handleAircraftSelect}
              onError={handleError}
              onConnectionStatus={handleConnectionStatus}
            />
          </Grid>

          <Grid item xs={12} md={3} lg={2}>
            <Box
              sx={{
                p: 2,
                height: '100%',
                borderLeft: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}
            >
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search aircraft..."
                value={state.searchQuery}
                onChange={handleSearchChange}
                aria-label="Search aircraft"
                InputProps={{
                  startAdornment: <SearchIcon />,
                }}
              />
              
              {/* Aircraft list would be rendered here */}
            </Box>
          </Grid>
        </Grid>

        <Drawer
          anchor={isMobile ? 'bottom' : 'right'}
          open={state.detailsOpen}
          onClose={handleDetailsClose}
          variant="temporary"
          sx={{
            '& .MuiDrawer-paper': {
              width: isMobile ? '100%' : 400,
              maxHeight: isMobile ? '80vh' : '100%'
            }
          }}
        >
          {/* Aircraft details would be rendered here */}
        </Drawer>
      </Box>
    </ErrorBoundary>
  );
};

export default React.memo(AircraftTracking);