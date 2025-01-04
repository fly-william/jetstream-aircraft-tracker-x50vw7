import React, { useState, useEffect, useCallback, memo } from 'react';
import { Box, useMediaQuery, styled } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';

import TopBar from '../components/common/TopBar';
import Sidebar from '../components/common/Sidebar';
import { useTheme } from '../hooks/useTheme';

// Constants for layout configuration
const DRAWER_WIDTH = 240;
const MOBILE_BREAKPOINT = '(max-width: 600px)';
const TRANSITION_DURATION = 225;

// Styled components for layout structure
const Root = styled(Box)(({ theme }) => ({
  display: 'flex',
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  transition: `background-color ${TRANSITION_DURATION}ms ease-in-out`
}));

const Main = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'open' && prop !== 'isMobile'
})<{
  open?: boolean;
  isMobile?: boolean;
}>(({ theme, open, isMobile }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: TRANSITION_DURATION
  }),
  marginTop: 64,
  ...(open && !isMobile && {
    width: `calc(100% - ${DRAWER_WIDTH}px)`,
    marginLeft: DRAWER_WIDTH
  })
}));

// Props interface for the DashboardLayout component
interface DashboardLayoutProps {
  className?: string;
  disableDrawer?: boolean;
}

/**
 * DashboardLayout component providing the main application structure
 * with responsive sidebar, theme support, and accessibility features
 */
const DashboardLayout: React.FC<DashboardLayoutProps> = memo(({
  className,
  disableDrawer = false
}) => {
  // State management
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Hooks
  const location = useLocation();
  const { theme, isDarkMode } = useTheme();
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT);

  // Handle drawer toggle with transition state
  const handleDrawerToggle = useCallback(() => {
    setIsTransitioning(true);
    setMobileOpen(prev => !prev);
    setTimeout(() => setIsTransitioning(false), TRANSITION_DURATION);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    if (isMobile && mobileOpen) {
      setMobileOpen(false);
    }
  }, [location, isMobile]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [mobileOpen]);

  return (
    <Root className={className}>
      {/* Top navigation bar */}
      <TopBar
        onDrawerToggle={handleDrawerToggle}
        isDrawerOpen={!isMobile && !disableDrawer}
      />

      {/* Responsive sidebar */}
      {!disableDrawer && (
        <Sidebar
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          width={DRAWER_WIDTH}
          variant={isMobile ? 'temporary' : 'permanent'}
        />
      )}

      {/* Main content area */}
      <Main
        component="main"
        open={!disableDrawer && !isMobile}
        isMobile={isMobile}
        role="main"
        aria-label="Main content"
        sx={{
          opacity: isTransitioning ? 0.9 : 1,
          transition: `opacity ${TRANSITION_DURATION}ms ease-in-out`
        }}
      >
        {/* Nested route rendering */}
        <Outlet />
      </Main>
    </Root>
  );
});

// Display name for debugging
DashboardLayout.displayName = 'DashboardLayout';

export default DashboardLayout;