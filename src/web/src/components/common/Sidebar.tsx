import React, { memo, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Badge,
  Tooltip,
  IconButton,
  Box,
  useMediaQuery,
  Theme
} from '@mui/material';
import {
  FlightTakeoff as AircraftIcon,
  Dashboard as DashboardIcon,
  Schedule as TripIcon,
  RoomService as ServiceIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  ChevronLeft as CollapseIcon
} from '@mui/icons-material';

import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

// Styled components with theme-aware styling
const StyledDrawer = styled(Drawer)<{ width: number }>`
  width: ${props => props.width}px;
  flex-shrink: 0;
  transition: width 225ms cubic-bezier(0.4, 0, 0.6, 1) 0ms;

  & .MuiDrawer-paper {
    width: ${props => props.width}px;
    background-color: ${({ theme }) => theme.palette.background.paper};
    border-right: 1px solid ${({ theme }) => theme.palette.divider};
    transition: all 225ms cubic-bezier(0.4, 0, 0.6, 1) 0ms;
  }
`;

const StyledListItem = styled(ListItemButton)`
  margin: 8px 12px;
  border-radius: 8px;
  transition: all 150ms ease-in-out;

  &.active {
    background-color: ${({ theme }) => theme.palette.primary.main};
    color: ${({ theme }) => theme.palette.primary.contrastText};

    & .MuiListItemIcon-root {
      color: inherit;
    }
  }

  &:hover {
    background-color: ${({ theme }) => theme.palette.action.hover};
    transform: translateX(4px);
  }
`;

// Navigation items configuration with permissions
const NAV_ITEMS = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: DashboardIcon,
    permission: 'view:dashboard'
  },
  {
    path: '/aircraft-tracking',
    label: 'Aircraft Tracking',
    icon: AircraftIcon,
    permission: 'view:aircraft'
  },
  {
    path: '/trips',
    label: 'Trip Management',
    icon: TripIcon,
    permission: 'view:trips'
  },
  {
    path: '/services',
    label: 'Service Requests',
    icon: ServiceIcon,
    permission: 'view:services'
  }
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  width: number;
  variant: 'permanent' | 'persistent' | 'temporary';
}

const Sidebar: React.FC<SidebarProps> = memo(({ open, onClose, width, variant }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  // Filter navigation items based on permissions
  const filteredNavItems = useMemo(() => 
    NAV_ITEMS.filter(item => hasPermission(item.permission)),
    [hasPermission]
  );

  // Handle navigation with route change
  const handleNavigation = useCallback((path: string) => {
    navigate(path);
    if (isMobile) {
      onClose();
    }
  }, [navigate, isMobile, onClose]);

  // Render navigation items with proper ARIA attributes
  const renderNavItems = useCallback(() => (
    <List component="nav" aria-label="Main Navigation">
      {filteredNavItems.map(({ path, label, icon: Icon }) => (
        <StyledListItem
          key={path}
          onClick={() => handleNavigation(path)}
          selected={location.pathname === path}
          className={location.pathname === path ? 'active' : ''}
          aria-current={location.pathname === path ? 'page' : undefined}
        >
          <ListItemIcon>
            <Icon />
          </ListItemIcon>
          <ListItemText primary={label} />
        </StyledListItem>
      ))}
    </List>
  ), [filteredNavItems, location.pathname, handleNavigation]);

  return (
    <StyledDrawer
      variant={variant}
      open={open}
      onClose={onClose}
      width={width}
      anchor="left"
      ModalProps={{
        keepMounted: true // Better mobile performance
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden'
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 2
          }}
        >
          <img
            src="/logo.svg"
            alt="JetStream Logo"
            style={{ height: 32 }}
          />
          {isMobile && (
            <IconButton onClick={onClose} aria-label="Close sidebar">
              <CollapseIcon />
            </IconButton>
          )}
        </Box>

        <Divider />

        {/* Main navigation */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {renderNavItems()}
        </Box>

        <Divider />

        {/* Theme toggle */}
        <Box sx={{ p: 2 }}>
          <Tooltip title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}>
            <IconButton
              onClick={toggleTheme}
              color="inherit"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </StyledDrawer>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;