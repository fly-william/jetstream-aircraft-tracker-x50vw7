import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Container, useMediaQuery, Fade } from '@mui/material';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';

import TopBar from '../components/common/TopBar';
import Sidebar from '../components/common/Sidebar';
import { useTheme } from '../hooks/useTheme';
import ErrorBoundary from '../components/common/ErrorBoundary';

// Constants
const SIDEBAR_WIDTH = 280;
const MOBILE_SIDEBAR_WIDTH = 320;
const TOPBAR_HEIGHT = 64;

// Styled components
const Root = styled(Box)(({ theme }) => ({
  display: 'flex',
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  transition: 'all 0.3s ease-in-out'
}));

const Main = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'open' && prop !== 'isMobile'
})<{
  open?: boolean;
  isMobile?: boolean;
}>(({ theme, open, isMobile }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen
  }),
  marginLeft: isMobile ? 0 : `-${SIDEBAR_WIDTH}px`,
  ...(open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen
    }),
    marginLeft: 0
  }),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2)
  }
}));

// Props interface
interface MainLayoutProps {
  children?: React.ReactNode;
  className?: string;
}

/**
 * MainLayout component providing the base structure for the JetStream application
 * with responsive design, theme support, and accessibility features.
 */
const MainLayout: React.FC<MainLayoutProps> = React.memo(({ className }) => {
  // Hooks
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Handle sidebar toggle
  const handleSidebarToggle = useCallback(() => {
    setIsTransitioning(true);
    setIsSidebarOpen(prev => !prev);
  }, []);

  // Handle sidebar close on mobile
  const handleSidebarClose = useCallback(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  // Update sidebar state on screen resize
  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  // Handle transition end
  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => setIsTransitioning(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

  // Memoized sidebar variant
  const sidebarVariant = useMemo(() => 
    isMobile ? 'temporary' : 'permanent',
    [isMobile]
  );

  return (
    <ErrorBoundary>
      <Root className={className}>
        <TopBar 
          onMenuClick={handleSidebarToggle}
          isSidebarOpen={isSidebarOpen}
        />
        
        <Sidebar
          open={isSidebarOpen}
          onClose={handleSidebarClose}
          variant={sidebarVariant}
          width={isMobile ? MOBILE_SIDEBAR_WIDTH : SIDEBAR_WIDTH}
        />

        <Main
          open={isSidebarOpen}
          isMobile={isMobile}
          component="main"
          sx={{
            marginTop: `${TOPBAR_HEIGHT}px`,
            minHeight: `calc(100vh - ${TOPBAR_HEIGHT}px)`
          }}
        >
          <Fade in={!isTransitioning} timeout={300}>
            <Container
              maxWidth="xl"
              sx={{
                py: { xs: 2, sm: 3 },
                height: '100%'
              }}
            >
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </Container>
          </Fade>
        </Main>
      </Root>
    </ErrorBoundary>
  );
});

MainLayout.displayName = 'MainLayout';

export default MainLayout;