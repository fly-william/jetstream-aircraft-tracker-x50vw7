import { createTheme, Theme, ThemeOptions } from '@mui/material'; // @mui/material v5.x
import { aviationTheme } from '../styles/theme/aviation.theme';
import { lightTheme } from '../styles/theme/light.theme';
import { darkTheme } from '../styles/theme/dark.theme';

/**
 * Theme mode constants
 */
export const THEME_MODE = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
} as const;

type ThemeMode = typeof THEME_MODE[keyof typeof THEME_MODE];

/**
 * Theme transition duration in milliseconds
 */
export const TRANSITION_DURATION = {
  THEME_SWITCH: 300
} as const;

/**
 * Detects system color scheme preference with enhanced browser support
 * @returns 'light' | 'dark' based on system preference
 */
const getSystemThemePreference = (): 'light' | 'dark' => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return THEME_MODE.LIGHT;
  }

  const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  return darkModeQuery.matches ? THEME_MODE.DARK : THEME_MODE.LIGHT;
};

/**
 * Creates the application theme based on specified mode or system preferences
 * with smooth transitions and enhanced type safety
 * @param mode - Theme mode ('light', 'dark', or 'system')
 * @returns Material-UI theme instance with transition configurations
 */
const createAppTheme = (mode: ThemeMode): Theme => {
  // Determine the effective theme mode
  const effectiveMode = mode === THEME_MODE.SYSTEM 
    ? getSystemThemePreference()
    : mode;

  // Select the appropriate theme configuration
  const selectedTheme: ThemeOptions = effectiveMode === THEME_MODE.DARK 
    ? darkTheme 
    : lightTheme;

  // Deep merge with aviation theme and add transition configurations
  const themeConfig: ThemeOptions = {
    ...aviationTheme,
    ...selectedTheme,
    components: {
      ...aviationTheme.components,
      ...selectedTheme.components,
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            transition: `background-color ${TRANSITION_DURATION.THEME_SWITCH}ms ease-in-out,
                        color ${TRANSITION_DURATION.THEME_SWITCH}ms ease-in-out`
          }
        }
      },
      // Add transition effects to components that change with theme
      MuiPaper: {
        styleOverrides: {
          root: {
            transition: `background-color ${TRANSITION_DURATION.THEME_SWITCH}ms ease-in-out,
                        box-shadow ${TRANSITION_DURATION.THEME_SWITCH}ms ease-in-out`
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            transition: `background-color ${TRANSITION_DURATION.THEME_SWITCH}ms ease-in-out,
                        box-shadow ${TRANSITION_DURATION.THEME_SWITCH}ms ease-in-out`
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            transition: `background-color ${TRANSITION_DURATION.THEME_SWITCH}ms ease-in-out,
                        color ${TRANSITION_DURATION.THEME_SWITCH}ms ease-in-out`
          }
        }
      }
    }
  };

  // Create and return the theme instance with proper typing
  return createTheme(themeConfig);
};

export default createAppTheme;