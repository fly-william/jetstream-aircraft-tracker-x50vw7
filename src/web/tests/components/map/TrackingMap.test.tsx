import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // v14.x
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'; // v0.34.x
import userEvent from '@testing-library/user-event'; // v14.x

import TrackingMap from '../../../../src/components/map/TrackingMap';
import { renderWithProviders, generateMockAircraft, MockWebSocket, WebSocketReadyState, waitForWebSocketState } from '../../utils/test-helpers';

// Mock mapbox-gl
vi.mock('mapbox-gl', () => ({
  default: {
    Map: vi.fn(() => ({
      addControl: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      remove: vi.fn(),
      addSource: vi.fn(),
      addLayer: vi.fn(),
      setLayoutProperty: vi.fn(),
      getCanvas: vi.fn(() => ({
        style: {}
      })),
      loaded: vi.fn(() => true)
    })),
    NavigationControl: vi.fn(),
    ScaleControl: vi.fn(),
    Marker: vi.fn(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      setRotation: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn()
    })),
    LngLat: vi.fn((lng, lat) => ({ lng, lat }))
  }
}));

describe('TrackingMap Component', () => {
  // Mock handlers
  const mockOnAircraftSelect = vi.fn();
  const mockOnError = vi.fn();
  const mockOnConnectionStatus = vi.fn();

  // Test setup and cleanup
  beforeEach(() => {
    vi.useFakeTimers();
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Map Initialization', () => {
    it('should initialize map with correct configuration', async () => {
      renderWithProviders(
        <TrackingMap
          onAircraftSelect={mockOnAircraftSelect}
          onError={mockOnError}
          onConnectionStatus={mockOnConnectionStatus}
        />
      );

      const mapContainer = screen.getByRole('application');
      expect(mapContainer).toBeInTheDocument();
      expect(mapContainer).toHaveAttribute('aria-label', 'Aircraft tracking map');
    });

    it('should handle map initialization errors gracefully', async () => {
      const mapError = new Error('Map initialization failed');
      vi.mocked(mapboxgl.Map).mockImplementationOnce(() => {
        throw mapError;
      });

      renderWithProviders(
        <TrackingMap
          onAircraftSelect={mockOnAircraftSelect}
          onError={mockOnError}
          onConnectionStatus={mockOnConnectionStatus}
        />
      );

      expect(mockOnError).toHaveBeenCalledWith(mapError);
    });
  });

  describe('Layer Management', () => {
    it('should toggle layer visibility correctly', async () => {
      const { container } = renderWithProviders(
        <TrackingMap
          onAircraftSelect={mockOnAircraftSelect}
          onError={mockOnError}
          onConnectionStatus={mockOnConnectionStatus}
        />
      );

      const weatherToggle = screen.getByRole('checkbox', { name: /weather layer/i });
      await userEvent.click(weatherToggle);

      expect(vi.mocked(mapboxgl.Map).mock.results[0].value.setLayoutProperty)
        .toHaveBeenCalledWith('weather-layer', 'visibility', 'visible');
    });

    it('should handle layer toggle errors', async () => {
      const toggleError = new Error('Layer toggle failed');
      vi.mocked(mapboxgl.Map).mock.results[0].value.setLayoutProperty.mockImplementationOnce(() => {
        throw toggleError;
      });

      renderWithProviders(
        <TrackingMap
          onAircraftSelect={mockOnAircraftSelect}
          onError={mockOnError}
          onConnectionStatus={mockOnConnectionStatus}
        />
      );

      const weatherToggle = screen.getByRole('checkbox', { name: /weather layer/i });
      await userEvent.click(weatherToggle);

      expect(mockOnError).toHaveBeenCalledWith(toggleError);
    });
  });

  describe('Real-time Updates', () => {
    it('should handle aircraft position updates', async () => {
      const mockAircraft = generateMockAircraft();
      const mockPosition = {
        id: mockAircraft.id,
        registration: mockAircraft.registration,
        latitude: 39.0,
        longitude: -97.0,
        altitude: 35000,
        heading: 90,
        groundSpeed: 450,
        timestamp: new Date().toISOString()
      };

      renderWithProviders(
        <TrackingMap
          onAircraftSelect={mockOnAircraftSelect}
          onError={mockOnError}
          onConnectionStatus={mockOnConnectionStatus}
        />
      );

      // Wait for WebSocket connection
      await waitFor(() => {
        expect(mockOnConnectionStatus).toHaveBeenCalledWith(true);
      });

      // Simulate position update
      const socket = new MockWebSocket('ws://localhost:3000');
      socket.simulateMessage(mockPosition);

      expect(vi.mocked(mapboxgl.Marker).mock.calls.length).toBe(1);
    });

    it('should handle WebSocket connection errors', async () => {
      renderWithProviders(
        <TrackingMap
          onAircraftSelect={mockOnAircraftSelect}
          onError={mockOnError}
          onConnectionStatus={mockOnConnectionStatus}
        />
      );

      const socket = new MockWebSocket('ws://localhost:3000');
      socket.simulateError('Connection failed');

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
        expect(mockOnConnectionStatus).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Accessibility', () => {
    it('should support keyboard navigation', async () => {
      const mockAircraft = generateMockAircraft();
      
      renderWithProviders(
        <TrackingMap
          onAircraftSelect={mockOnAircraftSelect}
          onError={mockOnError}
          onConnectionStatus={mockOnConnectionStatus}
        />
      );

      const mapControls = screen.getByRole('region', { name: /map layer controls/i });
      const layerToggles = within(mapControls).getAllByRole('checkbox');

      // Test keyboard navigation
      await userEvent.tab();
      expect(layerToggles[0]).toHaveFocus();

      // Test keyboard interaction
      await userEvent.keyboard('{space}');
      expect(vi.mocked(mapboxgl.Map).mock.results[0].value.setLayoutProperty).toHaveBeenCalled();
    });

    it('should have proper ARIA attributes', () => {
      renderWithProviders(
        <TrackingMap
          onAircraftSelect={mockOnAircraftSelect}
          onError={mockOnError}
          onConnectionStatus={mockOnConnectionStatus}
        />
      );

      const mapContainer = screen.getByRole('application');
      expect(mapContainer).toHaveAttribute('aria-label');

      const controls = screen.getByRole('region', { name: /map layer controls/i });
      expect(controls).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should maintain performance during rapid updates', async () => {
      const mockPositions = Array.from({ length: 100 }, () => ({
        ...generateMockAircraft(),
        latitude: Math.random() * 90,
        longitude: Math.random() * 180,
        heading: Math.random() * 360
      }));

      const { container } = renderWithProviders(
        <TrackingMap
          onAircraftSelect={mockOnAircraftSelect}
          onError={mockOnError}
          onConnectionStatus={mockOnConnectionStatus}
        />
      );

      // Simulate rapid position updates
      const socket = new MockWebSocket('ws://localhost:3000');
      mockPositions.forEach(position => {
        socket.simulateMessage(position);
      });

      // Fast-forward timers to process all updates
      vi.runAllTimers();

      // Verify marker creation performance
      expect(vi.mocked(mapboxgl.Marker).mock.calls.length).toBeLessThanOrEqual(mockPositions.length);
    });
  });
});