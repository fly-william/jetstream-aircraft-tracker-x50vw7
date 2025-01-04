import React, { useEffect } from 'react';
import { Box, Typography, Button, Container, Fade } from '@mui/material'; // @mui/material v5.x
import { useNavigate } from 'react-router-dom'; // react-router-dom v6.x
import { Analytics } from '@segment/analytics-next'; // @segment/analytics-next v1.x

import PageHeader from '../components/common/PageHeader';
import { useTheme } from '../hooks/useTheme';

// Initialize analytics
const analytics = new Analytics({
  writeKey: process.env.REACT_APP_SEGMENT_WRITE_KEY || ''
});

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    // Track page view
    analytics.track('404_Page_Viewed', {
      path: window.location.pathname,
      referrer: document.referrer
    });
  }, []);

  const handleReturnToDashboard = () => {
    analytics.track('404_Return_To_Dashboard_Clicked', {
      path: window.location.pathname
    });
    navigate('/');
  };

  return (
    <Fade in timeout={300}>
      <Container maxWidth="lg">
        <PageHeader
          title="Page Not Found"
          breadcrumbs={[
            { label: 'Home', path: '/' },
            { label: '404 Error', path: window.location.pathname }
          ]}
        />
        
        <Box
          component="main"
          role="main"
          aria-labelledby="404-title"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: `calc(100vh - ${theme.spacing(16)})`,
            textAlign: 'center',
            padding: theme.spacing(3),
            transition: 'all 0.3s ease-in-out'
          }}
        >
          <Typography
            id="404-title"
            variant="h1"
            component="h1"
            gutterBottom
            sx={{
              color: theme.palette.error.main,
              marginBottom: theme.spacing(2),
              fontSize: {
                xs: '2rem',
                sm: '2.5rem',
                md: '3rem'
              },
              fontWeight: 'bold',
              transition: 'color 0.3s ease-in-out'
            }}
          >
            404
          </Typography>

          <Typography
            variant="h4"
            component="h2"
            gutterBottom
            sx={{
              color: theme.palette.text.secondary,
              marginBottom: theme.spacing(4),
              maxWidth: '600px',
              transition: 'color 0.3s ease-in-out'
            }}
          >
            The page you're looking for cannot be found.
          </Typography>

          <Typography
            variant="body1"
            paragraph
            sx={{
              color: theme.palette.text.secondary,
              marginBottom: theme.spacing(4),
              maxWidth: '600px'
            }}
          >
            Please check the URL or return to the dashboard to continue tracking your flights.
          </Typography>

          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleReturnToDashboard}
            aria-label="Return to dashboard"
            sx={{
              marginTop: theme.spacing(2),
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: theme.shadows[4]
              }
            }}
          >
            Return to Dashboard
          </Button>
        </Box>
      </Container>
    </Fade>
  );
};

export default NotFound;