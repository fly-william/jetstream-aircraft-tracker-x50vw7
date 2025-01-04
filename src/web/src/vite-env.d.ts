/// <reference types="vite/client" />

/**
 * Type definitions for Vite environment variables used in JetStream frontend
 * @version 4.4.0
 */

/**
 * Environment variable interface for type-safe configuration access
 * Contains sensitive configuration values that must be properly secured
 */
interface ImportMetaEnv {
  /** Backend API endpoint URL for service communication */
  readonly VITE_API_URL: string;
  
  /** WebSocket endpoint URL for real-time updates */
  readonly VITE_WS_URL: string;
  
  /** MapboxGL authentication token for map visualization */
  readonly VITE_MAPBOX_TOKEN: string;
  
  /** Azure AD B2C client identifier for authentication */
  readonly VITE_AZURE_CLIENT_ID: string;
  
  /** Azure AD B2C tenant identifier for authentication */
  readonly VITE_AZURE_TENANT_ID: string;
}

/**
 * Augment the ImportMeta interface to include env
 * Provides type safety for import.meta.env usage throughout the application
 */
interface ImportMeta {
  /** Environment variables accessible via import.meta.env */
  readonly env: ImportMetaEnv;
}