import { ThemeOptions } from '@mui/material'; // @mui/material v5.x
import { aviationTheme } from '../theme/aviation.theme';

// Light mode color palette configuration with WCAG-compliant contrast ratios
const LIGHT_MODE_PALETTE = {
  mode: 'light',
  primary: {
    main: '#1976D2',
    light: '#42A5F5',
    dark: '#1565C0',
    contrastText: '#FFFFFF'
  },
  secondary: {
    main: '#FB8C00',
    light: '#FFA726',
    dark: '#F57C00',
    contrastText: '#000000'
  },
  background: {
    default: '#F5F5F5',
    paper: '#FFFFFF',
    elevated: '#FFFFFF'
  },
  text: {
    primary: '#212121',
    secondary: '#757575',
    disabled: '#9E9E9E'
  },
  error: {
    main: '#D32F2F',
    light: '#EF5350',
    dark: '#C62828',
    contrastText: '#FFFFFF'
  },
  warning: {
    main: '#FFA000',
    light: '#FFB74D',
    dark: '#F57C00',
    contrastText: '#000000'
  },
  info: {
    main: '#0288D1',
    light: '#4FC3F7',
    dark: '#01579B',
    contrastText: '#FFFFFF'
  },
  success: {
    main: '#388E3C',
    light: '#66BB6A',
    dark: '#2E7D32',
    contrastText: '#FFFFFF'
  },
  divider: 'rgba(0, 0, 0, 0.12)',
  action: {
    active: 'rgba(0, 0, 0, 0.54)',
    hover: 'rgba(0, 0, 0, 0.04)',
    selected: 'rgba(0, 0, 0, 0.08)',
    disabled: 'rgba(0, 0, 0, 0.26)',
    disabledBackground: 'rgba(0, 0, 0, 0.12)',
    focus: 'rgba(0, 0, 0, 0.12)'
  }
};

// Light mode specific component style overrides
const lightComponentOverrides = {
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
        backgroundColor: '#FFFFFF'
      },
      elevation1: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)'
      },
      elevation2: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.08)'
      }
    }
  },
  MuiCard: {
    styleOverrides: {
      root: {
        backgroundColor: '#FFFFFF',
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
        '&:hover': {
          boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.12)'
        }
      }
    }
  },
  MuiChip: {
    styleOverrides: {
      root: {
        backgroundColor: 'rgba(0, 0, 0, 0.08)',
        '&.MuiChip-colorPrimary': {
          backgroundColor: 'rgba(25, 118, 210, 0.12)',
          color: '#1976D2'
        },
        '&.MuiChip-colorSecondary': {
          backgroundColor: 'rgba(251, 140, 0, 0.12)',
          color: '#FB8C00'
        }
      }
    }
  },
  MuiAlert: {
    styleOverrides: {
      standardSuccess: {
        backgroundColor: 'rgba(56, 142, 60, 0.12)',
        color: '#388E3C'
      },
      standardWarning: {
        backgroundColor: 'rgba(255, 160, 0, 0.12)',
        color: '#FFA000'
      },
      standardError: {
        backgroundColor: 'rgba(211, 47, 47, 0.12)',
        color: '#D32F2F'
      },
      standardInfo: {
        backgroundColor: 'rgba(2, 136, 209, 0.12)',
        color: '#0288D1'
      }
    }
  },
  MuiButton: {
    styleOverrides: {
      root: {
        '&.Mui-disabled': {
          backgroundColor: 'rgba(0, 0, 0, 0.12)',
          color: 'rgba(0, 0, 0, 0.26)'
        }
      },
      contained: {
        boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.1)',
        '&:hover': {
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)'
        }
      }
    }
  }
};

// Create light theme by merging with aviation theme base
export const lightTheme: ThemeOptions = {
  ...aviationTheme,
  palette: LIGHT_MODE_PALETTE,
  components: {
    ...aviationTheme.components,
    ...lightComponentOverrides
  }
};