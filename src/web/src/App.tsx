import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { ErrorBoundary } from 'react-error-boundary';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Providers
import { AuthProvider } from './contexts/AuthContext';
import { ThemeContextProvider } from './contexts/ThemeContext';

// Lazy loaded components for better performance
const Login = React.lazy(() => import('./components/auth/LoginForm'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const AircraftTracking = React.lazy(() => import('./pages/AircraftTracking'));
const TripManagement = React.lazy(() => import('./pages/TripManagement'));

// Initialize Application Insights
const appInsights = new ApplicationInsights({
  config: {
    connectionString: process.env.REACT_APP_APPINSIGHTS_CONNECTION_STRING,
    enableAutoRouteTracking: true,
    enableCorsCorrelation: true,
    enableRequestHeaderTracking: true,
    enableResponseHeaderTracking: true,
    enableAjaxErrorStatusText: true
  }
});

/**
 * Root application component that orchestrates routing, authentication,
 * theme management, and error handling for the JetStream platform.
 */
const App: React.FC = () => {
  // Initialize monitoring and analytics
  useEffect(() => {
    appInsights.loadAppInsights();
    appInsights.trackPageView();
  }, []);

  // Global error handler
  const handleError = (error: Error, info: { componentStack: string }) => {
    appInsights.trackException({ error, severityLevel: 3 });
    console.error('Application error:', error, info);
  };

  return (
    <ErrorBoundary
      onError={handleError}
      fallback={
        <div>
          An unexpected error has occurred. Please refresh the page or contact support.
        </div>
      }
    >
      <ThemeContextProvider>
        <AuthProvider>
          <BrowserRouter>
            <CssBaseline />
            <Suspense fallback={<div>Loading...</div>}>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={
                  <AuthLayout>
                    <Login />
                  </AuthLayout>
                } />

                {/* Protected routes */}
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  
                  {/* Dashboard routes */}
                  <Route path="dashboard" element={
                    <RequireAuth>
                      <DashboardLayout>
                        <Dashboard />
                      </DashboardLayout>
                    </RequireAuth>
                  } />

                  {/* Aircraft tracking routes */}
                  <Route path="aircraft-tracking" element={
                    <RequireAuth roles={['Operations', 'Sales']}>
                      <DashboardLayout>
                        <AircraftTracking />
                      </DashboardLayout>
                    </RequireAuth>
                  } />

                  {/* Trip management routes */}
                  <Route path="trip-management" element={
                    <RequireAuth roles={['Operations']}>
                      <DashboardLayout>
                        <TripManagement />
                      </DashboardLayout>
                    </RequireAuth>
                  } />

                  {/* Catch-all route */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ThemeContextProvider>
    </ErrorBoundary>
  );
};

/**
 * Higher-order component for protecting routes with authentication
 * and role-based access control
 */
interface RequireAuthProps {
  children: React.ReactNode;
  roles?: string[];
}

const RequireAuth: React.FC<RequireAuthProps> = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.some(role => user?.roles.includes(role))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default App;