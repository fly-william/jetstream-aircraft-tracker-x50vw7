import { createContext, useContext, useState, useEffect, ReactNode } from 'react'; // react v18.2.0
import { ThemeProvider as MuiThemeProvider } from '@mui/material'; // @mui/material v5.x
import { Theme } from '@mui/material'; // @mui/material v5.x
import { useMediaQuery } from '@mui/material'; // @mui/material v5.x

import createAppTheme from '../config/theme.config';
import { aviationTheme } from '../styles/theme/aviation.theme';

// Theme mode type definition
export type ThemeMode = 'light' | 'dark' | 'system';

// Constants
const THEME_STORAGE_KEY = 'jetstream-theme-mode';
const DEFAULT_THEME_MODE: ThemeMode = 'system';
const DEFAULT_TRANSITION_DURATION = 200;
const THEME_CHANGE_EVENT = 'jetstream-theme-change';

// Theme context type definition
interface ThemeContextType {
  theme: Theme;
  mode: ThemeMode;
  toggleTheme: () => void;
  isDarkMode: boolean;
  isSystemPreference: boolean;
  transitionDuration: number;
}

// Theme provider props type definition
interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
  transitionDuration?: number;
}

// Create theme context with null initial value
export const ThemeContext = createContext<ThemeContextType | null>(null);

// Theme provider component
export const ThemeProvider = ({
  children,
  defaultMode = DEFAULT_THEME_MODE,
  transitionDuration = DEFAULT_TRANSITION_DURATION
}: ThemeProviderProps) => {
  // System preference detection
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  
  // Initialize theme mode from localStorage or default
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return defaultMode;
    return (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode) || defaultMode;
  });

  // Determine effective dark mode based on system preference and current mode
  const isDarkMode = mode === 'system' ? prefersDarkMode : mode === 'dark';
  const isSystemPreference = mode === 'system';

  // Create theme instance
  const theme = createAppTheme(isDarkMode ? 'dark' : 'light');

  // Handle system preference changes
  useEffect(() => {
    if (mode === 'system') {
      const newTheme = createAppTheme(prefersDarkMode ? 'dark' : 'light');
      document.documentElement.style.setProperty(
        '--theme-transition-duration',
        `${transitionDuration}ms`
      );
      
      // Dispatch theme change event
      window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, {
        detail: { isDarkMode: prefersDarkMode }
      }));
    }
  }, [prefersDarkMode, mode, transitionDuration]);

  // Theme toggle handler
  const toggleTheme = () => {
    const newMode: ThemeMode = (() => {
      if (mode === 'light') return 'dark';
      if (mode === 'dark') return 'system';
      return 'light';
    })();

    // Apply transition duration
    document.documentElement.style.setProperty(
      '--theme-transition-duration',
      `${transitionDuration}ms`
    );

    // Update theme mode
    setMode(newMode);
    localStorage.setItem(THEME_STORAGE_KEY, newMode);

    // Dispatch theme change event
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, {
      detail: { isDarkMode: newMode === 'dark' || (newMode === 'system' && prefersDarkMode) }
    }));
  };

  // Context value
  const contextValue: ThemeContextType = {
    theme,
    mode,
    toggleTheme,
    isDarkMode,
    isSystemPreference,
    transitionDuration
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

// Custom hook for accessing theme context
export const useThemeContext = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};