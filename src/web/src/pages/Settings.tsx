import React, { memo, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormGroup,
  FormControlLabel,
  Divider,
  Skeleton
} from '@mui/material'; // @mui/material v5.x
import { styled } from '@mui/material/styles'; // @mui/material/styles v5.x
import {
  DarkMode,
  LightMode,
  Settings as SettingsIcon
} from '@mui/icons-material'; // @mui/icons-material v5.x

import PageHeader from '../components/common/PageHeader';
import { useTheme } from '../hooks/useTheme';
import ErrorBoundary from '../components/common/ErrorBoundary';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Constants for settings sections and ARIA labels
const SETTINGS_SECTIONS = [
  {
    id: 'appearance',
    title: 'Appearance',
    description: 'Customize the look and feel of the application',
    icon: SettingsIcon
  },
  {
    id: 'theme',
    title: 'Theme',
    description: 'Manage application theme and system preference',
    icon: DarkMode
  }
] as const;

const ARIA_LABELS = {
  themeToggle: 'Toggle dark mode',
  systemPreference: 'Use system theme preference',
  settingsSection: 'Settings section'
} as const;

// Styled components
const SettingsContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  maxWidth: '800px',
  margin: '0 auto',
  transition: 'all 0.3s ease'
}));

const SettingsCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  transition: 'background-color 0.3s ease'
}));

const SettingsSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2)
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(2),
  fontWeight: 500
}));

// Settings component
const Settings = memo(() => {
  const { theme, isDarkMode, toggleTheme, useSystemPreference, toggleSystemPreference } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  // Handle theme toggle with loading state
  const handleThemeToggle = useCallback(async () => {
    try {
      setIsLoading(true);
      await toggleTheme();
    } catch (error) {
      console.error('Failed to toggle theme:', error);
    } finally {
      setIsLoading(false);
    }
  }, [toggleTheme]);

  // Handle system preference toggle
  const handleSystemPreferenceToggle = useCallback(async () => {
    try {
      setIsLoading(true);
      await toggleSystemPreference();
    } catch (error) {
      console.error('Failed to toggle system preference:', error);
    } finally {
      setIsLoading(false);
    }
  }, [toggleSystemPreference]);

  return (
    <ErrorBoundary>
      <PageHeader
        title="Settings"
        breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Settings', path: '/settings' }]}
      />

      <SettingsContainer>
        {isLoading ? (
          // Loading state
          Array.from({ length: 2 }).map((_, index) => (
            <Skeleton
              key={index}
              variant="rectangular"
              height={200}
              sx={{ mb: 3, borderRadius: 2 }}
            />
          ))
        ) : (
          // Settings content
          SETTINGS_SECTIONS.map((section) => (
            <SettingsCard key={section.id} elevation={1}>
              <CardContent>
                <SettingsSection role="region" aria-label={`${section.title} ${ARIA_LABELS.settingsSection}`}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <section.icon color="primary" />
                    <Typography variant="h6" component="h2">
                      {section.title}
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" color="textSecondary">
                    {section.description}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  {section.id === 'theme' && (
                    <FormGroup>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={isDarkMode}
                            onChange={handleThemeToggle}
                            disabled={isLoading || useSystemPreference}
                            color="primary"
                            icon={<LightMode />}
                            checkedIcon={<DarkMode />}
                          />
                        }
                        label={`Dark Mode ${isDarkMode ? 'On' : 'Off'}`}
                        aria-label={ARIA_LABELS.themeToggle}
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={useSystemPreference}
                            onChange={handleSystemPreferenceToggle}
                            disabled={isLoading}
                            color="primary"
                          />
                        }
                        label="Use System Theme"
                        aria-label={ARIA_LABELS.systemPreference}
                      />
                    </FormGroup>
                  )}
                </SettingsSection>
              </CardContent>
            </SettingsCard>
          ))
        )}

        {isLoading && (
          <LoadingSpinner
            size={24}
            color="primary"
            overlay={false}
          />
        )}
      </SettingsContainer>
    </ErrorBoundary>
  );
});

Settings.displayName = 'Settings';

export default Settings;