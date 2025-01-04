/**
 * @fileoverview Enhanced Protected Route Component with comprehensive security controls
 * @version 1.0.0
 * 
 * Implements secure route protection with authentication, authorization,
 * MFA verification, session management, and security monitoring.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom'; // v6.x
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';
import MFAVerification from './MFAVerification';
import { SecurityLogger } from '@security/logger'; // v1.x

// Configure security audit logger
const securityLogger = new SecurityLogger({
  service: 'protected-route',
  version: '1.0.0'
});

/**
 * Enhanced props interface for ProtectedRoute component
 */
interface ProtectedRouteProps {
  /** Child components to render when security checks pass */
  children: React.ReactNode;
  /** List of required permissions to access the route */
  requiredPermissions?: string[];
  /** Whether MFA verification is required */
  requireMFA?: boolean;
  /** Custom session timeout in minutes */
  sessionTimeout?: number;
  /** Security level determining additional checks */
  securityLevel?: 'standard' | 'high';
}

/**
 * Enhanced Protected Route component with comprehensive security controls
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = React.memo(({
  children,
  requiredPermissions = [],
  requireMFA = false,
  sessionTimeout = 30,
  securityLevel = 'standard'
}) => {
  // Get authentication state and security functions
  const {
    isAuthenticated,
    loading,
    hasPermission,
    validateSession,
    validateDeviceFingerprint
  } = useAuth();

  const location = useLocation();

  // Local state for security checks
  const [isPerformingSecurityChecks, setIsPerformingSecurityChecks] = useState(true);
  const [securityChecksPassed, setSecurityChecksPassed] = useState(false);
  const [requiresMFAVerification, setRequiresMFAVerification] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);

  /**
   * Perform comprehensive security checks
   */
  const performSecurityChecks = useCallback(async () => {
    try {
      // Log security check initiation
      securityLogger.info('Initiating security checks', {
        path: location.pathname,
        securityLevel,
        requireMFA
      });

      // Validate device fingerprint for high security routes
      if (securityLevel === 'high') {
        const isDeviceTrusted = await validateDeviceFingerprint();
        if (!isDeviceTrusted) {
          throw new Error('UNTRUSTED_DEVICE');
        }
      }

      // Validate session status
      const sessionValid = await validateSession();
      if (!sessionValid) {
        throw new Error('SESSION_EXPIRED');
      }

      // Check required permissions
      const hasRequiredPermissions = requiredPermissions.every(
        permission => hasPermission(permission)
      );
      if (!hasRequiredPermissions) {
        throw new Error('INSUFFICIENT_PERMISSIONS');
      }

      // Set MFA verification requirement
      if (requireMFA) {
        setRequiresMFAVerification(true);
        return;
      }

      // All checks passed
      setSecurityChecksPassed(true);
      securityLogger.info('Security checks passed', {
        path: location.pathname,
        securityLevel
      });
    } catch (error) {
      securityLogger.error('Security checks failed', {
        error,
        path: location.pathname,
        securityLevel
      });
      setSecurityError(error.message);
    } finally {
      setIsPerformingSecurityChecks(false);
    }
  }, [
    location.pathname,
    securityLevel,
    requireMFA,
    validateDeviceFingerprint,
    validateSession,
    hasPermission,
    requiredPermissions
  ]);

  /**
   * Handle successful MFA verification
   */
  const handleMFASuccess = useCallback(() => {
    setRequiresMFAVerification(false);
    setSecurityChecksPassed(true);
    securityLogger.info('MFA verification successful', {
      path: location.pathname
    });
  }, [location.pathname]);

  /**
   * Handle MFA verification cancellation
   */
  const handleMFACancel = useCallback(() => {
    setSecurityError('MFA_CANCELLED');
    securityLogger.warn('MFA verification cancelled', {
      path: location.pathname
    });
  }, [location.pathname]);

  // Perform security checks on mount and when dependencies change
  useEffect(() => {
    if (isAuthenticated && !loading) {
      performSecurityChecks();
    }
  }, [isAuthenticated, loading, performSecurityChecks]);

  // Handle loading state
  if (loading || isPerformingSecurityChecks) {
    return <LoadingSpinner size={40} overlay />;
  }

  // Handle authentication check
  if (!isAuthenticated) {
    securityLogger.warn('Unauthorized access attempt', {
      path: location.pathname
    });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Handle security errors
  if (securityError) {
    securityLogger.error('Security error encountered', {
      error: securityError,
      path: location.pathname
    });
    switch (securityError) {
      case 'SESSION_EXPIRED':
        return <Navigate to="/login" state={{ from: location }} replace />;
      case 'INSUFFICIENT_PERMISSIONS':
        return <Navigate to="/unauthorized" replace />;
      case 'UNTRUSTED_DEVICE':
        return <Navigate to="/device-verification" replace />;
      case 'MFA_CANCELLED':
        return <Navigate to="/login" replace />;
      default:
        return <Navigate to="/error" replace />;
    }
  }

  // Handle MFA verification requirement
  if (requiresMFAVerification) {
    return (
      <MFAVerification
        onSuccess={handleMFASuccess}
        onCancel={handleMFACancel}
        sessionId={crypto.randomUUID()}
      />
    );
  }

  // Render protected content when all security checks pass
  if (securityChecksPassed) {
    return <>{children}</>;
  }

  // Fallback loading state
  return <LoadingSpinner size={40} overlay />;
});

ProtectedRoute.displayName = 'ProtectedRoute';

export default ProtectedRoute;