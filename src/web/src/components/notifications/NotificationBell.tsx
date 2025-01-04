import React, { useState, useCallback, useMemo, memo } from 'react'; // version: 18.2.0
import { IconButton, Badge, Popper } from '@mui/material'; // version: 5.x
import { NotificationsOutlined } from '@mui/icons-material'; // version: 5.x
import { styled, keyframes } from '@mui/material/styles'; // version: 5.x

import NotificationPanel from './NotificationPanel';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationPriority } from '../../types/notification.types';

// Pulse animation for new notifications
const pulseAnimation = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
`;

// Enhanced styled Badge with priority-based colors and animations
const StyledBadge = styled(Badge, {
  shouldForwardProp: (prop) => prop !== 'priority'
})<{ priority?: NotificationPriority }>(({ theme, priority }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: (() => {
      switch (priority) {
        case NotificationPriority.CRITICAL:
          return theme.palette.error.main;
        case NotificationPriority.HIGH:
          return theme.palette.warning.main;
        case NotificationPriority.MEDIUM:
          return theme.palette.info.main;
        default:
          return theme.palette.primary.main;
      }
    })(),
    color: theme.palette.common.white,
    animation: `${pulseAnimation} 2s ease-in-out`,
    animationIterationCount: priority === NotificationPriority.CRITICAL ? 'infinite' : 1,
    '&::after': {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      animation: priority === NotificationPriority.CRITICAL ? 
        `${pulseAnimation} 1.5s infinite` : 'none',
      border: '1px solid currentColor',
      content: '""',
    },
  },
}));

// Enhanced styled IconButton with accessibility features
const StyledIconButton = styled(IconButton)(({ theme }) => ({
  padding: theme.spacing(1),
  position: 'relative',
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '&[aria-expanded="true"]': {
    backgroundColor: theme.palette.action.selected,
  },
}));

// Interface for component props
interface NotificationBellProps {
  className?: string;
  position?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'right';
  };
  maxDisplayCount?: number;
}

// Enhanced NotificationBell component with real-time updates
const NotificationBell: React.FC<NotificationBellProps> = memo(({
  className,
  position = { vertical: 'bottom', horizontal: 'right' },
  maxDisplayCount = 99
}) => {
  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Custom hooks
  const { unreadCount, notifications } = useNotifications();

  // Memoized notification priority for badge color
  const highestPriority = useMemo(() => {
    if (notifications.length === 0) return NotificationPriority.LOW;
    return notifications.reduce((highest, notification) => {
      const priorityOrder = {
        [NotificationPriority.CRITICAL]: 3,
        [NotificationPriority.HIGH]: 2,
        [NotificationPriority.MEDIUM]: 1,
        [NotificationPriority.LOW]: 0
      };
      return priorityOrder[notification.priority] > priorityOrder[highest] 
        ? notification.priority 
        : highest;
    }, NotificationPriority.LOW);
  }, [notifications]);

  // Enhanced click handler with keyboard support
  const handleBellClick = useCallback((event: React.MouseEvent | React.KeyboardEvent) => {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    
    if (event.type === 'keydown') {
      const keyEvent = event as React.KeyboardEvent;
      if (keyEvent.key !== 'Enter' && keyEvent.key !== ' ') return;
    }

    setAnchorEl(target);
    setIsOpen(prev => !prev);
  }, []);

  // Format display count
  const displayCount = unreadCount > maxDisplayCount ? `${maxDisplayCount}+` : unreadCount;

  return (
    <>
      <StyledIconButton
        className={className}
        aria-label={`${unreadCount} unread notifications`}
        onClick={handleBellClick}
        onKeyDown={handleBellClick}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={isOpen ? 'notification-panel' : undefined}
        data-testid="notification-bell"
      >
        <StyledBadge
          badgeContent={displayCount}
          priority={highestPriority}
          max={maxDisplayCount}
          overlap="circular"
          aria-live="polite"
        >
          <NotificationsOutlined />
        </StyledBadge>
      </StyledIconButton>

      <Popper
        open={isOpen}
        anchorEl={anchorEl}
        placement={`${position.vertical}-${position.horizontal}`}
        transition
        role="dialog"
        aria-label="Notifications panel"
        id="notification-panel"
        style={{ zIndex: 1300 }}
      >
        {({ TransitionProps }) => (
          <NotificationPanel
            {...TransitionProps}
            anchorEl={anchorEl}
            onClose={() => {
              setIsOpen(false);
              setAnchorEl(null);
            }}
            open={isOpen}
          />
        )}
      </Popper>
    </>
  );
});

NotificationBell.displayName = 'NotificationBell';

export default NotificationBell;