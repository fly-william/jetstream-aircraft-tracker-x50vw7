import React, { useState, useEffect, useCallback, useMemo, memo } from 'react'; // version: 18.2.0
import { 
  Popover, 
  Box, 
  Tabs, 
  Tab, 
  IconButton, 
  Typography, 
  Badge, 
  Chip 
} from '@mui/material'; // version: 5.x
import { styled } from '@mui/material/styles'; // version: 5.x
import { 
  Close as CloseIcon, 
  ClearAll as ClearAllIcon,
  FilterList as FilterListIcon,
  Sync as SyncIcon 
} from '@mui/icons-material'; // version: 5.x

import NotificationList from './NotificationList';
import { useNotifications } from '../../hooks/useNotifications';
import { 
  NotificationType, 
  NotificationPriority 
} from '../../types/notification.types';

// Enhanced styled components with enterprise-ready styling
const StyledPopover = styled(Popover)(({ theme }) => ({
  '& .MuiPopover-paper': {
    width: '400px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[8],
    overflow: 'hidden'
  }
}));

const StyledHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper
}));

const StyledTabs = styled(Tabs)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  '& .MuiTab-root': {
    minWidth: 'auto',
    padding: theme.spacing(1.5),
    textTransform: 'none'
  }
}));

// Interface definitions
interface NotificationPanelProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  open: boolean;
  maxHeight?: number;
  defaultTab?: NotificationType;
}

// Enhanced notification panel component with advanced features
const NotificationPanel: React.FC<NotificationPanelProps> = memo(({
  anchorEl,
  onClose,
  open,
  maxHeight = 600,
  defaultTab = NotificationType.TRIP_STATUS
}) => {
  // State management
  const [activeTab, setActiveTab] = useState<NotificationType>(defaultTab);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Custom hooks
  const {
    notifications,
    clearNotifications,
    getNotificationsByType,
    markAsRead,
    reconnectWebSocket,
    isConnected
  } = useNotifications();

  // Memoized notification counts
  const notificationCounts = useMemo(() => ({
    [NotificationType.TRIP_STATUS]: getNotificationsByType(NotificationType.TRIP_STATUS).length,
    [NotificationType.SERVICE_REQUEST]: getNotificationsByType(NotificationType.SERVICE_REQUEST).length,
    [NotificationType.SYSTEM_ALERT]: getNotificationsByType(NotificationType.SYSTEM_ALERT).length,
    [NotificationType.TEAMS_MESSAGE]: getNotificationsByType(NotificationType.TEAMS_MESSAGE).length
  }), [getNotificationsByType]);

  // Handle tab change
  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: NotificationType) => {
    setActiveTab(newValue);
  }, []);

  // Handle clear notifications
  const handleClearNotifications = useCallback(async () => {
    try {
      await clearNotifications();
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }, [clearNotifications]);

  // Handle sync/reconnect
  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await reconnectWebSocket();
    } catch (error) {
      console.error('Failed to sync notifications:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [reconnectWebSocket]);

  // Auto-mark notifications as read when panel opens
  useEffect(() => {
    if (open) {
      const visibleNotifications = getNotificationsByType(activeTab);
      visibleNotifications.forEach(notification => {
        if (!notification.read) {
          markAsRead(notification.id);
        }
      });
    }
  }, [open, activeTab, getNotificationsByType, markAsRead]);

  return (
    <StyledPopover
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <StyledHeader>
        <Typography variant="h6">Notifications</Typography>
        <Box display="flex" alignItems="center" gap={1}>
          {!isConnected && (
            <Chip
              size="small"
              color="warning"
              label="Offline"
              onClick={handleSync}
            />
          )}
          <IconButton
            size="small"
            onClick={() => setIsFiltering(!isFiltering)}
            color={isFiltering ? 'primary' : 'default'}
          >
            <FilterListIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={handleSync}
            disabled={isSyncing}
            color={isSyncing ? 'primary' : 'default'}
          >
            <SyncIcon />
          </IconButton>
          <IconButton size="small" onClick={handleClearNotifications}>
            <ClearAllIcon />
          </IconButton>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </StyledHeader>

      <StyledTabs
        value={activeTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab
          label={
            <Badge badgeContent={notificationCounts[NotificationType.TRIP_STATUS]} color="primary">
              Trip Status
            </Badge>
          }
          value={NotificationType.TRIP_STATUS}
        />
        <Tab
          label={
            <Badge badgeContent={notificationCounts[NotificationType.SERVICE_REQUEST]} color="secondary">
              Services
            </Badge>
          }
          value={NotificationType.SERVICE_REQUEST}
        />
        <Tab
          label={
            <Badge badgeContent={notificationCounts[NotificationType.SYSTEM_ALERT]} color="error">
              Alerts
            </Badge>
          }
          value={NotificationType.SYSTEM_ALERT}
        />
        <Tab
          label={
            <Badge badgeContent={notificationCounts[NotificationType.TEAMS_MESSAGE]} color="info">
              Teams
            </Badge>
          }
          value={NotificationType.TEAMS_MESSAGE}
        />
      </StyledTabs>

      <NotificationList
        maxHeight={maxHeight}
        groupByPriority={true}
        autoMarkRead={true}
      />
    </StyledPopover>
  );
});

NotificationPanel.displayName = 'NotificationPanel';

export default NotificationPanel;