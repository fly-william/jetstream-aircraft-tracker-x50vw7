// socket.io-client v4.7.2
import { io, Socket } from 'socket.io-client';
import { websocketConfig } from '../../config/websocket.config';
import {
  NotificationType,
  NotificationPriority,
  Notification,
  NotificationHandler,
  NotificationContext
} from '../../types/notification.types';

/**
 * Queue implementation for storing offline messages
 */
class Queue<T> {
  private items: T[] = [];

  enqueue(item: T): void {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  get length(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }
}

/**
 * WebSocket client implementation for handling real-time notifications
 * with priority-based processing, message batching, and offline support
 */
export class NotificationSocket {
  private socket: Socket;
  private notificationHandler?: NotificationHandler;
  private isConnected: boolean = false;
  private offlineQueue: Queue<Notification> = new Queue<Notification>();
  private reconnectAttempts: number = 0;
  private messagesBatchSize: number = 10;
  private batchTimeout: number = 1000;
  private healthCheckInterval?: NodeJS.Timeout;
  private channelPriorities: Map<string, NotificationPriority> = new Map();
  private pendingBatch: Notification[] = [];
  private batchTimer?: NodeJS.Timeout;

  constructor(options?: Partial<typeof websocketConfig.options>) {
    this.socket = io(websocketConfig.baseURL, {
      ...websocketConfig.options,
      ...options
    });

    this.initializeChannelPriorities();
    this.setupEventListeners();
  }

  /**
   * Initialize channel priorities for message handling
   */
  private initializeChannelPriorities(): void {
    this.channelPriorities.set(websocketConfig.channels.notification.alert, NotificationPriority.CRITICAL);
    this.channelPriorities.set(websocketConfig.channels.notification.status, NotificationPriority.MEDIUM);
    this.channelPriorities.set(websocketConfig.channels.notification.teams, NotificationPriority.HIGH);
  }

  /**
   * Set up WebSocket event listeners
   */
  private setupEventListeners(): void {
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.processOfflineQueue();
      this.setupHealthCheck();
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.clearHealthCheck();
    });

    this.socket.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      this.handleReconnection();
    });

    this.socket.on('notification', (notification: Notification) => {
      this.handleNotification(notification);
    });
  }

  /**
   * Establish WebSocket connection with retry mechanism
   */
  public async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, websocketConfig.options.timeout);

        this.socket.connect();

        this.socket.once('connect', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    } catch (error) {
      await this.handleReconnection();
    }
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private async handleReconnection(): Promise<void> {
    if (this.reconnectAttempts >= websocketConfig.options.reconnectionAttempts) {
      throw new Error('Max reconnection attempts reached');
    }

    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      websocketConfig.options.reconnectionDelay
    );

    this.reconnectAttempts++;

    await new Promise(resolve => setTimeout(resolve, delay));
    await this.connect();
  }

  /**
   * Gracefully close WebSocket connection
   */
  public disconnect(): void {
    this.clearHealthCheck();
    if (this.socket) {
      this.socket.disconnect();
    }
    this.isConnected = false;
  }

  /**
   * Subscribe to notification events with priority handling
   */
  public subscribeToNotifications(
    handler: NotificationHandler,
    priority?: NotificationPriority
  ): void {
    this.notificationHandler = handler;

    // Subscribe to notification channels
    Object.values(websocketConfig.channels.notification).forEach(channel => {
      this.socket.on(channel, (notification: Notification) => {
        const channelPriority = this.channelPriorities.get(channel) || NotificationPriority.LOW;
        if (!priority || channelPriority >= priority) {
          this.handleNotification(notification);
        }
      });
    });
  }

  /**
   * Process incoming notifications with priority and batching
   */
  private handleNotification(notification: Notification): void {
    if (!this.isConnected) {
      this.offlineQueue.enqueue(notification);
      return;
    }

    if (notification.priority === NotificationPriority.CRITICAL) {
      this.processNotification(notification);
    } else {
      this.addToBatch(notification);
    }
  }

  /**
   * Add notification to batch for processing
   */
  private addToBatch(notification: Notification): void {
    this.pendingBatch.push(notification);

    if (this.pendingBatch.length >= this.messagesBatchSize) {
      this.processBatch();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.processBatch(), this.batchTimeout);
    }
  }

  /**
   * Process batch of notifications
   */
  private processBatch(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    if (this.pendingBatch.length === 0) return;

    const batch = this.pendingBatch;
    this.pendingBatch = [];

    batch.sort((a, b) => b.priority.localeCompare(a.priority));
    batch.forEach(notification => this.processNotification(notification));
  }

  /**
   * Process individual notification
   */
  private async processNotification(notification: Notification): Promise<void> {
    try {
      if (this.notificationHandler) {
        const context: NotificationContext = {
          userId: 'current-user', // Replace with actual user ID
          sessionId: this.socket.id,
          timestamp: new Date()
        };

        await this.notificationHandler(notification, context);
        this.socket.emit('notification:ack', { id: notification.id });
      }
    } catch (error) {
      console.error('Error processing notification:', error);
      this.offlineQueue.enqueue(notification);
    }
  }

  /**
   * Process queued offline messages
   */
  private async processOfflineQueue(): Promise<void> {
    while (this.offlineQueue.length > 0) {
      const notification = this.offlineQueue.dequeue();
      if (notification) {
        await this.processNotification(notification);
      }
    }
  }

  /**
   * Set up connection health monitoring
   */
  private setupHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      if (this.isConnected) {
        this.socket.emit('ping');
      }
    }, websocketConfig.options.pingInterval);
  }

  /**
   * Clear health check interval
   */
  private clearHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }
}