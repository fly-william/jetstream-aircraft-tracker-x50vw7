/**
 * @fileoverview Enhanced WebSocket service for real-time aircraft tracking
 * @version 1.0.0
 */

// External imports
import { Socket } from 'socket.io-client'; // v4.7.2
import { Logger } from '@microsoft/applicationinsights-web'; // v2.8.3

// Internal imports
import { websocketConfig } from '../../config/websocket.config';
import { Aircraft, AircraftPosition, AircraftStatus } from '../../types/aircraft.types';
import { useWebSocket } from '../../hooks/useWebSocket';

/**
 * Tracking configuration options
 */
interface TrackingOptions {
  updateInterval?: number;
  enableTelemetry?: boolean;
  retryAttempts?: number;
}

/**
 * Enhanced type definitions for aircraft WebSocket event handlers
 */
export interface AircraftSocketEvents {
  onPositionUpdate: (position: AircraftPosition, timestamp: number) => void;
  onStatusChange: (aircraft: Aircraft, previousStatus: AircraftStatus) => void;
  onTrackingStart: (aircraftId: string, status: AircraftStatus) => void;
  onTrackingStop: (aircraftId: string, reason: string) => void;
  onError: (error: Error, context: string) => void;
  onReconnect: (attemptNumber: number) => void;
}

/**
 * Retry configuration for failed operations
 */
interface RetryConfig {
  attempts: number;
  delay: number;
  backoff: number;
  timeout: number;
}

/**
 * Enhanced WebSocket manager for aircraft tracking with reliability features
 */
export class AircraftSocket {
  private socket: Socket | null;
  private eventHandlers: AircraftSocketEvents;
  private retryConfigs: Map<string, RetryConfig>;
  private logger: Logger;
  private activeTracking: Set<string>;
  private connectionTimeout: number;
  private reconnectTimer: NodeJS.Timeout | null;

  /**
   * Initializes the aircraft socket service with monitoring
   */
  constructor(socket: Socket, eventHandlers: AircraftSocketEvents, logger: Logger) {
    if (!socket) {
      throw new Error('Socket instance is required');
    }

    this.socket = socket;
    this.eventHandlers = eventHandlers;
    this.logger = logger;
    this.retryConfigs = new Map();
    this.activeTracking = new Set();
    this.connectionTimeout = websocketConfig.options.timeout;
    this.reconnectTimer = null;
  }

  /**
   * Enhanced WebSocket event listener setup with error handling
   */
  public async initialize(): Promise<void> {
    try {
      if (!this.socket) {
        throw new Error('Socket not initialized');
      }

      // Set up position update handler
      this.socket.on(websocketConfig.channels.aircraft.position, 
        (position: AircraftPosition, timestamp: number) => {
          try {
            this.validatePosition(position);
            this.eventHandlers.onPositionUpdate(position, timestamp);
          } catch (error) {
            this.handleError(error as Error, 'position_update');
          }
      });

      // Set up status change handler
      this.socket.on(websocketConfig.channels.aircraft.status, 
        (aircraft: Aircraft, previousStatus: AircraftStatus) => {
          try {
            this.eventHandlers.onStatusChange(aircraft, previousStatus);
            this.logger.trackEvent({ name: 'AircraftStatusChange', properties: {
              aircraftId: aircraft.id,
              newStatus: aircraft.status,
              previousStatus
            }});
          } catch (error) {
            this.handleError(error as Error, 'status_change');
          }
      });

      // Set up error handling
      this.socket.on('error', (error: Error) => {
        this.handleError(error, 'socket_error');
      });

      // Set up reconnection handling
      this.socket.on('reconnect', (attemptNumber: number) => {
        this.handleReconnect(attemptNumber);
      });

      this.logger.trackEvent({ name: 'AircraftSocketInitialized' });
    } catch (error) {
      this.handleError(error as Error, 'initialization');
      throw error;
    }
  }

