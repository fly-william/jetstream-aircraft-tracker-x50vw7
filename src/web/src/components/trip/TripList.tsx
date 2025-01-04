/**
 * @fileoverview Enhanced trip list component with real-time updates and virtualization
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react'; // version: 18.2.0
import {
  Grid,
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar
} from '@mui/material'; // version: 5.x
import { useVirtualizer } from '@tanstack/react-virtual'; // version: 3.x
import { styled } from '@mui/material/styles'; // version: 5.x

// Internal imports
import { Trip, TripStatus, WebSocketStatus } from '../../types/trip.types';
import TripCard from './TripCard';
import useTripData from '../../hooks/useTripData';
import LoadingSpinner from '../common/LoadingSpinner';
import { useTheme } from '../../hooks/useTheme';

// Component interfaces
interface TripListProps {
  onTripSelect: (tripId: string) => void;
  className?: string;
  filters?: TripFilters;
  pageSize?: number;
  onError?: (error: Error) => void;
}

interface TripFilters {
  status?: TripStatus[];
  dateRange?: DateRange;
  searchTerm?: string;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

// Styled components
const ListContainer = styled(Box)(({ theme }) => ({
  height: '100%',
  overflow: 'auto',
  padding: theme.spacing(2),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1),
  },
  '&:focus': {
    outline: 'none',
  },
  scrollBehavior: 'smooth',
}));

const FilterContainer = styled(Box)(({ theme }) => ({
  position: 'sticky',
  top: 0,
  zIndex: 1,
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1),
  },
}));

// Default notification preferences
const DEFAULT_NOTIFICATION_PREFS = {
  notifyOperations: true,
  notifySales: true,
  notifyManagement: false,
  notificationChannels: ['teams'],
  isUrgent: false,
};

/**
 * Enhanced trip list component with real-time updates and virtualization
 */
const TripList: React.FC<TripListProps> = ({
  onTripSelect,
  className,
  filters = {},
  pageSize = 20,
  onError
}) => {
  // Hooks
  const { theme, isDarkMode } = useTheme();
  const [selectedStatus, setSelectedStatus] = useState<TripStatus[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Trip data hook with WebSocket support
  const {
    trips,
    loading,
    error,
    socketState,
    refreshTrips,
    updateTripStatus
  } = useTripData(filters, DEFAULT_NOTIFICATION_PREFS);

  // Virtual list configuration
  const parentRef = React.useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: trips.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  // Memoized filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      if (selectedStatus.length && !selectedStatus.includes(trip.status)) {
        return false;
      }
      return true;
    });
  }, [trips, selectedStatus]);

  // Error handling
  useEffect(() => {
    if (error) {
      setErrorMessage(error.message);
      onError?.(error);
    }
  }, [error, onError]);

  // WebSocket status monitoring
  useEffect(() => {
    if (socketState === WebSocketStatus.DISCONNECTED) {
      setErrorMessage('Real-time updates disconnected. Attempting to reconnect...');
    } else if (socketState === WebSocketStatus.CONNECTED) {
      setErrorMessage(null);
    }
  }, [socketState]);

  // Event handlers
  const handleTripSelect = useCallback((tripId: string) => {
    try {
      onTripSelect(tripId);
    } catch (error) {
      setErrorMessage('Failed to select trip. Please try again.');
      console.error('Trip selection error:', error);
    }
  }, [onTripSelect]);

  const handleStatusFilter = useCallback((event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedStatus(event.target.value as TripStatus[]);
  }, []);

  const handleErrorClose = useCallback(() => {
    setErrorMessage(null);
  }, []);

  // Render loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <LoadingSpinner size={48} />
      </Box>
    );
  }

  return (
    <Box className={className} height="100%">
      <FilterContainer>
        <FormControl fullWidth variant="outlined" size="small">
          <InputLabel id="status-filter-label">Filter by Status</InputLabel>
          <Select
            labelId="status-filter-label"
            id="status-filter"
            multiple
            value={selectedStatus}
            onChange={handleStatusFilter}
            label="Filter by Status"
            renderValue={(selected) => (selected as TripStatus[]).join(', ')}
          >
            {Object.values(TripStatus).map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </FilterContainer>

      <ListContainer ref={parentRef}>
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const trip = filteredTrips[virtualRow.index];
            return (
              <div
                key={trip.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <TripCard
                  trip={trip}
                  onClick={handleTripSelect}
                  isLoading={loading}
                />
              </div>
            );
          })}
        </div>
      </ListContainer>

      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={handleErrorClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleErrorClose}
          severity="error"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default React.memo(TripList);