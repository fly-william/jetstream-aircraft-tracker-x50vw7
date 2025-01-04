/**
 * @fileoverview Enhanced aircraft list component with real-time updates, virtualization,
 * and accessibility features
 * @version 1.0.0
 */

import React, { useMemo, useCallback, memo } from 'react'; // v18.2.0
import { 
  Grid, 
  Box, 
  CircularProgress, 
  Typography, 
  Alert 
} from '@mui/material'; // v5.x
import { useVirtualizer } from '@tanstack/react-virtual'; // v3.x

// Internal imports
import { Aircraft } from '../../types/aircraft.types';
import { AircraftCard } from './AircraftCard';
import { useAircraftData } from '../../hooks/useAircraftData';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import LoadingSpinner from '../common/LoadingSpinner';

/**
 * Props interface for AircraftList component
 */
interface AircraftListProps {
  /** Callback when an aircraft is selected */
  onAircraftSelect: (aircraft: Aircraft) => void;
  /** Filter string for aircraft list */
  filter?: string;
  /** Sort field for aircraft list */
  sortBy?: keyof Aircraft;
  /** Optional CSS class name */
  className?: string;
  /** Threshold for enabling virtualization */
  virtualizeThreshold?: number;
}

/**
 * Memoized function to filter aircraft list based on search string
 */
const filterAircraft = (aircraft: Aircraft[], filter: string = '') => {
  const normalizedFilter = filter.toLowerCase().trim();
  
  if (!normalizedFilter) return aircraft;

  return aircraft.filter(item => 
    item.registration.toLowerCase().includes(normalizedFilter) ||
    item.type.toLowerCase().includes(normalizedFilter) ||
    item.status.toLowerCase().includes(normalizedFilter)
  );
};

/**
 * Memoized function to sort aircraft list based on specified field
 */
const sortAircraft = (aircraft: Aircraft[], sortBy?: keyof Aircraft) => {
  if (!sortBy) return aircraft;

  return [...aircraft].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    return String(aValue).localeCompare(String(bValue));
  });
};

/**
 * Enhanced aircraft list component with real-time updates and virtualization
 */
const AircraftList: React.FC<AircraftListProps> = memo(({
  onAircraftSelect,
  filter,
  sortBy,
  className,
  virtualizeThreshold = 50
}) => {
  // Initialize aircraft data hook with real-time updates
  const { 
    aircraft: aircraftData, 
    isLoading, 
    error, 
    connectionHealth,
    refreshData 
  } = useAircraftData();

  // Apply filtering and sorting with memoization
  const processedAircraft = useMemo(() => {
    if (!aircraftData) return [];
    let result = filterAircraft(aircraftData, filter);
    result = sortAircraft(result, sortBy);
    return result;
  }, [aircraftData, filter, sortBy]);

  // Configure virtualization for large lists
  const parentRef = React.useRef<HTMLDivElement>(null);
  const shouldVirtualize = processedAircraft.length > virtualizeThreshold;

  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? processedAircraft.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 5
  });

  // Optimized aircraft selection handler
  const handleAircraftSelect = useCallback((aircraft: Aircraft) => {
    onAircraftSelect(aircraft);
  }, [onAircraftSelect]);

  // Render loading state
  if (isLoading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight={400}
        role="status"
        aria-label="Loading aircraft data"
      >
        <LoadingSpinner size={48} />
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Alert 
        severity="error"
        action={
          <Button onClick={refreshData} color="inherit" size="small">
            Retry
          </Button>
        }
      >
        Failed to load aircraft data: {error.message}
      </Alert>
    );
  }

  // Render empty state
  if (!processedAircraft.length) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        p={4}
        role="status"
        aria-label="No aircraft found"
      >
        <Typography variant="h6" color="text.secondary">
          {filter ? 'No aircraft match your search' : 'No aircraft available'}
        </Typography>
      </Box>
    );
  }

  // Render connection status if not healthy
  const renderConnectionStatus = () => {
    if (connectionHealth.status !== 'connected') {
      return (
        <Alert 
          severity="warning" 
          sx={{ mb: 2 }}
          role="status"
        >
          {connectionHealth.status === 'reconnecting' 
            ? 'Reconnecting to real-time updates...' 
            : 'Real-time updates disconnected'}
        </Alert>
      );
    }
    return null;
  };

  return (
    <ErrorBoundary>
      <Box className={className}>
        {renderConnectionStatus()}
        
        <Box
          ref={parentRef}
          sx={{
            height: '100%',
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 200px)'
          }}
          role="grid"
          aria-label="Aircraft list"
        >
          <Grid 
            container 
            spacing={2} 
            sx={{ width: '100%', margin: 0 }}
          >
            {shouldVirtualize ? (
              rowVirtualizer.getVirtualItems().map(virtualRow => (
                <Grid 
                  item 
                  xs={12} 
                  sm={6} 
                  md={4} 
                  lg={3} 
                  key={processedAircraft[virtualRow.index].id}
                  style={{
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`
                  }}
                >
                  <AircraftCard
                    aircraft={processedAircraft[virtualRow.index]}
                    onClick={handleAircraftSelect}
                  />
                </Grid>
              ))
            ) : (
              processedAircraft.map(aircraft => (
                <Grid 
                  item 
                  xs={12} 
                  sm={6} 
                  md={4} 
                  lg={3} 
                  key={aircraft.id}
                >
                  <AircraftCard
                    aircraft={aircraft}
                    onClick={handleAircraftSelect}
                  />
                </Grid>
              ))
            )}
          </Grid>
        </Box>
      </Box>
    </ErrorBoundary>
  );
});

// Display name for debugging
AircraftList.displayName = 'AircraftList';

export default AircraftList;