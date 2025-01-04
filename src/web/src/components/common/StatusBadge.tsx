/**
 * @fileoverview A reusable Material-UI based status badge component with semantic colors
 * @version 1.0.0
 */

import React from 'react'; // version: 18.2.x
import { Chip } from '@mui/material'; // version: 5.x
import { styled } from '@mui/material/styles'; // version: 5.x
import { TripStatus } from '../../types/trip.types';

/**
 * Props interface for StatusBadge component
 */
interface StatusBadgeProps {
  /** Status value to display with semantic meaning */
  status: TripStatus | string;
  /** Size variant of the badge */
  size?: 'small' | 'medium';
  /** Optional CSS class name for custom styling */
  className?: string;
}

/**
 * Enhanced styled Material-UI Chip component with status-based styling
 */
const StyledChip = styled(Chip)<{ size?: 'small' | 'medium'; statusColors: ReturnType<typeof getStatusColor> }>(
  ({ theme, size, statusColors }) => ({
    height: size === 'small' ? '24px' : '32px',
    borderRadius: '16px',
    fontWeight: 600,
    textTransform: 'uppercase',
    fontSize: size === 'small' ? '0.75rem' : '0.875rem',
    transition: 'all 0.2s ease-in-out',
    letterSpacing: '0.5px',
    minWidth: size === 'small' ? '60px' : '80px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    backgroundColor: statusColors.background,
    color: statusColors.color,
    border: `1px solid ${statusColors.borderColor}`,
    '&:hover': {
      backgroundColor: statusColors.background,
      opacity: 0.9,
    },
  })
);

/**
 * Determines semantic color scheme based on status value
 */
const getStatusColor = (status: TripStatus | string) => {
  switch (status) {
    case TripStatus.SCHEDULED:
      return {
        background: '#E3F2FD',
        color: '#1565C0',
        borderColor: '#90CAF9'
      };
    case TripStatus.IN_POSITION:
      return {
        background: '#E8F5E9',
        color: '#2E7D32',
        borderColor: '#A5D6A7'
      };
    case TripStatus.BOARDING:
      return {
        background: '#FFF3E0',
        color: '#E65100',
        borderColor: '#FFB74D'
      };
    case TripStatus.DEPARTED:
      return {
        background: '#F3E5F5',
        color: '#7B1FA2',
        borderColor: '#CE93D8'
      };
    case TripStatus.ENROUTE:
      return {
        background: '#E8EAF6',
        color: '#283593',
        borderColor: '#9FA8DA'
      };
    case TripStatus.ARRIVED:
      return {
        background: '#E0F7FA',
        color: '#00838F',
        borderColor: '#80DEEA'
      };
    case TripStatus.COMPLETED:
      return {
        background: '#E8F5E9',
        color: '#1B5E20',
        borderColor: '#81C784'
      };
    case TripStatus.CANCELLED:
      return {
        background: '#FFEBEE',
        color: '#C62828',
        borderColor: '#EF9A9A'
      };
    default:
      return {
        background: '#F5F5F5',
        color: '#616161',
        borderColor: '#E0E0E0'
      };
  }
};

/**
 * Enhanced status indicator component with semantic colors and accessibility features
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'medium',
  className
}) => {
  const statusColors = getStatusColor(status);

  return (
    <StyledChip
      label={status}
      size={size}
      className={className}
      statusColors={statusColors}
      role="status"
      aria-label={`Status: ${status}`}
    />
  );
};

export default StatusBadge;