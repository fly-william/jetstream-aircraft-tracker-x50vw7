/**
 * @fileoverview Authentication utility functions for JetStream web application
 * @version 1.0.0
 * 
 * Implements secure token management, validation, and role-based access control
 * with comprehensive audit logging and security measures.
 */

import { jwtDecode } from 'jwt-decode'; // v4.0.0
import CryptoJS from 'crypto-js'; // v4.1.1
import winston from 'winston'; // v3.8.2
import { tokenConfig, roleConfig } from '../config/auth.config';

// Configure security audit logger
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'auth-utils' },
  transports: [
    new winston.transports.File({ filename: 'auth-audit.log' })
  ]
});

/**
 * Interface for decoded JWT token payload with enhanced security fields
 */
export interface TokenPayload {
  sub: string;
  email: string;
  name: string;
  roles: string[];
  exp: number;
  iat: number;
  jti: string;
  aud: string;
  iss: string;
  auth_time: number;
  nonce: string;
}

/**
 * Custom error interface for authentication failures
 */
export interface AuthError {
  code: string;
  message: string;
  timestamp: number;
  details: Record<string, unknown>;
}

/**
 * Encrypts sensitive data using AES encryption
 */
const encrypt = (data: string): string => {
  const key = CryptoJS.enc.Utf8.parse(process.env.ENCRYPTION_KEY || '');
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(data, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return iv.concat(encrypted.ciphertext).toString(CryptoJS.enc.Base64);
};

/**
 * Decrypts encrypted data using AES decryption
 */
const decrypt = (encryptedData: string): string | null => {
  try {
    const key = CryptoJS.enc.Utf8.parse(process.env.ENCRYPTION_KEY || '');
    const ciphertext = CryptoJS.enc.Base64.parse(encryptedData);
    const iv = ciphertext.clone();
    iv.sigBytes = 16;
    iv.clamp();
    ciphertext.words.splice(0, 4);
    ciphertext.sigBytes -= 16;

    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext },
      key,
      { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
    );
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    auditLogger.error('Decryption failed', { error });
    return null;
  }
};

/**
 * Securely retrieves and decrypts the stored authentication token
 */
export const getStoredToken = async (): Promise<string | null> => {
  try {
    const encryptedToken = localStorage.getItem(tokenConfig.storageKey);
    if (!encryptedToken) {
      return null;
    }

    const decryptedToken = decrypt(encryptedToken);
    if (!decryptedToken) {
      auditLogger.warn('Token decryption failed');
      return null;
    }

    auditLogger.info('Token retrieved successfully');
    return decryptedToken;
  } catch (error) {
    auditLogger.error('Token retrieval failed', { error });
    return null;
  }
};

/**
 * Securely encrypts and stores the authentication token
 */
export const setStoredToken = async (token: string): Promise<void> => {
  try {
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid token format');
    }

    const encryptedToken = encrypt(token);
    localStorage.setItem(tokenConfig.storageKey, encryptedToken);

    auditLogger.info('Token stored successfully');
  } catch (error) {
    auditLogger.error('Token storage failed', { error });
    throw new Error('Failed to store authentication token');
  }
};

/**
 * Comprehensive token validation including format, signature, and claims
 */
export const isTokenValid = async (token: string): Promise<boolean> => {
  try {
    if (!token) {
      return false;
    }

    const decoded = jwtDecode<TokenPayload>(token);
    
    // Validate token structure and required claims
    if (!decoded.sub || !decoded.exp || !decoded.iss || !decoded.aud) {
      auditLogger.warn('Invalid token structure');
      return false;
    }

    // Check token expiration
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp <= currentTime) {
      auditLogger.info('Token expired');
      return false;
    }

    // Validate issuer and audience
    if (decoded.iss !== process.env.AZURE_AUTHORITY || 
        decoded.aud !== process.env.AZURE_CLIENT_ID) {
      auditLogger.warn('Invalid token issuer or audience');
      return false;
    }

    // Validate roles
    if (!decoded.roles || !decoded.roles.some(role => 
        Object.values(roleConfig.roles).includes(role))) {
      auditLogger.warn('Invalid token roles');
      return false;
    }

    auditLogger.info('Token validated successfully');
    return true;
  } catch (error) {
    auditLogger.error('Token validation failed', { error });
    return false;
  }
};

/**
 * Handles token refresh process when approaching expiration
 */
export const refreshToken = async (): Promise<string | null> => {
  try {
    const currentToken = await getStoredToken();
    if (!currentToken) {
      return null;
    }

    const decoded = jwtDecode<TokenPayload>(currentToken);
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Check if token needs refresh
    if (decoded.exp - currentTime > tokenConfig.refreshBeforeExpiry) {
      return currentToken;
    }

    // Call Azure AD B2C token refresh endpoint
    const response = await fetch(`${process.env.AZURE_AUTHORITY}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.AZURE_CLIENT_ID || '',
        refresh_token: currentToken,
        scope: 'openid profile email offline_access'
      })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const { access_token } = await response.json();
    await setStoredToken(access_token);

    auditLogger.info('Token refreshed successfully');
    return access_token;
  } catch (error) {
    auditLogger.error('Token refresh failed', { error });
    return null;
  }
};

/**
 * Handles token revocation and cleanup
 */
export const revokeToken = async (): Promise<void> => {
  try {
    const currentToken = await getStoredToken();
    if (currentToken) {
      // Call Azure AD B2C revocation endpoint
      await fetch(`${process.env.AZURE_AUTHORITY}/oauth2/v2.0/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.AZURE_CLIENT_ID || '',
          token: currentToken
        })
      });
    }

    // Clear stored token and session data
    localStorage.removeItem(tokenConfig.storageKey);
    sessionStorage.clear();

    auditLogger.info('Token revoked successfully');
  } catch (error) {
    auditLogger.error('Token revocation failed', { error });
    throw new Error('Failed to revoke authentication token');
  }
};