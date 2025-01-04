/**
 * @fileoverview A responsive trip card component displaying key trip information
 * @version 1.0.0
 */

import React, { memo, useCallback } from 'react'; // version: 18.2.0
import { Card, CardContent, Typography, Box, Skeleton } from '@mui/material'; // version: 5.x
import { format } from 'date-fns'; // version: 2.x
import { styled } from '@mui/material/styles'; // version: 5.x

import { Trip, TripStatus } from '../../types/trip.types';
import StatusBadge from '../common/StatusBadge';
import { useTheme } from '../../hooks/useTheme';

/**
 * Props interface for TripCard component
 */
interface TripCardProps {
  /** Trip data object */
  trip: Trip;
  /** Click handler for card selection */
  onClick: (tripId: string) => void;
  /** Optional CSS class name */
  className?: string;
  /** Loading state indicator */
  isLoading?: boolean;
  /** Error state */
  error?: Error;
}

/**
 * Styled Card component with theme-aware styles and transitions
 */
const StyledCard = styled(Card)(({ theme }) => ({
  cursor: 'pointer',
  transition: theme.transitions.create(['box-shadow', 'transform'], {
    duration: theme.transitions.duration.standard,
  }),
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
  [theme.breakpoints.down('sm')]: {
    margin: theme.spacing(1, 0),
  },
  [theme.breakpoints.up('sm')]: {
    margin: theme.spacing(1),
  },
}));

/**
 * Styled content container with responsive layout
 */
const ContentContainer = styled(CardContent)(({ theme }) => ({
  padding: theme.spacing(2),
  '&:last-child': {
    paddingBottom: theme.spacing(2),
  },
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  [theme.breakpoints.up('sm')]: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
}));

/**
 * Formats trip time with timezone
 * @param timeString - ISO date string
 * @returns Formatted time string
 */
const formatTripTime = (timeString: string): string => {
  try {
    return format(new Date(timeString), 'HH:mm zzz');
  } catch (error) {
    console.error('Error formatting time:', error);
    return '--:-- ---';
  }
};

/**
 * Trip card component displaying trip information with theme support
 */
const TripCard: React.FC<TripCardProps> = memo(({
  trip,
  onClick,
  className,
  isLoading = false,
  error
}) => {
  const { theme, isDarkMode } = useTheme();

  const handleClick = useCallback(() => {
    onClick(trip.id);
  }, [onClick, trip.id]);

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(trip.id);
    }
  }, [onClick, trip.id]);

  if (error) {
    return (
      <StyledCard
        className={className}
        role="alert"
        aria-label="Error loading trip information"
      >
        <ContentContainer>
          <Typography color="error">
            Error loading trip information: {error.message}
          </Typography>
        </ContentContainer>
      </StyledCard>
    );
  }

  if (isLoading) {
    return (
      <StyledCard className={className}>
        <ContentContainer>
          <Box sx={{ width: '100%' }}>
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width="40%" height={20} />
            <Skeleton variant="rectangular" width={80} height={32} />
          </Box>
        </ContentContainer>
      </StyledCard>
    );
  }

  return (
    <StyledCard
      className={className}
      onClick={handleClick}
      onKeyPress={handleKeyPress}
      tabIndex={0}
      role="button"
      aria-label={`Trip ${trip.aircraftId} - ${TripStatus[trip.status]}`}
    >
      <ContentContainer>
        <Box>
          <Typography
            variant="h6"
            component="h3"
            color="textPrimary"
            gutterBottom
          >
            {trip.aircraftId}
          </Typography>
          <Typography
            variant="body2"
            color="textSecondary"
            sx={{ mb: 1 }}
          >
            {formatTripTime(trip.startTime)} - {formatTripTime(trip.endTime)}
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing(1),
            [theme.breakpoints.down('sm')]: {
              marginTop: theme.spacing(1),
            },
          }}
        >
          <StatusBadge
            status={trip.status}
            size="medium"
          />
        </Box>
      </ContentContainer>
    </StyledCard>
  );
});

TripCard.displayName = 'TripCard';

export default TripCard;