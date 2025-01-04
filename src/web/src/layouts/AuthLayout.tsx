/**
 * @fileoverview Enhanced authentication layout component with security features
 * @version 1.0.0
 */

import React, { useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Alert,
  useMediaQuery
} from '@mui/material'; // v5.x
import { styled, useTheme } from '@mui/material/styles'; // v5.x

import LoginForm from '../components/auth/LoginForm';
import MFAVerification from '../components/auth/MFAVerification';
import ErrorBoundary from '../components/common/ErrorBoundary';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Security status type for connection state
type SecurityStatus = 'secure' | 'insecure' | 'warning';

// Props interface
interface AuthLayoutProps {
  children: React.ReactNode;
  isLoading?: boolean;
  error?: Error | null;
  securityStatus?: SecurityStatus;
}

// Styled components with enhanced security and accessibility features
const AuthContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.default,
  position: 'relative',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2)
  }
}));

const AuthPaper = styled(Paper)(({ theme }) => ({
  width: '100%',
  maxWidth: {
    xs: '100%',
    sm: '480px'
  },
  padding: theme.spacing(4),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[3],
  position: 'relative',
  transition: 'all 0.3s ease-in-out',
  '&:focus-within': {
    boxShadow: theme.shadows[8]
  }
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  textAlign: 'center',
  color: theme.palette.primary.main,
  '& img': {
    maxWidth: 200,
    height: 'auto'
  }
}));

const SecurityIndicator = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'status'
})<{ status: SecurityStatus }>(({ theme, status }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  right: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  fontSize: '0.875rem',
  backgroundColor: {
    secure: theme.palette.success.light,
    warning: theme.palette.warning.light,
    insecure: theme.palette.error.light
  }[status],
  color: {
    secure: theme.palette.success.contrastText,
    warning: theme.palette.warning.contrastText,
    insecure: theme.palette.error.contrastText
  }[status]
}));

/**
 * Enhanced authentication layout component with security features and accessibility
 */
const AuthLayout: React.FC<AuthLayoutProps> = React.memo(({
  children,
  isLoading = false,
  error = null,
  securityStatus = 'secure'
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Monitor connection security status
  useEffect(() => {
    if (!window.isSecureContext) {
      console.error('Application is not running in a secure context');
    }
  }, []);

  return (
    <ErrorBoundary>
      <AuthContainer
        maxWidth="sm"
        component="main"
        role="main"
        aria-label="Authentication"
      >
        <AuthPaper
          elevation={3}
          component="section"
          role="region"
          aria-label="Authentication form"
        >
          {/* Security Status Indicator */}
          <SecurityIndicator 
            status={securityStatus}
            role="status"
            aria-live="polite"
          >
            {securityStatus === 'secure' && 'Secure Connection'}
            {securityStatus === 'warning' && 'Connection Warning'}
            {securityStatus === 'insecure' && 'Insecure Connection'}
          </SecurityIndicator>

          {/* Logo and Branding */}
          <LogoContainer role="banner" aria-label="JetStream Authentication">
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{ fontWeight: 600 }}
            >
              JetStream
            </Typography>
            <Typography
              variant="subtitle1"
              color="textSecondary"
              sx={{ mb: 4 }}
            >
              Aircraft Tracking & Trip Management
            </Typography>
          </LogoContainer>

          {/* Loading State */}
          {isLoading && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                zIndex: 1
              }}
            >
              <LoadingSpinner size={40} color="primary" />
            </Box>
          )}

          {/* Error Display */}
          {error && (
            <Alert
              severity="error"
              sx={{ width: '100%', mb: 3 }}
              role="alert"
            >
              {error.message}
            </Alert>
          )}

          {/* Main Content */}
          <Box
            sx={{
              width: '100%',
              opacity: isLoading ? 0.5 : 1,
              transition: 'opacity 0.3s ease-in-out'
            }}
          >
            {children}
          </Box>
        </AuthPaper>

        {/* Footer Information */}
        <Typography
          variant="body2"
          color="textSecondary"
          align="center"
          sx={{ mt: 4 }}
        >
          Protected by Azure AD B2C
        </Typography>
      </AuthContainer>
    </ErrorBoundary>
  );
});

AuthLayout.displayName = 'AuthLayout';

export default AuthLayout;