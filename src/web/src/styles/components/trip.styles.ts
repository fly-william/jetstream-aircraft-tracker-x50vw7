import { styled } from '@mui/material/styles';
import { Card, CardContent, Box, Grid, Paper } from '@mui/material';
import { aviationTheme } from '../theme/aviation.theme';

// Enhanced card component for trip display with interactive states and elevation
export const StyledTripCard = styled(Card)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius * 1.5,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  cursor: 'pointer',
  boxShadow: theme.shadows[1],
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: theme.palette.background.paper,
  
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[3]
  },

  [theme.breakpoints.down('sm')]: {
    margin: theme.spacing(1),
    padding: theme.spacing(1)
  },

  [theme.breakpoints.up('sm')]: {
    margin: theme.spacing(2),
    padding: theme.spacing(2)
  },

  [theme.breakpoints.up('md')]: {
    margin: theme.spacing(2, 3),
    padding: theme.spacing(3)
  }
}));

// Responsive grid layout for trip information
export const TripInfoGrid = styled(Grid)(({ theme }) => ({
  display: 'grid',
  width: '100%',
  maxWidth: 1200,
  margin: '0 auto',
  alignItems: 'start',

  [theme.breakpoints.down('sm')]: {
    gridTemplateColumns: '1fr',
    gap: theme.spacing(1),
    padding: theme.spacing(1, 0)
  },

  [theme.breakpoints.up('sm')]: {
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: theme.spacing(2),
    padding: theme.spacing(2, 0)
  },

  [theme.breakpoints.up('md')]: {
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: theme.spacing(3),
    padding: theme.spacing(2, 0)
  }
}));

// Container for milestone timeline with enhanced visual hierarchy
export const TimelineContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(3),
  padding: theme.spacing(2, 3),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
  position: 'relative',
  overflow: 'hidden',
  transition: 'box-shadow 0.3s ease',

  '&:hover': {
    boxShadow: theme.shadows[2]
  },

  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1, 2),
    marginTop: theme.spacing(2)
  }
}));

// Section for displaying trip status with clear visual indicators
export const StatusSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  position: 'relative',

  '&.success': {
    borderLeft: `4px solid ${theme.palette.success.main}`,
    backgroundColor: `${theme.palette.success.light}10`
  },

  '&.warning': {
    borderLeft: `4px solid ${theme.palette.warning.main}`,
    backgroundColor: `${theme.palette.warning.light}10`
  },

  '&.error': {
    borderLeft: `4px solid ${theme.palette.error.main}`,
    backgroundColor: `${theme.palette.error.light}10`
  },

  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1.5)
  }
}));

// Section for service request management with proper spacing and elevation
export const ServiceRequestSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius * 1.5,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[1],
  position: 'relative',

  '&:before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`
  },

  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius
  }
}));

// Content wrapper for trip details with responsive padding
export const TripContentWrapper = styled(CardContent)(({ theme }) => ({
  padding: theme.spacing(3),
  '&:last-child': {
    paddingBottom: theme.spacing(3)
  },

  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
    '&:last-child': {
      paddingBottom: theme.spacing(2)
    }
  }
}));

// Container for action buttons with proper spacing
export const ActionButtonContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  marginTop: theme.spacing(3),
  justifyContent: 'flex-end',

  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    gap: theme.spacing(1),
    marginTop: theme.spacing(2)
  }
}));