/**
 * @fileoverview Enhanced trip details component with real-time updates and Teams integration
 * @version 1.0.0
 */

// React core - v18.2.0
import React, { useState, useEffect, useCallback, useRef } from 'react';

// Material UI components - v5.x
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';

// Date formatting - v2.x
import { format, formatDistance } from 'date-fns';

// Microsoft Teams SDK - v2.x
import * as microsoftTeams from '@microsoft/teams-js';

// Internal imports
import {
  Trip,
  Milestone,
  ServiceRequest,
  TripStatus,
  MilestoneType,
  ServiceRequestType,
  TripStatusUpdate
} from '../../types/trip.types';
import { useWebSocket } from '../../hooks/useWebSocket';
import { websocketConfig } from '../../config/websocket.config';

/**
 * Props interface for TripDetails component
 */
interface TripDetailsProps {
  tripId: UUID;
  onClose: () => void;
  enableRealTime?: boolean;
  enableTeamsNotifications?: boolean;
}

/**
 * Enhanced trip details component with real-time capabilities
 */
const TripDetails: React.FC<TripDetailsProps> = ({
  tripId,
  onClose,
  enableRealTime = true,
  enableTeamsNotifications = true
}) => {
  // State management
  const [tripData, setTripData] = useState<Trip | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [showStatusUpdate, setShowStatusUpdate] = useState<boolean>(false);
  const [showServiceRequest, setShowServiceRequest] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // WebSocket integration
  const {
    socket,
    isConnected,
    connect,
    disconnect,
    error: wsError,
    stats: wsStats
  } = useWebSocket();

  // Refs for cleanup and optimization
  const wsSubscribed = useRef<boolean>(false);

  /**
   * Fetches initial trip data
   */
  const fetchTripData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/trips/${tripId}`);
      if (!response.ok) throw new Error('Failed to fetch trip data');
      const data = await response.json();
      setTripData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trip details');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  /**
   * Handles WebSocket message processing
   */
  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    const message = JSON.parse(event.data);
    
    switch (message.type) {
      case 'TRIP_UPDATE':
        setTripData(prevData => ({
          ...prevData!,
          ...message.data
        }));
        break;
      case 'STATUS_UPDATE':
        setTripData(prevData => ({
          ...prevData!,
          status: message.data.status,
          updatedAt: new Date()
        }));
        break;
      case 'MILESTONE_ADDED':
        setTripData(prevData => ({
          ...prevData!,
          milestones: [...prevData!.milestones, message.data]
        }));
        break;
      case 'SERVICE_REQUEST_UPDATE':
        setTripData(prevData => ({
          ...prevData!,
          serviceRequests: prevData!.serviceRequests.map(req =>
            req.id === message.data.id ? message.data : req
          )
        }));
        break;
    }
  }, []);

  /**
   * Initializes Teams integration
   */
  const initializeTeams = useCallback(async () => {
    if (!enableTeamsNotifications) return;

    try {
      await microsoftTeams.app.initialize();
    } catch (err) {
      console.error('Teams initialization failed:', err);
    }
  }, [enableTeamsNotifications]);

  /**
   * Sends notification to Teams
   */
  const sendTeamsNotification = useCallback(async (notification: {
    title: string;
    message: string;
    importance: 'normal' | 'high' | 'urgent';
  }) => {
    if (!enableTeamsNotifications) return;

    try {
      await microsoftTeams.app.sendMessage({
        message: notification.message,
        importance: notification.importance
      });
    } catch (err) {
      console.error('Failed to send Teams notification:', err);
    }
  }, [enableTeamsNotifications]);

  /**
   * Handles trip status updates
   */
  const handleStatusUpdate = useCallback(async (update: TripStatusUpdate) => {
    try {
      const response = await fetch(`/api/v1/trips/${tripId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(update)
      });

      if (!response.ok) throw new Error('Failed to update trip status');

      // Optimistic update
      setTripData(prevData => ({
        ...prevData!,
        status: update.newStatus,
        updatedAt: new Date()
      }));

      // Send Teams notification if enabled
      if (enableTeamsNotifications) {
        await sendTeamsNotification({
          title: 'Trip Status Update',
          message: `Trip ${tripId} status updated to ${update.newStatus}`,
          importance: update.isUrgent ? 'urgent' : 'normal'
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  }, [tripId, enableTeamsNotifications, sendTeamsNotification]);

  /**
   * Initializes real-time connection
   */
  useEffect(() => {
    if (enableRealTime && !wsSubscribed.current) {
      connect().then(() => {
        if (socket) {
          socket.emit('subscribe', `trip:${tripId}`);
          wsSubscribed.current = true;
        }
      });
    }

    return () => {
      if (wsSubscribed.current) {
        socket?.emit('unsubscribe', `trip:${tripId}`);
        disconnect();
        wsSubscribed.current = false;
      }
    };
  }, [enableRealTime, tripId, socket, connect, disconnect]);

  /**
   * Initializes Teams integration on mount
   */
  useEffect(() => {
    initializeTeams();
  }, [initializeTeams]);

  /**
   * Fetches initial trip data on mount
   */
  useEffect(() => {
    fetchTripData();
  }, [fetchTripData]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" onClose={onClose}>
        {error}
      </Alert>
    );
  }

  if (!tripData) {
    return (
      <Alert severity="warning" onClose={onClose}>
        No trip data available
      </Alert>
    );
  }

  return (
    <Paper elevation={3}>
      <Box p={3}>
        {/* Header Section */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">
            Trip Details - {tripData.metadata.flightNumber}
          </Typography>
          {enableRealTime && (
            <Alert severity={isConnected ? "success" : "warning"} sx={{ ml: 2 }}>
              {isConnected ? "Real-time updates active" : "Connecting..."}
            </Alert>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Status Section */}
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Current Status: {tripData.status}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Last updated: {format(new Date(tripData.updatedAt), 'PPpp')}
          </Typography>
        </Box>

        {/* Tabs Navigation */}
        <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)}>
          <Tab label="Timeline" />
          <Tab label="Service Requests" />
          <Tab label="Details" />
        </Tabs>

        {/* Tab Panels */}
        <Box py={2}>
          {selectedTab === 0 && (
            <Box>
              {tripData.milestones.map((milestone: Milestone) => (
                <Box key={milestone.id} mb={2}>
                  <Typography variant="subtitle1">
                    {MilestoneType[milestone.type]}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {formatDistance(new Date(milestone.timestamp), new Date(), { addSuffix: true })}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {selectedTab === 1 && (
            <Box>
              {tripData.serviceRequests.map((request: ServiceRequest) => (
                <Box key={request.id} mb={2}>
                  <Typography variant="subtitle1">
                    {ServiceRequestType[request.type]} - {request.status}
                  </Typography>
                  <Typography variant="body2">
                    Vendor: {request.vendorName}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Scheduled: {format(new Date(request.scheduledTime), 'PPp')}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {selectedTab === 2 && (
            <Box>
              <Typography variant="body1" gutterBottom>
                Aircraft: {tripData.metadata.aircraftRegistration}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Route: {tripData.metadata.origin} → {tripData.metadata.destination}
              </Typography>
              <Typography variant="body1">
                Duration: {formatDistance(
                  new Date(tripData.startTime),
                  new Date(tripData.endTime)
                )}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Action Buttons */}
        <Box display="flex" justifyContent="flex-end" mt={2}>
          <Button
            variant="outlined"
            onClick={() => setShowStatusUpdate(true)}
            sx={{ mr: 1 }}
          >
            Update Status
          </Button>
          <Button
            variant="outlined"
            onClick={() => setShowServiceRequest(true)}
            sx={{ mr: 1 }}
          >
            Add Service
          </Button>
          <Button variant="contained" onClick={onClose}>
            Close
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default TripDetails;