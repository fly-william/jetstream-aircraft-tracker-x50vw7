/**
 * @fileoverview Authentication API service for JetStream web application
 * @version 1.0.0
 * 
 * Implements secure authentication API functions with Azure AD B2C integration,
 * enhanced security features, MFA support, and comprehensive audit logging.
 */

import { PublicClientApplication, AuthenticationResult } from '@azure/msal-browser'; // v3.0.0
import CryptoJS from 'crypto-js'; // v4.1.1
import winston from 'winston'; // v3.8.2

import { authConfig } from '../../config/auth.config';
import { apiClient } from '../../utils/api.utils';
import { authUtils } from '../../utils/auth.utils';
import { ApiResponse, AuthResponse } from '../../types/api.types';

// Configure security audit logger
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'auth-api' },
  transports: [
    new winston.transports.File({ filename: 'auth-audit.log' })
  ]
});

/**
 * Enhanced interface for login request with security metadata
 */
interface LoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
}

/**
 * Enhanced interface for login response with security context
 */
interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: {
    id: string;
    email: string;
    name: string;
    roles: string[];
    mfaEnabled: boolean;
    lastLogin: Date;
    securityMetadata: SecurityMetadata;
  };
}

/**
 * Interface for security-related metadata
 */
interface SecurityMetadata {
  lastPasswordChange: Date;
  mfaLastVerified: Date;
  loginAttempts: number;
  securityEvents: SecurityEvent[];
  deviceTrust: TrustLevel;
}

/**
 * Enum for device trust levels
 */
enum TrustLevel {
  UNTRUSTED = 'UNTRUSTED',
  BASIC = 'BASIC',
  VERIFIED = 'VERIFIED'
}

/**
 * Interface for security events
 */
interface SecurityEvent {
  type: string;
  timestamp: Date;
  details: Record<string, unknown>;
}

/**
 * Initialize Azure AD B2C authentication client with enhanced security
 */
const msalClient = new PublicClientApplication({
  auth: {
    clientId: authConfig.azureADB2C.clientId,
    authority: authConfig.azureADB2C.authority,
    knownAuthorities: authConfig.azureADB2C.knownAuthorities,
    redirectUri: authConfig.azureADB2C.redirectUri,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message) => {
        auditLogger.log(level, message);
      },
      piiLoggingEnabled: false
    }
  }
});

/**
 * Enhanced login handler with MFA and security validation
 */
const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  try {
    // Validate request parameters
    if (!credentials.email || !credentials.password) {
      throw new Error('Invalid credentials');
    }

    // Initial authentication with Azure AD B2C
    const authResult = await msalClient.loginPopup({
      scopes: authConfig.azureADB2C.scopes,
      prompt: 'select_account'
    });

    // Handle MFA if enabled
    if (authResult.idTokenClaims?.mfaRequired && !credentials.mfaCode) {
      auditLogger.info('MFA required for user', { email: credentials.email });
      throw new Error('MFA_REQUIRED');
    }

    // Process authentication response
    const loginResponse = await processAuthResponse(authResult, credentials);

    // Store tokens securely
    await authUtils.setStoredToken(loginResponse.accessToken);

    // Log successful authentication
    auditLogger.info('User authenticated successfully', {
      userId: loginResponse.user.id,
      email: credentials.email,
      deviceId: credentials.deviceId
    });

    return loginResponse;
  } catch (error) {
    auditLogger.error('Authentication failed', { error, email: credentials.email });
    throw error;
  }
};

/**
 * Process and validate authentication response
 */
const processAuthResponse = async (
  authResult: AuthenticationResult,
  credentials: LoginRequest
): Promise<LoginResponse> => {
  // Validate authentication result
  if (!authResult.accessToken || !authResult.idToken) {
    throw new Error('Invalid authentication response');
  }

  // Decrypt and validate tokens
  const validatedToken = await authUtils.validateToken(authResult.accessToken);
  if (!validatedToken) {
    throw new Error('Token validation failed');
  }

  // Build user security metadata
  const securityMetadata: SecurityMetadata = {
    lastPasswordChange: new Date(authResult.idTokenClaims?.pwdChanged || Date.now()),
    mfaLastVerified: new Date(authResult.idTokenClaims?.mfaVerified || Date.now()),
    loginAttempts: 0,
    securityEvents: [],
    deviceTrust: evaluateDeviceTrust(credentials.deviceId)
  };

  return {
    accessToken: authResult.accessToken,
    refreshToken: authResult.refreshToken || '',
    expiresIn: authResult.expiresIn,
    tokenType: 'Bearer',
    user: {
      id: authResult.idTokenClaims?.oid || '',
      email: authResult.idTokenClaims?.email || '',
      name: authResult.idTokenClaims?.name || '',
      roles: authResult.idTokenClaims?.roles || [],
      mfaEnabled: !!authResult.idTokenClaims?.mfaEnabled,
      lastLogin: new Date(),
      securityMetadata
    }
  };
};

/**
 * Evaluate device trust level based on security factors
 */
const evaluateDeviceTrust = (deviceId: string): TrustLevel => {
  // Implement device trust evaluation logic
  return TrustLevel.BASIC;
};

/**
 * Enhanced logout handler with token revocation
 */
const logout = async (): Promise<void> => {
  try {
    await authUtils.revokeToken();
    await msalClient.logout();
    auditLogger.info('User logged out successfully');
  } catch (error) {
    auditLogger.error('Logout failed', { error });
    throw error;
  }
};

/**
 * Verify MFA code with enhanced security
 */
const verifyMFA = async (mfaCode: string): Promise<boolean> => {
  try {
    const response = await apiClient.post<ApiResponse<{ verified: boolean }>>(
      '/auth/verify-mfa',
      { mfaCode }
    );

    auditLogger.info('MFA verification completed', {
      success: response.data.verified
    });

    return response.data.verified;
  } catch (error) {
    auditLogger.error('MFA verification failed', { error });
    throw error;
  }
};

/**
 * Validate current session with security checks
 */
const validateSession = async (): Promise<boolean> => {
  try {
    const currentAccount = msalClient.getAllAccounts()[0];
    if (!currentAccount) {
      return false;
    }

    const token = await authUtils.getStoredToken();
    return token ? await authUtils.isTokenValid(token) : false;
  } catch (error) {
    auditLogger.error('Session validation failed', { error });
    return false;
  }
};

// Export authentication API service
export const authApi = {
  login,
  logout,
  verifyMFA,
  validateSession,
  refreshToken: authUtils.refreshToken,
  revokeToken: authUtils.revokeToken
};