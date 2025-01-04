/**
 * @fileoverview Enhanced Authentication Context Provider for JetStream
 * @version 1.0.0
 * 
 * Implements secure authentication state management with comprehensive security features,
 * session management, MFA support, and audit logging capabilities.
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'; // v18.2.0
import winston from 'winston'; // v3.10.0

import { authApi } from '../services/api/auth.api';
import { getStoredToken, isTokenValid, getTokenPayload, getUserRoles, hasRole } from '../utils/auth.utils';
import { authConfig } from '../config/auth.config';

// Configure security audit logger
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'auth-context' },
  transports: [
    new winston.transports.File({ filename: 'auth-context-audit.log' })
  ]
});

/**
 * Enhanced security level enumeration
 */
enum SecurityLevel {
  NONE = 'NONE',
  BASIC = 'BASIC',
  MFA = 'MFA',
  ELEVATED = 'ELEVATED'
}

/**
 * Interface for user profile with security metadata
 */
interface UserProfile {
  id: string;
  email: string;
  name: string;
  roles: string[];
  mfaEnabled: boolean;
  lastLogin: Date;
  securityMetadata: {
    lastPasswordChange: Date;
    mfaLastVerified: Date;
    loginAttempts: number;
    deviceTrust: string;
  };
}

/**
 * Interface for authentication credentials
 */
interface AuthCredentials {
  email: string;
  password: string;
  mfaCode?: string;
  deviceId: string;
}

/**
 * Interface for authentication result
 */
interface AuthResult {
  success: boolean;
  user: UserProfile | null;
  securityLevel: SecurityLevel;
  sessionExpiry: Date;
}

/**
 * Interface for MFA verification result
 */
interface MFAVerificationResult {
  verified: boolean;
  expiry: Date;
}

/**
 * Interface for logout options
 */
interface LogoutOptions {
  clearSession?: boolean;
  notifyServer?: boolean;
}

/**
 * Interface for security context
 */
interface SecurityContext {
  level: SecurityLevel;
  lastVerified: Date;
  deviceTrust: string;
  sessionValid: boolean;
}

/**
 * Enhanced authentication context state interface
 */
interface AuthContextState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  loading: boolean;
  error: Error | null;
  sessionExpiry: Date | null;
  mfaRequired: boolean;
  mfaVerified: boolean;
  securityLevel: SecurityLevel;
  lastActivity: Date;
}

/**
 * Enhanced authentication context value interface
 */
interface AuthContextValue extends AuthContextState {
  login: (credentials: AuthCredentials) => Promise<AuthResult>;
  logout: (options?: LogoutOptions) => Promise<void>;
  refreshToken: () => Promise<boolean>;
  verifyMFA: (code: string) => Promise<MFAVerificationResult>;
  hasPermission: (permission: string) => boolean;
  checkSessionValidity: () => boolean;
  extendSession: () => Promise<boolean>;
  getSecurityContext: () => SecurityContext;
}

