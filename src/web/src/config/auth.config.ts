/**
 * @fileoverview Authentication configuration for JetStream web application
 * @version 1.0.0
 * 
 * Configures authentication settings including:
 * - Azure AD B2C OAuth2 parameters
 * - Token management
 * - Session control
 * - Role-based access control
 */

/**
 * Azure AD B2C configuration interface
 */
export interface AzureADB2CConfig {
  clientId: string;
  authority: string;
  knownAuthorities: string[];
  redirectUri: string;
  scopes: string[];
}

/**
 * Token management configuration interface
 */
export interface TokenConfig {
  storageKey: string;
  refreshBeforeExpiry: number; // seconds before expiry to refresh
  refreshInterval: number; // milliseconds between refresh checks
}

/**
 * Session management configuration interface
 */
export interface SessionConfig {
  timeout: number; // session timeout in seconds
  warningBefore: number; // seconds before timeout to show warning
  extendOnActivity: boolean;
}

/**
 * Role-based access control configuration interface
 */
export interface RoleConfig {
  roles: {
    [key: string]: string;
  };
  defaultRole: string;
}

/**
 * Azure AD B2C OAuth2 configuration
 * Uses environment variables for secure configuration
 */
export const azureADB2CConfig: AzureADB2CConfig = {
  clientId: process.env.AZURE_CLIENT_ID || '',
  authority: process.env.AZURE_AUTHORITY || '',
  knownAuthorities: [process.env.AZURE_TENANT_NAME || ''],
  redirectUri: process.env.AUTH_REDIRECT_URI || '',
  scopes: [
    'openid',
    'profile',
    'email',
    'offline_access'
  ]
};

/**
 * Token management configuration
 * Handles secure token storage and refresh strategy
 */
export const tokenConfig: TokenConfig = {
  storageKey: 'jetstream_auth_token',
  refreshBeforeExpiry: 300, // Refresh token 5 minutes before expiry
  refreshInterval: 60000 // Check token status every minute
};

/**
 * Session management configuration
 * Implements 30-minute timeout with warning
 */
export const sessionConfig: SessionConfig = {
  timeout: 1800, // 30-minute session timeout
  warningBefore: 300, // Show warning 5 minutes before timeout
  extendOnActivity: true // Extend session on user activity
};

/**
 * Role-based access control configuration
 * Defines available roles and their identifiers
 */
export const roleConfig: RoleConfig = {
  roles: {
    Operations: 'operations',
    Sales: 'sales',
    CustomerService: 'customer_service',
    Management: 'management',
    SystemAdmin: 'system_admin'
  },
  defaultRole: 'customer_service'
};

/**
 * Combined authentication configuration object
 * Exports all configuration settings for application-wide use
 */
export const authConfig = {
  azureADB2C: azureADB2CConfig,
  tokenConfig,
  sessionConfig,
  roleConfig
};

export default authConfig;