import React from 'react'; // v18.2.0
import ReactDOM from 'react-dom/client'; // v18.2.0
import { CssBaseline } from '@mui/material'; // v5.x
import { ApplicationInsights } from '@microsoft/applicationinsights-web'; // v2.x
import { ErrorBoundary } from 'react-error-boundary'; // v4.x

import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Initialize Azure Application Insights for monitoring
const appInsights = new ApplicationInsights({
  config: {
    connectionString: process.env.REACT_APP_MONITORING_KEY,
    enableAutoRouteTracking: true,
    enableCorsCorrelation: true,
    enableRequestHeaderTracking: true,
    enableResponseHeaderTracking: true,
    enableAjaxErrorStatusText: true,
    maxBatchSize: 250,
    maxBatchInterval: 5000,
    disableFetchTracking: false,
    disableExceptionTracking: false,
    enableUnhandledPromiseRejectionTracking: true
  }
});

/**
 * Initialize monitoring and error tracking
 */
const initializeMonitoring = (): void => {
  if (process.env.NODE_ENV === 'production') {
    appInsights.loadAppInsights();
    appInsights.trackPageView();
  }
};

/**
 * Global error handler for uncaught errors
 */
const handleError = (error: Error, info: { componentStack: string }): void => {
  appInsights.trackException({
    error: error,
    severityLevel: 3,
    properties: {
      componentStack: info.componentStack,
      environment: process.env.NODE_ENV
    }
  });
  console.error('Application error:', error, info);
};

/**
 * Render the root application with all necessary providers
 */
const renderApp = (): void => {
  // Initialize monitoring
  initializeMonitoring();

  // Get root element
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  // Create React root
  const root = ReactDOM.createRoot(rootElement);

  // Render application with strict mode and error boundary
  root.render(
    <React.StrictMode>
      <ErrorBoundary
        onError={handleError}
        fallback={
          <div role="alert">
            An unexpected error has occurred. Please refresh the page or contact support.
          </div>
        }
      >
        <ThemeProvider>
          <AuthProvider>
            <CssBaseline />
            <App />
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );

  // Cleanup on unmount
  return () => {
    root.unmount();
  };
};

// Initialize the application
renderApp();

// Enable hot module replacement in development
if (import.meta.hot) {
  import.meta.hot.accept();
}