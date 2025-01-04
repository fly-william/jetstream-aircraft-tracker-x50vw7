import React, { useEffect, useCallback, useMemo, memo } from 'react'; // version: 18.2.0
import { List, ListItem, ListItemText, ListItemIcon, Typography, Box, Divider, Badge } from '@mui/material'; // version: 5.x
import { styled } from '@mui/material/styles'; // version: 5.x
import { NotificationsActive, Flight, Build, Warning, CheckCircle } from '@mui/icons-material'; // version: 5.x
import { useVirtualizer } from '@tanstack/react-virtual'; // version: ^3.0.0

import { useNotifications } from '../../hooks/useNotifications';
import { NotificationType, NotificationPriority, Notification } from '../../types/notification.types';

// Styled components for enhanced visuals
const StyledList = styled(List)(({ theme }) => ({
  width: '100%',
  overflow: 'auto',
  scrollBehavior: 'smooth',
  '& .priority-section': {
    backgroundColor: theme.palette.background.default,
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  '& .MuiListItem-root': {
    transition: theme.transitions.create(['background-color', 'box-shadow']),
  },
}));

const StyledListItem = styled(ListItem)<{ priority: NotificationPriority }>(({ theme, priority }) => ({
  borderLeft: '4px solid',
  borderLeftColor: (() => {
    switch (priority) {
      case NotificationPriority.CRITICAL:
        return theme.palette.error.main;
      case NotificationPriority.HIGH:
        return theme.palette.warning.main;
      case NotificationPriority.MEDIUM:
        return theme.palette.info.main;
      default:
        return theme.palette.grey[400];
    }
  })(),
  backgroundColor: theme.palette.background.paper,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '&.unread': {
    backgroundColor: theme.palette.action.selected,
  },
}));

interface NotificationListProps {
  maxHeight?: string | number;
  groupByPriority?: boolean;
  autoMarkRead?: boolean;
}

const NotificationList: React.FC<NotificationListProps> = memo(({
  maxHeight = '70vh',
  groupByPriority = true,
  autoMarkRead = true,
}) => {
  const { notifications, markAsRead } = useNotifications();

  // Setup virtualizer for optimized rendering
  const parentRef = React.useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: notifications.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  // Group notifications by priority if enabled
  const groupedNotifications = useMemo(() => {
    if (!groupByPriority) return { notifications };

    return notifications.reduce((acc, notification) => {
      const priority = notification.priority;
      if (!acc[priority]) acc[priority] = [];
      acc[priority].push(notification);
      return acc;
    }, {} as Record<NotificationPriority, Notification[]>);
  }, [notifications, groupByPriority]);

  // Auto-mark notifications as read when viewed
  useEffect(() => {
    if (!autoMarkRead) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const notificationId = entry.target.getAttribute('data-notification-id');
            if (notificationId) markAsRead(notificationId);
          }
        });
      },
      { threshold: 0.5 }
    );

    const elements = document.querySelectorAll('[data-notification-id]');
    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [autoMarkRead, markAsRead]);

  // Get icon for notification type
  const getNotificationIcon = useCallback((type: NotificationType) => {
    switch (type) {
      case NotificationType.TRIP_STATUS:
        return <Flight color="primary" />;
      case NotificationType.SERVICE_REQUEST:
        return <Build color="secondary" />;
      case NotificationType.SYSTEM_ALERT:
        return <Warning color="error" />;
      case NotificationType.TEAMS_MESSAGE:
        return <NotificationsActive color="info" />;
      default:
        return <CheckCircle color="success" />;
    }
  }, []);

  // Render notification item
  const renderNotification = useCallback((notification: Notification) => (
    <StyledListItem
      key={notification.id}
      priority={notification.priority}
      className={notification.read ? '' : 'unread'}
      data-notification-id={notification.id}
      button
    >
      <ListItemIcon>
        <Badge color="error" variant="dot" invisible={notification.read}>
          {getNotificationIcon(notification.type)}
        </Badge>
      </ListItemIcon>
      <ListItemText
        primary={notification.title}
        secondary={
          <React.Fragment>
            <Typography component="span" variant="body2" color="textSecondary">
              {new Date(notification.timestamp).toLocaleString()}
            </Typography>
            <br />
            {notification.message}
          </React.Fragment>
        }
      />
    </StyledListItem>
  ), [getNotificationIcon]);

  // Render priority section
  const renderPrioritySection = useCallback((priority: NotificationPriority) => (
    <Box key={priority} className="priority-section" px={2} py={1}>
      <Typography variant="subtitle2" color="textSecondary">
        {priority.charAt(0) + priority.slice(1).toLowerCase()} Priority
      </Typography>
    </Box>
  ), []);

  return (
    <Box ref={parentRef} style={{ height: maxHeight, overflow: 'auto' }}>
      <StyledList>
        {groupByPriority ? (
          Object.entries(groupedNotifications).map(([priority, items]) => (
            items.length > 0 && (
              <React.Fragment key={priority}>
                {renderPrioritySection(priority as NotificationPriority)}
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const notification = items[virtualRow.index];
                  return notification && renderNotification(notification);
                })}
                <Divider />
              </React.Fragment>
            )
          ))
        ) : (
          virtualizer.getVirtualItems().map((virtualRow) => {
            const notification = notifications[virtualRow.index];
            return notification && renderNotification(notification);
          })
        )}
      </StyledList>
    </Box>
  );
});

NotificationList.displayName = 'NotificationList';

export default NotificationList;