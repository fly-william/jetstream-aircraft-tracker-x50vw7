/**
 * StatusUpdateForm Component
 * @version 1.0.0
 * @description React component for updating trip status with Teams integration and real-time notifications
 */

import React, { useState, useCallback } from 'react'; // version: 18.2.0
import {
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  FormControl,
  FormLabel,
  CircularProgress,
  Alert
} from '@mui/material'; // version: 5.x

// Internal imports
import { TripStatus, TripStatusUpdate } from '../../types/trip.types';
import { tripApi } from '../../services/api/trip.api';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { NotificationType, NotificationPriority, NotificationTarget } from '../../types/notification.types';

interface StatusUpdateFormProps {
  tripId: string;
  currentStatus: TripStatus;
  onUpdateComplete: (status: TripStatus) => void;
  isReadOnly?: boolean;
  defaultNotifications?: {
    operations: boolean;
    sales: boolean;
    management: boolean;
  };
}

const StatusUpdateForm: React.FC<StatusUpdateFormProps> = ({
  tripId,
  currentStatus,
  onUpdateComplete,
  isReadOnly = false,
  defaultNotifications = { operations: true, sales: true, management: false }
}) => {
  // Form state
  const [selectedStatus, setSelectedStatus] = useState<TripStatus>(currentStatus);
  const [notes, setNotes] = useState<string>('');
  const [notifyOperations, setNotifyOperations] = useState(defaultNotifications.operations);
  const [notifySales, setNotifySales] = useState(defaultNotifications.sales);
  const [notifyManagement, setNotifyManagement] = useState(defaultNotifications.management);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Context hooks
  const { addNotification } = useNotificationContext();

  /**
   * Validates status transition based on business rules
   */
  const isValidTransition = useCallback((from: TripStatus, to: TripStatus): boolean => {
    const validTransitions: Record<TripStatus, TripStatus[]> = {
      [TripStatus.SCHEDULED]: [TripStatus.IN_POSITION, TripStatus.CANCELLED],
      [TripStatus.IN_POSITION]: [TripStatus.BOARDING, TripStatus.CANCELLED],
      [TripStatus.BOARDING]: [TripStatus.DEPARTED, TripStatus.CANCELLED],
      [TripStatus.DEPARTED]: [TripStatus.ENROUTE],
      [TripStatus.ENROUTE]: [TripStatus.ARRIVED],
      [TripStatus.ARRIVED]: [TripStatus.COMPLETED],
      [TripStatus.COMPLETED]: [],
      [TripStatus.CANCELLED]: []
    };

    return validTransitions[from]?.includes(to) || false;
  }, []);

  /**
   * Handles status selection with validation
   */
  const handleStatusChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newStatus = event.target.value as TripStatus;
    if (!isValidTransition(currentStatus, newStatus)) {
      setError(`Invalid status transition from ${currentStatus} to ${newStatus}`);
      return;
    }
    setSelectedStatus(newStatus);
    setError(null);
  }, [currentStatus, isValidTransition]);

  /**
   * Handles form submission with retry mechanism
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isReadOnly) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const statusUpdate: TripStatusUpdate = {
        tripId,
        newStatus: selectedStatus,
        notes,
        notifyOperations,
        notifySales,
        notifyManagement,
        updateReason: notes,
        statusMetadata: {
          updatedAt: new Date().toISOString(),
          previousStatus: currentStatus
        },
        isUrgent: selectedStatus === TripStatus.CANCELLED,
        notificationChannels: ['TEAMS', 'EMAIL']
      };

      // Optimistic UI update
      onUpdateComplete(selectedStatus);

      // Update trip status with Teams notifications
      await tripApi.updateTripStatus(tripId, statusUpdate, {
        notifyOperations,
        notifySales,
        notifyManagement,
        notificationChannels: ['TEAMS'],
        isUrgent: selectedStatus === TripStatus.CANCELLED
      });

      // Add success notification
      addNotification({
        id: crypto.randomUUID(),
        type: NotificationType.TRIP_STATUS,
        priority: NotificationPriority.HIGH,
        target: NotificationTarget.OPERATIONS,
        title: 'Trip Status Updated',
        message: `Trip ${tripId} status updated to ${selectedStatus}`,
        timestamp: new Date().toISOString(),
        read: false,
        acknowledged: false,
        sourceId: tripId,
        sourceType: 'TRIP',
        tags: ['status-update', selectedStatus.toLowerCase()],
        metadata: statusUpdate
      });

      setNotes('');
      setRetryCount(0);

    } catch (error) {
      console.error('Failed to update trip status:', error);
      setError('Failed to update status. Retrying...');

      // Implement retry mechanism
      if (retryCount < 3) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => handleSubmit(e), 1000 * Math.pow(2, retryCount));
      } else {
        setError('Failed to update status after multiple attempts');
        // Revert optimistic update
        onUpdateComplete(currentStatus);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    tripId,
    selectedStatus,
    currentStatus,
    notes,
    notifyOperations,
    notifySales,
    notifyManagement,
    isSubmitting,
    isReadOnly,
    retryCount,
    onUpdateComplete,
    addNotification
  ]);

  return (
    <form onSubmit={handleSubmit} className="status-update-form">
      {error && (
        <Alert severity="error" className="status-error">
          {error}
        </Alert>
      )}

      <FormControl component="fieldset" disabled={isSubmitting || isReadOnly}>
        <FormLabel component="legend">Update Trip Status</FormLabel>
        <RadioGroup
          value={selectedStatus}
          onChange={handleStatusChange}
          className="status-options"
        >
          {Object.values(TripStatus).map((status) => (
            <FormControlLabel
              key={status}
              value={status}
              control={<Radio />}
              label={status.replace('_', ' ')}
              disabled={!isValidTransition(currentStatus, status)}
            />
          ))}
        </RadioGroup>
      </FormControl>

      <TextField
        fullWidth
        multiline
        rows={3}
        label="Status Update Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        disabled={isSubmitting || isReadOnly}
        required
        margin="normal"
      />

      <FormControl component="fieldset" className="notification-preferences">
        <FormLabel component="legend">Notify Teams</FormLabel>
        <FormControlLabel
          control={
            <Checkbox
              checked={notifyOperations}
              onChange={(e) => setNotifyOperations(e.target.checked)}
              disabled={isSubmitting || isReadOnly}
            />
          }
          label="Operations Team"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={notifySales}
              onChange={(e) => setNotifySales(e.target.checked)}
              disabled={isSubmitting || isReadOnly}
            />
          }
          label="Sales Team"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={notifyManagement}
              onChange={(e) => setNotifyManagement(e.target.checked)}
              disabled={isSubmitting || isReadOnly}
            />
          }
          label="Management"
        />
      </FormControl>

      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={isSubmitting || isReadOnly || !notes.trim()}
        className="submit-button"
      >
        {isSubmitting ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          'Update Status'
        )}
      </Button>
    </form>
  );
};

export default StatusUpdateForm;