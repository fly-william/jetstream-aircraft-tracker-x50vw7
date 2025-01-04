// socket.io-client v4.7.2
import { io, Socket } from 'socket.io-client';
import { websocketConfig } from '../../config/websocket.config';
import {
  Trip,
  TripStatus,
  Milestone,
  ServiceRequest,
  TripStatusUpdate
} from '../../types/trip.types';

/**
 * Enum representing possible WebSocket connection states
 */
export enum ConnectionState {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING'
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
 * Interface for validation options
 */
interface ValidationOptions {
  validateTimestamp: boolean;
  requireNotes: boolean;
  enforceSequence: boolean;
}

/**
 * Type definitions for event handlers
 */
type TripUpdateHandler = (update: Trip, preferences?: NotificationPreferences) => void;
type MilestoneHandler = (milestone: Milestone, validation?: ValidationOptions) => void;
type ServiceRequestHandler = (request: ServiceRequest, priority?: string) => void;
type ErrorHandler = (error: Error) => void;

/**
 * Enhanced WebSocket client for real-time trip management
 */
export class TripSocket {
  private socket: Socket | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts: number = 0;
  private heartbeatInterval?: NodeJS.Timeout;
  private readonly eventHandlers: Map<string, Function> = new Map();
  private tripUpdateHandler?: TripUpdateHandler;
  private milestoneHandler?: MilestoneHandler;
  private serviceRequestHandler?: ServiceRequestHandler;
  private errorHandler?: ErrorHandler;

  /**
   * Initializes the WebSocket client with enhanced configuration
   */
  constructor() {
    this.initializeSocket();
  }

  /**
   * Initializes socket instance with configuration and event listeners
   */
  private initializeSocket(): void {
    this.socket = io(websocketConfig.baseURL, websocketConfig.options);
    this.setupEventListeners();
  }

  /**
   * Sets up core WebSocket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.connectionState = ConnectionState.CONNECTED;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    });

    this.socket.on('disconnect', () => {
      this.connectionState = ConnectionState.DISCONNECTED;
      this.clearHeartbeat();
    });

    this.socket.on('connect_error', (error: Error) => {
      if (this.errorHandler) {
        this.errorHandler(error);
      }
      this.handleReconnection();
    });
  }

  /**
   * Manages WebSocket heartbeat for connection monitoring
   */
  private startHeartbeat(): void {
    this.clearHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit(websocketConfig.channels.system.health);
      }
    }, websocketConfig.options.pingInterval);
  }

  /**
   * Clears the heartbeat interval
   */
  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }

  /**
   * Handles reconnection attempts with exponential backoff
   */
  private async handleReconnection(): Promise<void> {
    if (this.reconnectAttempts >= websocketConfig.options.reconnectionAttempts) {
      this.connectionState = ConnectionState.DISCONNECTED;
      return;
    }

    this.connectionState = ConnectionState.RECONNECTING;
    this.reconnectAttempts++;

    const delay = this.reconnectAttempts * websocketConfig.options.reconnectionDelay;
    await new Promise(resolve => setTimeout(resolve, delay));

    this.connect();
  }

  /**
   * Establishes WebSocket connection
   */
  public async connect(): Promise<void> {
    if (this.connectionState === ConnectionState.CONNECTED) return;

    this.connectionState = ConnectionState.CONNECTING;
    this.socket?.connect();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, websocketConfig.options.timeout);

      this.socket?.once('connect', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  /**
   * Safely disconnects WebSocket connection
   */
  public disconnect(): void {
    this.clearHeartbeat();
    this.eventHandlers.clear();
    this.socket?.disconnect();
    this.connectionState = ConnectionState.DISCONNECTED;
    this.reconnectAttempts = 0;
  }

  /**
   * Subscribes to trip status updates
   */
  public subscribeToTripUpdates(handler: TripUpdateHandler): void {
    this.tripUpdateHandler = handler;
    this.socket?.on(websocketConfig.channels.trip.status, 
      (update: Trip, preferences?: NotificationPreferences) => {
        if (this.tripUpdateHandler) {
          this.tripUpdateHandler(update, preferences);
        }
    });
  }

  /**
   * Subscribes to trip milestone events
   */
  public subscribeToMilestones(handler: MilestoneHandler): void {
    this.milestoneHandler = handler;
    this.socket?.on(websocketConfig.channels.trip.milestone,
      (milestone: Milestone, validation?: ValidationOptions) => {
        if (this.milestoneHandler) {
          this.milestoneHandler(milestone, validation);
        }
    });
  }

  /**
   * Subscribes to service request updates
   */
  public subscribeToServiceRequests(handler: ServiceRequestHandler): void {
    this.serviceRequestHandler = handler;
    this.socket?.on(websocketConfig.channels.trip.service,
      (request: ServiceRequest, priority?: string) => {
        if (this.serviceRequestHandler) {
          this.serviceRequestHandler(request, priority);
        }
    });
  }

  /**
   * Sends trip status update
   */
  public sendTripStatusUpdate(update: TripStatusUpdate): void {
    if (this.connectionState !== ConnectionState.CONNECTED) {
      throw new Error('WebSocket not connected');
    }
    this.socket?.emit(websocketConfig.channels.trip.status, update);
  }

  /**
   * Sets error handler for WebSocket errors
   */
  public setErrorHandler(handler: ErrorHandler): void {
    this.errorHandler = handler;
  }

  /**
   * Gets current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }
}

export default TripSocket;