/**
 * Trip Management API Service
 * @version 1.0.0
 * @description Implements API client functions for trip management operations with real-time updates
 */

// External imports
import retry from 'axios-retry'; // version: ^3.5.0
import WebSocket from 'ws'; // version: ^8.0.0
import * as microsoftTeams from '@microsoft/teams-js'; // version: ^2.0.0

// Internal imports
import { apiClient } from '../../utils/api.utils';
import { endpoints } from '../../config/api.config';
import { HTTP_STATUS, ERROR_CODES } from '../../constants/api.constants';
import {
  ApiResponse,
  PaginatedResponse,
  WebSocketMessage,
  TripStatusUpdate
} from '../../types/api.types';
import {
  Trip,
  TripStatus,
  ServiceRequest,
  Milestone
} from '../../types/trip.types';

/**
 * Interface for trip filter parameters
 */
interface TripFilter {
  status?: TripStatus[];
  startDate?: Date;
  endDate?: Date;
  aircraftId?: string;
  isActive?: boolean;
}

/**
 * Interface for pagination options
 */
interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Interface for notification preferences
 */
interface NotificationPreferences {
  notifyOperations: boolean;
  notifySales: boolean;
  notifyManagement: boolean;
  notificationChannels: string[];
  isUrgent: boolean;
}

/**
 * WebSocket connection manager for real-time updates
 */
class TripWebSocketManager {
  private static instance: TripWebSocketManager;
  private ws: WebSocket | null = null;
  private subscribers: Map<string, (data: any) => void> = new Map();

  private constructor() {
    this.initializeWebSocket();
  }

  static getInstance(): TripWebSocketManager {
    if (!TripWebSocketManager.instance) {
      TripWebSocketManager.instance = new TripWebSocketManager();
    }
    return TripWebSocketManager.instance;
  }

  private initializeWebSocket(): void {
    const wsUrl = process.env.REACT_APP_WS_URL || 'wss://api.jetstream.flyusa.com/ws';
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event: WebSocket.MessageEvent) => {
      const message: WebSocketMessage = JSON.parse(event.data.toString());
      this.notifySubscribers(message);
    };

    this.ws.onclose = () => {
      setTimeout(() => this.initializeWebSocket(), 5000);
    };
  }

  private notifySubscribers(message: WebSocketMessage): void {
    this.subscribers.forEach(callback => callback(message));
  }

  subscribe(id: string, callback: (data: any) => void): void {
    this.subscribers.set(id, callback);
  }

  unsubscribe(id: string): void {
    this.subscribers.delete(id);
  }
}

/**
 * Trip API service implementation
 */
class TripApiService {
  private wsManager: TripWebSocketManager;

  constructor() {
    this.wsManager = TripWebSocketManager.getInstance();
    retry(apiClient, { retries: 3 });
  }

  /**
   * Retrieves a paginated list of trips with real-time updates
   */
  async getTrips(
    filterParams: TripFilter,
    paginationOptions: PaginationOptions
  ): Promise<ApiResponse<PaginatedResponse<Trip>>> {
    try {
      const queryParams = new URLSearchParams({
        ...filterParams,
        page: paginationOptions.page.toString(),
        pageSize: paginationOptions.pageSize.toString(),
        sortBy: paginationOptions.sortBy || 'startTime',
        sortOrder: paginationOptions.sortOrder || 'desc'
      });

      const response = await apiClient.get<PaginatedResponse<Trip>>(
        `${endpoints.trips.list}?${queryParams.toString()}`
      );

      // Set up real-time updates subscription
      this.wsManager.subscribe('trips-list', (message: WebSocketMessage) => {
        if (message.type === 'TRIP_UPDATE') {
          // Handle real-time trip updates
          this.handleTripUpdate(message.payload);
        }
      });

      return response;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Updates trip status with Teams notifications
   */
  async updateTripStatus(
    tripId: string,
    statusUpdate: TripStatusUpdate,
    notifyPrefs: NotificationPreferences
  ): Promise<ApiResponse<Trip>> {
    try {
      const response = await apiClient.patch<Trip>(
        endpoints.trips.status.replace(':id', tripId),
        statusUpdate
      );

      if (response.status === HTTP_STATUS.OK) {
        await this.sendTeamsNotifications(response.data, notifyPrefs);
      }

      return response;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Creates or updates service requests for a trip
   */
  async manageServiceRequests(
    tripId: string,
    serviceRequests: ServiceRequest[]
  ): Promise<ApiResponse<ServiceRequest[]>> {
    try {
      const response = await apiClient.post<ServiceRequest[]>(
        endpoints.trips.services.replace(':id', tripId),
        serviceRequests
      );

      return response;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Records trip milestones with audit trail
   */
  async recordMilestone(
    tripId: string,
    milestone: Milestone
  ): Promise<ApiResponse<Milestone>> {
    try {
      const response = await apiClient.post<Milestone>(
        endpoints.trips.milestones.replace(':id', tripId),
        milestone
      );

      return response;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Sends notifications to Microsoft Teams channels
   */
  private async sendTeamsNotifications(
    trip: Trip,
    preferences: NotificationPreferences
  ): Promise<void> {
    if (!microsoftTeams.app.isInitialized()) {
      await microsoftTeams.app.initialize();
    }

    const notification = this.formatTeamsNotification(trip, preferences);

    if (preferences.notifyOperations) {
      await this.sendTeamsMessage('operations', notification);
    }
    if (preferences.notifySales) {
      await this.sendTeamsMessage('sales', notification);
    }
    if (preferences.notifyManagement) {
      await this.sendTeamsMessage('management', notification);
    }
  }

  /**
   * Formats notification message for Teams
   */
  private formatTeamsNotification(
    trip: Trip,
    preferences: NotificationPreferences
  ): any {
    return {
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.2',
          body: [
            {
              type: 'TextBlock',
              text: `Trip Status Update: ${trip.status}`,
              weight: 'bolder',
              size: 'large'
            },
            {
              type: 'FactSet',
              facts: [
                { title: 'Trip ID:', value: trip.id },
                { title: 'Aircraft:', value: trip.aircraftId },
                { title: 'Status:', value: trip.status },
                { title: 'Updated:', value: new Date().toISOString() }
              ]
            }
          ]
        }
      }]
    };
  }

  /**
   * Sends message to specific Teams channel
   */
  private async sendTeamsMessage(channel: string, message: any): Promise<void> {
    try {
      await microsoftTeams.tasks.submitTask(message, channel);
    } catch (error) {
      console.error(`Failed to send Teams notification to ${channel}:`, error);
    }
  }

  /**
   * Handles real-time trip updates
   */
  private handleTripUpdate(update: any): void {
    // Implement update handling logic
    console.log('Received trip update:', update);
  }

  /**
   * Standardizes API error handling
   */
  private handleApiError(error: any): Error {
    if (error.response) {
      return new Error(error.response.data.message || 'API request failed');
    }
    return new Error('Network error occurred');
  }
}

// Export singleton instance
export const tripApi = new TripApiService();