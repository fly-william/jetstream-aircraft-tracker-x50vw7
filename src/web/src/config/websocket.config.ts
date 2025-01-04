// socket.io-client v4.7.2
import { type ManagerOptions, type SocketOptions } from 'socket.io-client';

/**
 * Maximum number of WebSocket reconnection attempts
 */
export const WEBSOCKET_RETRY_ATTEMPTS = 3;

/**
 * Delay between reconnection attempts in milliseconds
 */
export const WEBSOCKET_RETRY_DELAY = 2000;

/**
 * Interval for WebSocket heartbeat checks in milliseconds
 */
export const WEBSOCKET_HEARTBEAT_INTERVAL = 30000;

/**
 * WebSocket channel definitions for real-time communication
 */
export const channels = {
  aircraft: {
    /** Real-time aircraft position updates */
    position: 'aircraft:position',
    /** Aircraft operational status changes */
    status: 'aircraft:status',
    /** Aircraft tracking state changes */
    tracking: 'aircraft:tracking',
    /** Aircraft telemetry data stream */
    telemetry: 'aircraft:telemetry'
  },
  trip: {
    /** Trip status updates */
    status: 'trip:status',
    /** Trip milestone events */
    milestone: 'trip:milestone',
    /** Service request updates */
    service: 'trip:service',
    /** Timeline modifications */
    timeline: 'trip:timeline'
  },
  notification: {
    /** General status notifications */
    status: 'notification:status',
    /** Critical system alerts */
    alert: 'notification:alert',
    /** Microsoft Teams integration events */
    teams: 'notification:teams',
    /** Priority notifications */
    priority: 'notification:priority'
  },
  system: {
    /** System health checks */
    health: 'system:health',
    /** Performance metrics */
    metrics: 'system:metrics',
    /** System status updates */
    status: 'system:status'
  }
} as const;

/**
 * Combined Socket.IO manager and socket options interface
 */
export interface WebSocketOptions extends Partial<ManagerOptions & SocketOptions> {
  transports: string[];
  reconnectionAttempts: number;
  reconnectionDelay: number;
  timeout: number;
  autoConnect: boolean;
  path: string;
  withCredentials: boolean;
  forceNew: boolean;
  secure: boolean;
  rejectUnauthorized: boolean;
  pingInterval: number;
  pingTimeout: number;
}

/**
 * WebSocket configuration object for JetStream platform
 */
export const websocketConfig = {
  /**
   * Base WebSocket server URL
   */
  baseURL: process.env.VITE_WEBSOCKET_URL || 'ws://localhost:3000',

  /**
   * Socket.IO client configuration options
   */
  options: {
    // Use WebSocket transport only for better performance
    transports: ['websocket'],
    // Reconnection settings
    reconnectionAttempts: WEBSOCKET_RETRY_ATTEMPTS,
    reconnectionDelay: WEBSOCKET_RETRY_DELAY,
    timeout: 10000,
    // Disable auto-connect to allow manual connection management
    autoConnect: false,
    // Socket.IO specific settings
    path: '/socket.io',
    // Security settings
    withCredentials: true,
    forceNew: true,
    secure: true,
    rejectUnauthorized: true,
    // Heartbeat settings for connection monitoring
    pingInterval: WEBSOCKET_HEARTBEAT_INTERVAL,
    pingTimeout: 5000
  } as WebSocketOptions,

  /**
   * Channel definitions for all real-time communication
   */
  channels
};

/**
 * Type definitions for WebSocket events
 */
export type WebSocketChannels = typeof channels;
export type AircraftChannels = typeof channels.aircraft;
export type TripChannels = typeof channels.trip;
export type NotificationChannels = typeof channels.notification;
export type SystemChannels = typeof channels.system;

export default websocketConfig;