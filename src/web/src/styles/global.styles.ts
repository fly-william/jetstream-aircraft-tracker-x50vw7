import { createGlobalStyle, css } from 'styled-components'; // styled-components v5.x
import { aviationTheme } from './theme/aviation.theme';

// Enhanced CSS reset with accessibility considerations
const GLOBAL_RESET = css`
  html, body {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    -webkit-text-size-adjust: 100%;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  *, *::before, *::after {
    box-sizing: inherit;
    margin: 0;
    padding: 0;
  }

  // Enhanced focus management
  :focus-visible {
    outline: 2px solid ${aviationTheme.palette.primary.main};
    outline-offset: 2px;
  }

  // Scrollbar styling
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${aviationTheme.palette.background.default};
  }

  ::-webkit-scrollbar-thumb {
    background: ${aviationTheme.palette.primary.light};
    border-radius: 4px;
    
    &:hover {
      background: ${aviationTheme.palette.primary.main};
    }
  }
`;

// Advanced typography configuration
const GLOBAL_TYPOGRAPHY = css`
  body {
    font-family: ${aviationTheme.typography.fontFamily};
    font-size: 16px;
    line-height: 1.5;
    color: ${aviationTheme.palette.text?.primary};
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  // Fluid typography scaling
  @media (min-width: ${aviationTheme.breakpoints.values.md}px) {
    html {
      font-size: calc(14px + 0.390625vw);
    }
  }

  h1, h2, h3, h4, h5, h6 {
    margin: 0;
    font-weight: ${aviationTheme.typography.fontWeightBold};
    line-height: 1.2;
  }

  // Font display optimization
  @font-face {
    font-family: 'Aviation Sans';
    font-display: swap;
  }
`;

// Comprehensive accessibility enhancements
const GLOBAL_ACCESSIBILITY = css`
  // Skip link for keyboard navigation
  .skip-to-main {
    position: absolute;
    left: -9999px;
    z-index: 999;
    padding: 1em;
    background: ${aviationTheme.palette.background.paper};
    color: ${aviationTheme.palette.primary.main};
    text-decoration: none;

    &:focus {
      left: 0;
      outline: none;
      box-shadow: 0 0 0 2px ${aviationTheme.palette.primary.main};
    }
  }

  // Screen reader utilities
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }

  // Enhanced focus indication for interactive elements
  button, a, input, select, textarea {
    &:focus-visible {
      outline: 2px solid ${aviationTheme.palette.primary.main};
      outline-offset: 2px;
    }
  }

  // Reduced motion preference
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;

// Print optimization
const GLOBAL_PRINT = css`
  @media print {
    body {
      background: white;
      color: black;
    }

    a {
      text-decoration: underline;
      color: black;
    }

    // Ensure background colors print
    * {
      -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    // Page break controls
    .page-break-before {
      page-break-before: always;
    }

    .page-break-after {
      page-break-after: always;
    }

    // Hide non-essential elements
    .no-print {
      display: none !important;
    }
  }
`;

// Global styles component
export const GlobalStyles = createGlobalStyle`
  ${GLOBAL_RESET}
  ${GLOBAL_TYPOGRAPHY}
  ${GLOBAL_ACCESSIBILITY}
  ${GLOBAL_PRINT}

  // Responsive layout utilities
  .container {
    width: 100%;
    margin-right: auto;
    margin-left: auto;
    padding-right: 16px;
    padding-left: 16px;

    @media (min-width: ${aviationTheme.breakpoints.values.sm}px) {
      max-width: 540px;
    }

    @media (min-width: ${aviationTheme.breakpoints.values.md}px) {
      max-width: 720px;
    }

    @media (min-width: ${aviationTheme.breakpoints.values.lg}px) {
      max-width: 1140px;
    }

    @media (min-width: ${aviationTheme.breakpoints.values.xl}px) {
      max-width: 1320px;
    }
  }

  // Grid system
  .grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 24px;
  }

  // Utility classes
  .visually-hidden {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important;
    border: 0 !important;
  }

  .text-center {
    text-align: center;
  }

  .text-right {
    text-align: right;
  }

  .text-left {
    text-align: left;
  }
`;