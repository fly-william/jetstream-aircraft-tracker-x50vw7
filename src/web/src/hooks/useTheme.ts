import { useCallback } from 'react'; // react v18.2.0
import { Theme, useMediaQuery } from '@mui/material'; // @mui/material v5.x
import { useThemeContext } from '../contexts/ThemeContext';

// Constants for theme management
const THEME_STORAGE_KEY = 'jetstream-theme-preference';
const TRANSITION_DURATION = 200;

/**
 * Interface defining the return type of the useTheme hook
 */
interface UseThemeReturn {
  theme: Theme;
  isDarkMode: boolean;
  toggleTheme: () => void;
  systemPreference: string | null;
  isLoading: boolean;
}

/**
 * Custom hook for managing application theme state and preferences with system detection.
 * Provides theme switching functionality with smooth transitions and persistence.
 * 
 * @returns {UseThemeReturn} Object containing theme state, preferences and control functions
 */
export const useTheme = (): UseThemeReturn => {
  // Get theme context state and functions
  const {
    theme,
    isDarkMode,
    isSystemPreference,
    toggleTheme: contextToggleTheme,
    transitionDuration
  } = useThemeContext();

  // Detect system color scheme preference
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const systemPreference = prefersDarkMode ? 'dark' : 'light';

  // Memoize theme toggle function to prevent unnecessary rerenders
  const toggleTheme = useCallback(() => {
    // Apply transition duration before theme change
    document.documentElement.style.setProperty(
      '--theme-transition-duration',
      `${transitionDuration || TRANSITION_DURATION}ms`
    );

    // Toggle theme using context function
    contextToggleTheme();

    // Store preference in localStorage
    const newPreference = isDarkMode ? 'light' : 'dark';
    localStorage.setItem(THEME_STORAGE_KEY, newPreference);
  }, [isDarkMode, contextToggleTheme, transitionDuration]);

  // Return theme state and control functions
  return {
    theme,
    isDarkMode,
    toggleTheme,
    systemPreference: isSystemPreference ? systemPreference : null,
    isLoading: false
  };
};

// Export types for external use
export type { UseThemeReturn };