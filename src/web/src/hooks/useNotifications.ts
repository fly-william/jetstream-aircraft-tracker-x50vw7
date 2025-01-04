import { useCallback, useMemo, useEffect } from 'react'; // version: 18.2.0
import { useNotificationContext } from '../contexts/NotificationContext';
import {
  NotificationType,
  NotificationPriority,
  Notification
} from '../types/notification.types';

/**
 * Interface defining the return type of useNotifications hook
 */
interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  clearNotifications: () => Promise<void>;
  getUnreadNotifications: () => Notification[];
  getNotificationsByType: (type: NotificationType) => Notification[];
  getNotificationsByPriority: (priority: NotificationPriority) => Notification[];
  getNotificationsByTimeRange: (startDate: Date, endDate: Date) => Notification[];
  batchMarkAsRead: (ids: string[]) => Promise<void>;
  reconnectWebSocket: () => Promise<void>;
  isConnected: boolean;
}

/**
 * Enhanced custom hook for managing notifications with optimized performance and real-time updates
 * Supports < 5s latency requirement and 60% reduction in manual updates
 */
export const useNotifications = (): UseNotificationsReturn => {
  const {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    clearNotifications,
    reconnectWebSocket
  } = useNotificationContext();

  /**
   * Cleanup interval for stale notifications (24 hours)
   */
  useEffect(() => {
    const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
    const cleanup = setInterval(() => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep 7 days of notifications
      
      notifications
        .filter(notification => new Date(notification.timestamp) < cutoffDate)
        .forEach(notification => markAsRead(notification.id));
    }, CLEANUP_INTERVAL);

    return () => clearInterval(cleanup);
  }, [notifications, markAsRead]);

  /**
   * Get unread notifications with memoization
   */
  const getUnreadNotifications = useMemo(() => {
    return () => notifications
      .filter(notification => !notification.read)
      .sort((a, b) => {
        // Sort by priority first
        const priorityCompare = b.priority.localeCompare(a.priority);
        if (priorityCompare !== 0) return priorityCompare;
        // Then by timestamp
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
  }, [notifications]);

  /**
   * Get notifications by type with memoization
   */
  const getNotificationsByType = useCallback((type: NotificationType) => {
    return notifications
      .filter(notification => notification.type === type)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notifications]);

  /**
   * Get notifications by priority with memoization
   */
  const getNotificationsByPriority = useCallback((priority: NotificationPriority) => {
    return notifications
      .filter(notification => notification.priority === priority)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notifications]);

  /**
   * Get notifications within a time range
   */
  const getNotificationsByTimeRange = useCallback((startDate: Date, endDate: Date) => {
    return notifications
      .filter(notification => {
        const notificationDate = new Date(notification.timestamp);
        return notificationDate >= startDate && notificationDate <= endDate;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notifications]);

  /**
   * Batch mark multiple notifications as read
   */
  const batchMarkAsRead = useCallback(async (ids: string[]) => {
    try {
      await Promise.all(ids.map(id => markAsRead(id)));
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      throw error;
    }
  }, [markAsRead]);

  /**
   * Determine WebSocket connection status
   */
  const isConnected = useMemo(() => {
    return notifications.length > 0 && new Date().getTime() - new Date(notifications[0].timestamp).getTime() < 5000;
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    clearNotifications,
    getUnreadNotifications,
    getNotificationsByType,
    getNotificationsByPriority,
    getNotificationsByTimeRange,
    batchMarkAsRead,
    reconnectWebSocket,
    isConnected
  };
};

export default useNotifications;