// Create the authentication context
const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Enhanced Authentication Provider Component
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthContextState>({
    isAuthenticated: false,
    user: null,
    loading: true,
    error: null,
    sessionExpiry: null,
    mfaRequired: false,
    mfaVerified: false,
    securityLevel: SecurityLevel.NONE,
    lastActivity: new Date()
  });

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = await getStoredToken();
        if (token && await isTokenValid(token)) {
          const user = getTokenPayload(token);
          setState(prev => ({
            ...prev,
            isAuthenticated: true,
            user,
            sessionExpiry: new Date(user.exp * 1000),
            securityLevel: user.mfaEnabled ? SecurityLevel.MFA : SecurityLevel.BASIC
          }));
        }
      } catch (error) {
        auditLogger.error('Auth initialization failed', { error });
      } finally {
        setState(prev => ({ ...prev, loading: false }));
      }
    };

    initializeAuth();
  }, []);

  // Session monitoring
  useEffect(() => {
    const sessionCheckInterval = setInterval(() => {
      if (state.isAuthenticated) {
        const isValid = checkSessionValidity();
        if (!isValid) {
          handleSessionExpiration();
        }
      }
    }, authConfig.sessionConfig.refreshInterval);

    return () => clearInterval(sessionCheckInterval);
  }, [state.isAuthenticated]);

  // Enhanced login handler
  const login = async (credentials: AuthCredentials): Promise<AuthResult> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await authApi.login(credentials);
      const sessionExpiry = new Date(Date.now() + authConfig.sessionConfig.timeout * 1000);
      
      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        user: response.user,
        sessionExpiry,
        mfaRequired: response.user.mfaEnabled,
        securityLevel: SecurityLevel.BASIC,
        lastActivity: new Date()
      }));

      auditLogger.info('Login successful', {
        userId: response.user.id,
        securityLevel: SecurityLevel.BASIC
      });

      return {
        success: true,
        user: response.user,
        securityLevel: SecurityLevel.BASIC,
        sessionExpiry
      };
    } catch (error) {
      auditLogger.error('Login failed', { error, email: credentials.email });
      setState(prev => ({ ...prev, error: error as Error }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  // Enhanced MFA verification
  const verifyMFA = async (code: string): Promise<MFAVerificationResult> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const verified = await authApi.verifyMFA(code);
      if (verified) {
        setState(prev => ({
          ...prev,
          mfaVerified: true,
          securityLevel: SecurityLevel.MFA,
          lastActivity: new Date()
        }));

        auditLogger.info('MFA verification successful', {
          userId: state.user?.id,
          securityLevel: SecurityLevel.MFA
        });

        return {
          verified: true,
          expiry: new Date(Date.now() + authConfig.sessionConfig.timeout * 1000)
        };
      }
      throw new Error('MFA verification failed');
    } catch (error) {
      auditLogger.error('MFA verification failed', { error, userId: state.user?.id });
      setState(prev => ({ ...prev, error: error as Error }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  // Enhanced logout handler
  const logout = async (options: LogoutOptions = {}): Promise<void> => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      if (options.notifyServer) {
        await authApi.logout();
      }

      setState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null,
        sessionExpiry: null,
        mfaRequired: false,
        mfaVerified: false,
        securityLevel: SecurityLevel.NONE,
        lastActivity: new Date()
      });

      auditLogger.info('Logout successful', { userId: state.user?.id });
    } catch (error) {
      auditLogger.error('Logout failed', { error, userId: state.user?.id });
      throw error;
    }
  };

  // Session validity check
  const checkSessionValidity = useCallback((): boolean => {
    if (!state.sessionExpiry) return false;
    
    const currentTime = new Date();
    const sessionValid = currentTime < state.sessionExpiry;
    
    if (!sessionValid) {
      auditLogger.warn('Session expired', { userId: state.user?.id });
    }
    
    return sessionValid;
  }, [state.sessionExpiry, state.user]);

  // Session extension handler
  const extendSession = async (): Promise<boolean> => {
    try {
      const extended = await authApi.refreshToken();
      if (extended) {
        setState(prev => ({
          ...prev,
          sessionExpiry: new Date(Date.now() + authConfig.sessionConfig.timeout * 1000),
          lastActivity: new Date()
        }));
        return true;
      }
      return false;
    } catch (error) {
      auditLogger.error('Session extension failed', { error, userId: state.user?.id });
      return false;
    }
  };

  // Permission check handler
  const hasPermission = (permission: string): boolean => {
    return state.user ? hasRole(state.user.roles, permission) : false;
  };

  // Security context getter
  const getSecurityContext = (): SecurityContext => ({
    level: state.securityLevel,
    lastVerified: state.lastActivity,
    deviceTrust: state.user?.securityMetadata.deviceTrust || 'UNTRUSTED',
    sessionValid: checkSessionValidity()
  });

  // Session expiration handler
  const handleSessionExpiration = async () => {
    auditLogger.warn('Session expired, logging out', { userId: state.user?.id });
    await logout({ notifyServer: true });
  };

  const contextValue: AuthContextValue = {
    ...state,
    login,
    logout,
    refreshToken: extendSession,
    verifyMFA,
    hasPermission,
    checkSessionValidity,
    extendSession,
    getSecurityContext
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Enhanced hook for using authentication context
 */
export const useAuthContext = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;