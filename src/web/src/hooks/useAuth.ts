/**
 * @fileoverview Enhanced authentication hook for JetStream web application
 * @version 1.0.0
 * 
 * Implements secure authentication state management with comprehensive security features,
 * session management, MFA support, and audit logging capabilities.
 */

import { useCallback } from 'react'; // v18.2.0
import { useAuthContext } from '../contexts/AuthContext';
import { isTokenValid, getTokenPayload, getUserRoles, hasRole } from '../utils/auth.utils';
import winston from 'winston'; // v3.8.2

// Configure security audit logger
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'useAuth-hook' },
  transports: [
    new winston.transports.File({ filename: 'auth-hook-audit.log' })
  ]
});

/**
 * Interface for device fingerprint data
 */
interface DeviceFingerprint {
  deviceId: string;
  userAgent: string;
  screenResolution: string;
  timeZone: string;
  language: string;
  platform: string;
}

/**
 * Interface for session status information
 */
interface SessionStatus {
  isValid: boolean;
  expiresAt: Date | null;
  lastActivity: Date;
  securityLevel: string;
  mfaVerified: boolean;
}

/**
 * Enhanced authentication hook providing secure authentication functionality
 * with MFA, session management, and security logging
 */
export const useAuth = () => {
  const auth = useAuthContext();

  /**
   * Enhanced login handler with security validation and logging
   */
  const login = useCallback(async (credentials: { 
    username: string; 
    password: string;
    deviceId?: string;
  }) => {
    try {
      auditLogger.info('Login attempt initiated', { 
        username: credentials.username,
        deviceId: credentials.deviceId
      });

      // Generate device fingerprint
      const deviceFingerprint = await generateDeviceFingerprint();
      
      const loginResult = await auth.login({
        email: credentials.username,
        password: credentials.password,
        deviceId: credentials.deviceId || deviceFingerprint.deviceId
      });

      auditLogger.info('Login successful', {
        username: credentials.username,
        securityLevel: loginResult.securityLevel
      });

      return loginResult;
    } catch (error) {
      auditLogger.error('Login failed', { 
        error,
        username: credentials.username
      });
      throw error;
    }
  }, [auth]);

  /**
   * Enhanced logout handler with session cleanup
   */
  const logout = useCallback(async () => {
    try {
      auditLogger.info('Logout initiated', { userId: auth.user?.id });
      await auth.logout({ notifyServer: true, clearSession: true });
      auditLogger.info('Logout completed successfully');
    } catch (error) {
      auditLogger.error('Logout failed', { error });
      throw error;
    }
  }, [auth]);

  /**
   * Enhanced MFA verification with security logging
   */
  const verifyMFA = useCallback(async (code: string): Promise<boolean> => {
    try {
      auditLogger.info('MFA verification initiated', { userId: auth.user?.id });
      const result = await auth.verifyMFA(code);
      
      auditLogger.info('MFA verification completed', {
        userId: auth.user?.id,
        success: result.verified
      });

      return result.verified;
    } catch (error) {
      auditLogger.error('MFA verification failed', { error });
      throw error;
    }
  }, [auth]);

  /**
   * Enhanced permission check with role validation
   */
  const hasPermission = useCallback((permission: string): boolean => {
    try {
      const hasPermission = auth.hasPermission(permission);
      auditLogger.debug('Permission check', {
        userId: auth.user?.id,
        permission,
        granted: hasPermission
      });
      return hasPermission;
    } catch (error) {
      auditLogger.error('Permission check failed', { error });
      return false;
    }
  }, [auth]);

  /**
   * Generate secure device fingerprint
   */
  const generateDeviceFingerprint = async (): Promise<DeviceFingerprint> => {
    return {
      deviceId: crypto.randomUUID(),
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform
    };
  };

  /**
   * Validate device fingerprint against stored value
   */
  const validateDeviceFingerprint = useCallback(async (): Promise<boolean> => {
    try {
      const currentFingerprint = await generateDeviceFingerprint();
      const storedFingerprint = auth.getSecurityContext().deviceTrust;
      
      auditLogger.info('Device fingerprint validation', {
        userId: auth.user?.id,
        matched: currentFingerprint.deviceId === storedFingerprint
      });

      return currentFingerprint.deviceId === storedFingerprint;
    } catch (error) {
      auditLogger.error('Device fingerprint validation failed', { error });
      return false;
    }
  }, [auth]);

  /**
   * Get current session status
   */
  const getSessionStatus = useCallback((): SessionStatus => {
    const securityContext = auth.getSecurityContext();
    return {
      isValid: auth.checkSessionValidity(),
      expiresAt: auth.sessionExpiry,
      lastActivity: securityContext.lastVerified,
      securityLevel: securityContext.level,
      mfaVerified: auth.mfaVerified
    };
  }, [auth]);

  /**
   * Revoke current session
   */
  const revokeSession = useCallback(async (): Promise<void> => {
    try {
      auditLogger.info('Session revocation initiated', { userId: auth.user?.id });
      await auth.logout({ notifyServer: true, clearSession: true });
      auditLogger.info('Session revoked successfully');
    } catch (error) {
      auditLogger.error('Session revocation failed', { error });
      throw error;
    }
  }, [auth]);

  return {
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
    loading: auth.loading,
    error: auth.error,
    login,
    logout,
    verifyMFA,
    hasPermission,
    refreshToken: auth.refreshToken,
    revokeSession,
    getSessionStatus,
    validateDeviceFingerprint
  };
};

export default useAuth;