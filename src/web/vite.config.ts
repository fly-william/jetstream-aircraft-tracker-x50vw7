// @vitejs/plugin-react v4.0.0
// vite-tsconfig-paths v4.2.0
// vite v4.4.0

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  // Project root directory
  root: path.resolve(__dirname),

  // Configure plugins
  plugins: [
    // React plugin with Fast Refresh and Emotion support
    react({
      fastRefresh: true,
      babel: {
        plugins: ['@emotion/babel-plugin']
      }
    }),
    // TypeScript path resolution
    tsconfigPaths()
  ],

  // Path resolution configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@assets': path.resolve(__dirname, './src/assets')
    }
  },

  // Build configuration
  build: {
    // Browser targets based on requirements
    target: [
      'es2020',
      'chrome89',
      'edge89',
      'firefox89',
      'safari15'
    ],
    outDir: 'dist',
    sourcemap: true,
    // Increase chunk size warning limit for large dependencies
    chunkSizeWarningLimit: 1000,
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Group major dependencies
          vendor: ['react', 'react-dom', '@mui/material'],
          // Separate chunk for mapbox due to size
          mapbox: ['mapbox-gl']
        }
      }
    },
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Use Terser for production minification
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove console.log in production
        drop_console: true
      }
    }
  },

  // Development server configuration
  server: {
    port: 3000,
    strictPort: true,
    // Enable network access for development
    host: true,
    // CORS configuration for API access
    cors: {
      origin: [
        'http://localhost:3000',
        'https://api.flyusa.com'
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true
    },
    // Hot Module Replacement settings
    hmr: {
      overlay: true
    },
    // API proxy configuration
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      }
    }
  },

  // Preview server configuration for production testing
  preview: {
    port: 3000,
    strictPort: true,
    host: true,
    cors: true
  },

  // Global constants
  define: {
    __APP_VERSION__: 'JSON.stringify(process.env.npm_package_version)'
  }
});