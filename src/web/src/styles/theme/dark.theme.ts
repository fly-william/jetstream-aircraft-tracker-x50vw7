import { ThemeOptions } from '@mui/material'; // @mui/material v5.x
import { aviationTheme } from '../theme/aviation.theme';

// Dark mode specific color palette configuration
const DARK_MODE_PALETTE = {
  mode: 'dark',
  primary: {
    main: '#1E88E5',
    light: '#42A5F5',
    dark: '#1565C0',
    contrastText: '#FFFFFF'
  },
  secondary: {
    main: '#FFA726',
    light: '#FFB74D',
    dark: '#F57C00',
    contrastText: '#000000'
  },
  background: {
    default: '#121212',
    paper: '#1E1E1E',
    elevated: '#242424'
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#B0B0B0',
    disabled: '#707070'
  },
  error: {
    main: '#EF5350',
    light: '#E57373',
    dark: '#D32F2F',
    contrastText: '#FFFFFF'
  },
  warning: {
    main: '#FFB74D',
    light: '#FFA726',
    dark: '#F57C00',
    contrastText: '#000000'
  },
  info: {
    main: '#4FC3F7',
    light: '#81D4FA',
    dark: '#039BE5',
    contrastText: '#000000'
  },
  success: {
    main: '#66BB6A',
    light: '#81C784',
    dark: '#388E3C',
    contrastText: '#000000'
  },
  divider: 'rgba(255, 255, 255, 0.12)',
  action: {
    active: 'rgba(255, 255, 255, 0.7)',
    hover: 'rgba(255, 255, 255, 0.08)',
    selected: 'rgba(255, 255, 255, 0.16)',
    disabled: 'rgba(255, 255, 255, 0.3)',
    disabledBackground: 'rgba(255, 255, 255, 0.12)'
  }
};

// Dark theme specific component overrides
const darkComponentOverrides = {
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
        backgroundColor: '#1E1E1E',
        '&.MuiAppBar-root': {
          backgroundColor: '#242424'
        }
      }
    }
  },
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: 'none'
      },
      contained: {
        boxShadow: 'none',
        '&:hover': {
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)'
        }
      },
      outlined: {
        borderColor: 'rgba(255, 255, 255, 0.23)',
        '&:hover': {
          borderColor: 'rgba(255, 255, 255, 0.4)'
        }
      }
    }
  },
  MuiAlert: {
    styleOverrides: {
      standardError: {
        backgroundColor: 'rgba(239, 83, 80, 0.15)',
        color: '#EF5350'
      },
      standardSuccess: {
        backgroundColor: 'rgba(102, 187, 106, 0.15)',
        color: '#66BB6A'
      },
      standardWarning: {
        backgroundColor: 'rgba(255, 183, 77, 0.15)',
        color: '#FFB74D'
      },
      standardInfo: {
        backgroundColor: 'rgba(79, 195, 247, 0.15)',
        color: '#4FC3F7'
      }
    }
  },
  MuiChip: {
    styleOverrides: {
      root: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        '&.MuiChip-colorPrimary': {
          backgroundColor: 'rgba(30, 136, 229, 0.15)'
        },
        '&.MuiChip-colorSecondary': {
          backgroundColor: 'rgba(255, 167, 38, 0.15)'
        }
      }
    }
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: '1px solid rgba(255, 255, 255, 0.12)'
      }
    }
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        backgroundColor: '#242424'
      }
    }
  }
};

// Create dark theme by extending aviation theme
export const darkTheme: ThemeOptions = {
  ...aviationTheme,
  palette: DARK_MODE_PALETTE,
  components: {
    ...aviationTheme.components,
    ...darkComponentOverrides
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(0, 0, 0, 0.2)',
    '0px 4px 8px rgba(0, 0, 0, 0.25)',
    // Maintain the same shadow array length as Material-UI default
    ...Array(22).fill('none')
  ]
};