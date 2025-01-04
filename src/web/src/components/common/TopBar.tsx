import React, { useState, useCallback, memo } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Avatar,
  Box,
  CircularProgress,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  Brightness4,
  Brightness7,
  AccountCircle,
  Settings,
  ExitToApp,
  Person
} from '@mui/icons-material';

import { useAuth } from '../../hooks/useAuth';
import { useTheme as useAppTheme } from '../../hooks/useTheme';
import NotificationBell from '../notifications/NotificationBell';

/**
 * TopBar component that renders the main navigation bar with user controls,
 * theme switching, and notifications.
 */
const TopBar = memo(() => {
  // State management
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Hooks
  const theme = useTheme();
  const { mode, toggleTheme, isSystemTheme } = useAppTheme();
  const { user, logout, isLoading } = useAuth();

  // Menu handlers
  const handleUserMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleUserMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  // Logout handler with loading state
  const handleLogout = useCallback(async () => {
    try {
      setIsLoggingOut(true);
      handleUserMenuClose();
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  }, [logout, handleUserMenuClose]);

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: theme.zIndex.drawer + 1,
        transition: theme.transitions.create(['margin', 'width'], {
          duration: theme.transitions.duration.leavingScreen
        })
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: theme.spacing(0, 2),
          minHeight: 64
        }}
      >
        {/* App Title */}
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{
            display: { xs: 'none', sm: 'block' },
            fontWeight: 600
          }}
        >
          JetStream
        </Typography>

        {/* Right-side controls */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing(2),
            '@media (max-width: 600px)': {
              gap: theme.spacing(1)
            }
          }}
        >
          {/* Notification Bell */}
          <NotificationBell />

          {/* Theme Toggle */}
          <Tooltip title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}>
            <IconButton
              color="inherit"
              onClick={toggleTheme}
              aria-label="toggle theme"
              size="large"
            >
              {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Tooltip>

          {/* User Menu */}
          <Tooltip title="Account settings">
            <IconButton
              color="inherit"
              onClick={handleUserMenuOpen}
              aria-label="user account"
              aria-controls="user-menu"
              aria-haspopup="true"
              aria-expanded={Boolean(anchorEl)}
              size="large"
            >
              {user?.photoURL ? (
                <Avatar
                  src={user.photoURL}
                  alt={user.name || 'User avatar'}
                  sx={{ width: 32, height: 32 }}
                />
              ) : (
                <AccountCircle />
              )}
            </IconButton>
          </Tooltip>

          {/* User Menu Dropdown */}
          <Menu
            id="user-menu"
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleUserMenuClose}
            onClick={handleUserMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              elevation: 4,
              sx: {
                minWidth: 200,
                mt: 1.5
              }
            }}
          >
            {/* User Info */}
            <MenuItem disabled>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person fontSize="small" />
                <Typography variant="body2">{user?.name || 'User'}</Typography>
              </Box>
            </MenuItem>

            {/* Settings */}
            <MenuItem onClick={handleUserMenuClose}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Settings fontSize="small" />
                <Typography>Settings</Typography>
              </Box>
            </MenuItem>

            {/* Logout */}
            <MenuItem
              onClick={handleLogout}
              disabled={isLoggingOut || isLoading}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isLoggingOut ? (
                  <CircularProgress size={20} />
                ) : (
                  <ExitToApp fontSize="small" />
                )}
                <Typography>Logout</Typography>
              </Box>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
});

TopBar.displayName = 'TopBar';

export default TopBar;