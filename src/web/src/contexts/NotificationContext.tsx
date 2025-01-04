import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'; // version: 18.2.0
import {
  NotificationType,
  NotificationPriority,
  Notification,
  NotificationState,
  NotificationFilter
} from '../types/notification.types';
import { NotificationSocket } from '../services/websocket/notification.socket';

/**
 * Interface defining the shape of the notification context
 */
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  clearNotifications: () => void;
  filterNotifications: (filter: NotificationFilter) => void;
  batchNotifications: (notifications: Notification[]) => void;
  getNotificationsByPriority: (priority: NotificationPriority) => Notification[];
}

/**
 * Props interface for the NotificationProvider component
 */
interface NotificationProviderProps {
  children: ReactNode;
  maxNotifications?: number;
  batchSize?: number;
  offlineStorageKey?: string;
}

// Create the context with a default value
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * NotificationProvider component that manages the notification state and WebSocket connection
 */
export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  maxNotifications = 100,
  batchSize = 10,
  offlineStorageKey = 'jetstream_notifications'
}) => {
  // State management
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [activeFilter, setActiveFilter] = useState<NotificationFilter | null>(null);

  // Refs
  const notificationSocket = useRef<NotificationSocket>();
  const pendingBatch = useRef<Notification[]>([]);
  const batchTimeout = useRef<NodeJS.Timeout>();

  /**
   * Initialize WebSocket connection and load offline notifications
   */
  useEffect(() => {
    notificationSocket.current = new NotificationSocket();
    
    const loadOfflineNotifications = () => {
      const stored = localStorage.getItem(offlineStorageKey);
      if (stored) {
        const offlineNotifications = JSON.parse(stored) as Notification[];
        setNotifications(prev => [...offlineNotifications, ...prev].slice(0, maxNotifications));
        updateUnreadCount([...offlineNotifications, ...notifications]);
      }
    };

    const initializeSocket = async () => {
      setConnectionStatus('connecting');
      try {
        await notificationSocket.current?.connect();
        setConnectionStatus('connected');
        loadOfflineNotifications();
        subscribeToNotifications();
      } catch (error) {
        console.error('Failed to connect to notification service:', error);
        setConnectionStatus('disconnected');
      }
    };

    initializeSocket();

    return () => {
      notificationSocket.current?.disconnect();
      if (batchTimeout.current) {
        clearTimeout(batchTimeout.current);
      }
    };
  }, []);

  /**
   * Subscribe to notifications with priority handling
   */
  const subscribeToNotifications = () => {
    notificationSocket.current?.subscribeToNotifications(
      async (notification: Notification) => {
        if (notification.priority === NotificationPriority.CRITICAL) {
          addNotification(notification);
        } else {
          addToBatch(notification);
        }
      }
    );
  };

  /**
   * Add notification to batch for processing
   */
  const addToBatch = useCallback((notification: Notification) => {
    pendingBatch.current.push(notification);

    if (pendingBatch.current.length >= batchSize) {
      processBatch();
    } else if (!batchTimeout.current) {
      batchTimeout.current = setTimeout(processBatch, 1000);
    }
  }, [batchSize]);

  /**
   * Process batch of notifications
   */
  const processBatch = useCallback(() => {
    if (batchTimeout.current) {
      clearTimeout(batchTimeout.current);
      batchTimeout.current = undefined;
    }

    if (pendingBatch.current.length === 0) return;

    const batch = [...pendingBatch.current];
    pendingBatch.current = [];

    batch.sort((a, b) => b.priority.localeCompare(a.priority));
    batchNotifications(batch);
  }, []);

  /**
   * Add a new notification with priority handling
   */
  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => {
      const newNotifications = [notification, ...prev].slice(0, maxNotifications);
      
      // Store notifications for offline access
      if (connectionStatus === 'disconnected') {
        localStorage.setItem(offlineStorageKey, JSON.stringify(newNotifications));
      }
      
      return newNotifications;
    });
    
    setUnreadCount(prev => prev + 1);
  }, [connectionStatus, maxNotifications, offlineStorageKey]);

  /**
   * Process multiple notifications in a batch
   */
  const batchNotifications = useCallback((newNotifications: Notification[]) => {
    setNotifications(prev => {
      const combined = [...newNotifications, ...prev].slice(0, maxNotifications);
      return combined;
    });
    updateUnreadCount([...notifications, ...newNotifications]);
  }, [maxNotifications]);

  /**
   * Mark a notification as read
   */
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
    updateUnreadCount(notifications);
  }, []);

  /**
   * Clear all notifications
   */
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem(offlineStorageKey);
  }, [offlineStorageKey]);

  /**
   * Filter notifications based on criteria
   */
  const filterNotifications = useCallback((filter: NotificationFilter) => {
    setActiveFilter(filter);
  }, []);

  /**
   * Get notifications filtered by priority
   */
  const getNotificationsByPriority = useCallback((priority: NotificationPriority) => {
    return notifications.filter(notification => notification.priority === priority);
  }, [notifications]);

  /**
   * Update unread notification count
   */
  const updateUnreadCount = useCallback((notificationList: Notification[]) => {
    const count = notificationList.filter(notification => !notification.read).length;
    setUnreadCount(count);
  }, []);

  /**
   * Get filtered notifications based on active filter
   */
  const getFilteredNotifications = useCallback(() => {
    if (!activeFilter) return notifications;

    return notifications.filter(notification => {
      const typeMatch = !activeFilter.types || activeFilter.types.includes(notification.type);
      const priorityMatch = !activeFilter.priorities || activeFilter.priorities.includes(notification.priority);
      const targetMatch = !activeFilter.targets || activeFilter.targets.includes(notification.target);
      const tagMatch = !activeFilter.tags || notification.tags.some(tag => activeFilter.tags?.includes(tag));
      const unreadMatch = !activeFilter.unreadOnly || !notification.read;
      
      return typeMatch && priorityMatch && targetMatch && tagMatch && unreadMatch;
    });
  }, [notifications, activeFilter]);

  const contextValue: NotificationContextType = {
    notifications: getFilteredNotifications(),
    unreadCount,
    connectionStatus,
    addNotification,
    markAsRead,
    clearNotifications,
    filterNotifications,
    batchNotifications,
    getNotificationsByPriority
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

/**
 * Custom hook for accessing the notification context
 */
export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;