/**
 * @fileoverview Enhanced login page component with Azure AD B2C integration
 * @version 1.0.0
 * 
 * Implements secure authentication with MFA support, session management,
 * device fingerprinting, and comprehensive security logging.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // v6.x
import FingerprintJS from '@fingerprintjs/fingerprintjs'; // v3.x

// Internal imports
import AuthLayout from '../layouts/AuthLayout';
import LoginForm from '../components/auth/LoginForm';
import { useAuth } from '../hooks/useAuth';
import AlertDialog from '../components/common/AlertDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Security states for the login process
enum SecurityState {
  INITIAL = 'INITIAL',
  VERIFYING = 'VERIFYING',
  MFA_REQUIRED = 'MFA_REQUIRED',
  DEVICE_VERIFICATION = 'DEVICE_VERIFICATION',
  ERROR = 'ERROR'
}

/**
 * Enhanced login page component with comprehensive security features
 */
const LoginPage: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const { 
    isAuthenticated, 
    login, 
    verifyMFA, 
    error: authError,
    loading: authLoading 
  } = useAuth();

  // State management
  const [securityState, setSecurityState] = useState<SecurityState>(SecurityState.INITIAL);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);

  // Constants for security controls
  const MAX_LOGIN_ATTEMPTS = 3;
  const BLOCK_DURATION = 300000; // 5 minutes

  // Initialize device fingerprinting on mount
  useEffect(() => {
    const initializeFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        setDeviceFingerprint(result.visitorId);
      } catch (error) {
        console.error('Device fingerprint generation failed:', error);
        setError('Security verification failed. Please try again.');
      }
    };

    initializeFingerprint();
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Reset block after duration
  useEffect(() => {
    if (isBlocked) {
      const timer = setTimeout(() => {
        setIsBlocked(false);
        setLoginAttempts(0);
      }, BLOCK_DURATION);

      return () => clearTimeout(timer);
    }
  }, [isBlocked]);

  /**
   * Enhanced login success handler with security validation
   */
  const handleLoginSuccess = useCallback(async (result: any) => {
    try {
      if (result.mfaRequired) {
        setSecurityState(SecurityState.MFA_REQUIRED);
        return;
      }

      if (!deviceFingerprint) {
        setError('Device verification failed. Please try again.');
        return;
      }

      // Reset security state on successful login
      setSecurityState(SecurityState.INITIAL);
      setLoginAttempts(0);
      setError(null);

      navigate('/dashboard');
    } catch (error) {
      console.error('Login success handling failed:', error);
      setError('An error occurred during login. Please try again.');
    }
  }, [deviceFingerprint, navigate]);

  /**
   * Enhanced login error handler with rate limiting
   */
  const handleLoginError = useCallback((error: Error) => {
    setLoginAttempts(prev => {
      const newAttempts = prev + 1;
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        setIsBlocked(true);
        setError(`Maximum login attempts exceeded. Please try again in ${BLOCK_DURATION / 60000} minutes.`);
      } else {
        setError(`Login failed. ${MAX_LOGIN_ATTEMPTS - newAttempts} attempts remaining.`);
      }
      return newAttempts;
    });
    setSecurityState(SecurityState.ERROR);
  }, []);

  /**
   * Handle MFA verification completion
   */
  const handleMFAComplete = useCallback(async (verified: boolean) => {
    if (verified) {
      setSecurityState(SecurityState.INITIAL);
      navigate('/dashboard');
    } else {
      setError('MFA verification failed. Please try again.');
      setSecurityState(SecurityState.ERROR);
    }
  }, [navigate]);

  /**
   * Reset error state and security status
   */
  const handleErrorClose = useCallback(() => {
    setError(null);
    if (!isBlocked) {
      setSecurityState(SecurityState.INITIAL);
    }
  }, [isBlocked]);

  // Determine current security status for layout
  const securityStatus = isBlocked ? 'insecure' : error ? 'warning' : 'secure';

  return (
    <AuthLayout
      isLoading={authLoading}
      error={error ? new Error(error) : null}
      securityStatus={securityStatus}
    >
      {securityState === SecurityState.MFA_REQUIRED ? (
        <MFAVerification
          onSuccess={() => handleMFAComplete(true)}
          onCancel={() => setSecurityState(SecurityState.INITIAL)}
          sessionId={deviceFingerprint || ''}
        />
      ) : (
        <LoginForm
          onSuccess={handleLoginSuccess}
          rememberMe={false}
        />
      )}

      <AlertDialog
        open={!!error}
        title="Authentication Error"
        message={error || ''}
        severity="error"
        onClose={handleErrorClose}
        closeButtonText="Close"
        disableBackdropClick={isBlocked}
      />
    </AuthLayout>
  );
});

LoginPage.displayName = 'LoginPage';

export default LoginPage;