  /**
   * Enhanced aircraft tracking initiation with validation
   */
  public async startTracking(
    aircraftId: string, 
    options: TrackingOptions = {}
  ): Promise<boolean> {
    try {
      if (!this.socket?.connected) {
        throw new Error('Socket not connected');
      }

      if (this.activeTracking.has(aircraftId)) {
        this.logger.trackTrace({ message: `Already tracking aircraft: ${aircraftId}` });
        return false;
      }

      const retryConfig: RetryConfig = {
        attempts: options.retryAttempts || websocketConfig.options.reconnectionAttempts,
        delay: websocketConfig.options.reconnectionDelay,
        backoff: 1.5,
        timeout: options.updateInterval || 5000
      };

      this.retryConfigs.set(aircraftId, retryConfig);
      this.activeTracking.add(aircraftId);

      this.socket.emit(websocketConfig.channels.aircraft.tracking, {
        aircraftId,
        options: {
          updateInterval: options.updateInterval,
          enableTelemetry: options.enableTelemetry
        }
      });

      this.logger.trackEvent({ 
        name: 'AircraftTrackingStarted',
        properties: { aircraftId, ...options }
      });

      return true;
    } catch (error) {
      this.handleError(error as Error, 'start_tracking');
      return false;
    }
  }

  /**
   * Enhanced tracking termination with cleanup
   */
  public async stopTracking(aircraftId: string, reason: string): Promise<void> {
    try {
      if (!this.activeTracking.has(aircraftId)) {
        return;
      }

      this.socket?.emit(websocketConfig.channels.aircraft.tracking, {
        aircraftId,
        action: 'stop',
        reason
      });

      this.activeTracking.delete(aircraftId);
      this.retryConfigs.delete(aircraftId);
      this.eventHandlers.onTrackingStop(aircraftId, reason);

      this.logger.trackEvent({
        name: 'AircraftTrackingStopped',
        properties: { aircraftId, reason }
      });
    } catch (error) {
      this.handleError(error as Error, 'stop_tracking');
    }
  }

  /**
   * Comprehensive resource cleanup and connection termination
   */
  public async cleanup(): Promise<void> {
    try {
      // Stop all active tracking
      const trackingPromises = Array.from(this.activeTracking).map(aircraftId =>
        this.stopTracking(aircraftId, 'service_cleanup')
      );
      await Promise.all(trackingPromises);

      // Clear all configurations and states
      this.retryConfigs.clear();
      this.activeTracking.clear();

      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      // Remove all listeners
      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket = null;
      }

      this.logger.trackEvent({ name: 'AircraftSocketCleaned' });
    } catch (error) {
      this.handleError(error as Error, 'cleanup');
    }
  }

  /**
   * Validates position data against defined ranges
   */
  private validatePosition(position: AircraftPosition): void {
    if (position.latitude < -90 || position.latitude > 90) {
      throw new Error('Invalid latitude value');
    }
    if (position.longitude < -180 || position.longitude > 180) {
      throw new Error('Invalid longitude value');
    }
    if (position.altitude < 0 || position.altitude > 60000) {
      throw new Error('Invalid altitude value');
    }
    if (position.groundSpeed < 0 || position.groundSpeed > 1000) {
      throw new Error('Invalid ground speed value');
    }
    if (position.heading < 0 || position.heading > 359) {
      throw new Error('Invalid heading value');
    }
  }

  /**
   * Handles WebSocket errors with logging and retry logic
   */
  private handleError(error: Error, context: string): void {
    this.logger.trackException({
      exception: error,
      properties: { context }
    });
    this.eventHandlers.onError(error, context);
  }

  /**
   * Manages reconnection attempts and state recovery
   */
  private handleReconnect(attemptNumber: number): void {
    this.eventHandlers.onReconnect(attemptNumber);
    
    // Resubscribe to active tracking
    this.activeTracking.forEach(aircraftId => {
      const config = this.retryConfigs.get(aircraftId);
      if (config && attemptNumber <= config.attempts) {
        this.startTracking(aircraftId, {
          retryAttempts: config.attempts - attemptNumber
        });
      }
    });

    this.logger.trackEvent({
      name: 'AircraftSocketReconnected',
      properties: { attemptNumber }
    });
  }
}

export default AircraftSocket;