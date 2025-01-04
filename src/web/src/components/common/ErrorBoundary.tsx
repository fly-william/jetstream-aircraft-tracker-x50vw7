import React from 'react'; // react v18.2.0
import { Box, Typography } from '@mui/material'; // @mui/material v5.x
import AlertDialog from './AlertDialog';

// Constants for error handling
const DEFAULT_ERROR_MESSAGE = 'An unexpected error has occurred. Our operations team has been notified. Please try again or contact support if the problem persists.';

const ERROR_SEVERITY_LEVELS = {
  CRITICAL: 'error',
  WARNING: 'warning',
  INFO: 'info'
} as const;

const ERROR_BOUNDARY_TEST_ID = 'error-boundary-fallback';

// Props interface with support for custom fallback UI and error handling
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

// State interface for error tracking
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary component that catches JavaScript errors in child components,
 * logs them, and displays a fallback UI with aviation-themed styling.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  /**
   * Static method to update state when an error occurs
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  /**
   * Lifecycle method for error logging and monitoring
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Update state with error info
    this.setState({
      errorInfo
    });

    // Format error details for logging
    const errorDetails = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    };

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', errorDetails);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Reset error state to allow retry
   */
  handleErrorReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  /**
   * Render error UI or children based on error state
   */
  render(): React.ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Return custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI with AlertDialog
      return (
        <Box
          data-testid={ERROR_BOUNDARY_TEST_ID}
          role="alert"
          aria-live="polite"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200,
            p: 3
          }}
        >
          <AlertDialog
            open={true}
            title="System Error"
            message={
              <Box>
                <Typography variant="body1" gutterBottom>
                  {error?.message || DEFAULT_ERROR_MESSAGE}
                </Typography>
                {process.env.NODE_ENV === 'development' && (
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{
                      mt: 2,
                      p: 2,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                      overflow: 'auto',
                      maxHeight: 200
                    }}
                  >
                    {error?.stack}
                  </Typography>
                )}
              </Box>
            }
            severity={ERROR_SEVERITY_LEVELS.CRITICAL}
            onClose={this.handleErrorReset}
            closeButtonText="Try Again"
            disableBackdropClick={true}
            autoFocus={true}
          />
        </Box>
      );
    }

    // Render children when no error
    return children;
  }
}

export default ErrorBoundary;