import { ThemeOptions, createTheme, PaletteOptions } from '@mui/material'; // @mui/material v5.x

// Breakpoint configuration matching design specifications
const BREAKPOINTS = {
  xs: 0,
  sm: 320,
  md: 481,
  lg: 1025,
  xl: 1440
};

// Base color palette configuration
const PALETTE: PaletteOptions = {
  primary: {
    main: '#0052CC',
    light: '#4C9AFF',
    dark: '#0747A6',
    contrastText: '#FFFFFF'
  },
  secondary: {
    main: '#00875A',
    light: '#57D9A3',
    dark: '#006644',
    contrastText: '#FFFFFF'
  },
  status: {
    success: '#36B37E',
    warning: '#FFAB00',
    error: '#FF5630',
    info: '#0065FF'
  },
  background: {
    default: '#F4F5F7',
    paper: '#FFFFFF'
  }
};

// Typography configuration with Aviation Sans font
const TYPOGRAPHY = {
  fontFamily: 'Aviation Sans, Roboto, sans-serif',
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 600,
  h1: {
    fontSize: '2.5rem',
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: '-0.01562em'
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.00833em'
  },
  h3: {
    fontSize: '1.75rem',
    fontWeight: 500,
    lineHeight: 1.4,
    letterSpacing: '0em'
  },
  h4: {
    fontSize: '1.5rem',
    fontWeight: 500,
    lineHeight: 1.4,
    letterSpacing: '0.00735em'
  },
  h5: {
    fontSize: '1.25rem',
    fontWeight: 500,
    lineHeight: 1.4,
    letterSpacing: '0em'
  },
  h6: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.4,
    letterSpacing: '0.0075em'
  },
  subtitle1: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: 1.75,
    letterSpacing: '0.00938em'
  },
  subtitle2: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.57,
    letterSpacing: '0.00714em'
  },
  body1: {
    fontSize: '1rem',
    lineHeight: 1.5,
    letterSpacing: '0.00938em'
  },
  body2: {
    fontSize: '0.875rem',
    lineHeight: 1.5,
    letterSpacing: '0.01071em'
  },
  button: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.75,
    letterSpacing: '0.02857em',
    textTransform: 'none'
  }
};

// Component style overrides
const COMPONENT_OVERRIDES = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        padding: '8px 24px',
        textTransform: 'none',
        fontWeight: 500
      },
      contained: {
        boxShadow: 'none',
        '&:hover': {
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)'
        }
      },
      containedPrimary: {
        background: 'linear-gradient(45deg, #0052CC 30%, #4C9AFF 90%)'
      }
    }
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
        transition: 'box-shadow 0.3s ease-in-out',
        '&:hover': {
          boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.15)'
        }
      }
    }
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 16,
        height: 28,
        fontWeight: 500
      },
      colorPrimary: {
        backgroundColor: 'rgba(0, 82, 204, 0.1)',
        color: '#0052CC'
      },
      colorSecondary: {
        backgroundColor: 'rgba(0, 135, 90, 0.1)',
        color: '#00875A'
      }
    }
  },
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        padding: '12px 16px'
      },
      standardSuccess: {
        backgroundColor: 'rgba(54, 179, 126, 0.1)',
        color: '#36B37E'
      },
      standardWarning: {
        backgroundColor: 'rgba(255, 171, 0, 0.1)',
        color: '#FFAB00'
      },
      standardError: {
        backgroundColor: 'rgba(255, 86, 48, 0.1)',
        color: '#FF5630'
      }
    }
  }
};

// Create theme with mode support
const createAviationTheme = (mode: 'light' | 'dark'): ThemeOptions => {
  const isDark = mode === 'dark';

  return {
    breakpoints: {
      values: BREAKPOINTS
    },
    palette: {
      mode,
      ...PALETTE,
      background: {
        default: isDark ? '#1A1B1F' : PALETTE.background.default,
        paper: isDark ? '#2C2D31' : PALETTE.background.paper
      }
    },
    typography: TYPOGRAPHY,
    shape: {
      borderRadius: 8
    },
    spacing: (factor: number) => `${8 * factor}px`,
    components: COMPONENT_OVERRIDES
  };
};

// Export the base theme configuration
export const aviationTheme = createAviationTheme('light');

// Export theme creation utility for dynamic mode switching
export { createAviationTheme };