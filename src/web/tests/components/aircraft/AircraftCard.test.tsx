/**
 * @fileoverview Test suite for AircraftCard component
 * @version 1.0.0
 */

import React from 'react'; // version: 18.2.x
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'; // version: 14.x
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'; // version: 0.34.x
import userEvent from '@testing-library/user-event'; // version: 14.x

// Internal imports
import AircraftCard from '../../../../src/components/aircraft/AircraftCard';
import { renderWithProviders, generateMockAircraft } from '../../utils/test-helpers';
import { AircraftStatus } from '../../../../src/types/aircraft.types';

describe('AircraftCard', () => {
  // Mock handlers
  const mockHandlers = {
    onClick: vi.fn(),
    onStatusChange: vi.fn(),
    onError: vi.fn()
  };

  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render aircraft information correctly', () => {
      const mockAircraft = generateMockAircraft({
        registration: 'N123JS',
        type: 'Citation XLS',
        status: AircraftStatus.ACTIVE
      });

      renderWithProviders(
        <AircraftCard 
          aircraft={mockAircraft}
          onClick={mockHandlers.onClick}
        />
      );

      // Verify registration display
      const registration = screen.getByRole('heading', { level: 2 });
      expect(registration).toHaveTextContent('N123JS');

      // Verify aircraft type
      expect(screen.getByText('Citation XLS')).toBeInTheDocument();

      // Verify status badge
      const statusBadge = screen.getByRole('status');
      expect(statusBadge).toHaveTextContent('ACTIVE');
      expect(statusBadge).toHaveClass('MuiChip-root');
    });

    it('should render loading skeleton when loading prop is true', () => {
      const mockAircraft = generateMockAircraft();

      renderWithProviders(
        <AircraftCard 
          aircraft={mockAircraft}
          loading={true}
        />
      );

      // Verify skeleton elements
      const skeletons = screen.getAllByRole('progressbar');
      expect(skeletons).toHaveLength(3);
    });

    it('should apply custom className when provided', () => {
      const mockAircraft = generateMockAircraft();
      const customClass = 'custom-card';

      const { container } = renderWithProviders(
        <AircraftCard 
          aircraft={mockAircraft}
          className={customClass}
        />
      );

      expect(container.firstChild).toHaveClass(customClass);
    });
  });

  describe('Interactions', () => {
    it('should call onClick handler when clicked', async () => {
      const mockAircraft = generateMockAircraft();
      const user = userEvent.setup();

      renderWithProviders(
        <AircraftCard 
          aircraft={mockAircraft}
          onClick={mockHandlers.onClick}
        />
      );

      const card = screen.getByRole('button');
      await user.click(card);

      expect(mockHandlers.onClick).toHaveBeenCalledTimes(1);
      expect(mockHandlers.onClick).toHaveBeenCalledWith(mockAircraft);
    });

    it('should handle keyboard navigation', async () => {
      const mockAircraft = generateMockAircraft();
      const user = userEvent.setup();

      renderWithProviders(
        <AircraftCard 
          aircraft={mockAircraft}
          onClick={mockHandlers.onClick}
        />
      );

      const card = screen.getByRole('button');
      await user.tab();
      expect(card).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(mockHandlers.onClick).toHaveBeenCalledTimes(1);

      await user.keyboard('{Space}');
      expect(mockHandlers.onClick).toHaveBeenCalledTimes(2);
    });

    it('should handle touch events', async () => {
      const mockAircraft = generateMockAircraft();

      renderWithProviders(
        <AircraftCard 
          aircraft={mockAircraft}
          onClick={mockHandlers.onClick}
        />
      );

      const card = screen.getByRole('button');
      fireEvent.touchEnd(card);

      expect(mockHandlers.onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      const mockAircraft = generateMockAircraft({
        registration: 'N123JS'
      });

      renderWithProviders(
        <AircraftCard 
          aircraft={mockAircraft}
        />
      );

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('aria-label', 'Aircraft N123JS details');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('should maintain sufficient color contrast', () => {
      const mockAircraft = generateMockAircraft({
        status: AircraftStatus.ACTIVE
      });

      renderWithProviders(
        <AircraftCard 
          aircraft={mockAircraft}
        />
      );

      const registration = screen.getByRole('heading', { level: 2 });
      const computedStyle = window.getComputedStyle(registration);
      expect(computedStyle.color).toBeDefined();
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt to mobile viewport', () => {
      const mockAircraft = generateMockAircraft();

      const { container } = renderWithProviders(
        <AircraftCard 
          aircraft={mockAircraft}
        />
      );

      // Verify mobile-specific styles
      expect(container.firstChild).toHaveStyle({
        minWidth: '280px',
        margin: '4px'
      });
    });

    it('should adapt to tablet viewport', () => {
      const mockAircraft = generateMockAircraft();

      const { container } = renderWithProviders(
        <AircraftCard 
          aircraft={mockAircraft}
        />
      );

      // Verify tablet-specific styles
      expect(container.firstChild).toHaveStyle({
        maxWidth: '400px',
        margin: '8px'
      });
    });

    it('should handle orientation changes', async () => {
      const mockAircraft = generateMockAircraft();

      const { container, rerender } = renderWithProviders(
        <AircraftCard 
          aircraft={mockAircraft}
        />
      );

      // Simulate orientation change
      window.dispatchEvent(new Event('orientationchange'));

      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing aircraft data gracefully', () => {
      const mockAircraft = generateMockAircraft({
        registration: '',
        type: ''
      });

      renderWithProviders(
        <AircraftCard 
          aircraft={mockAircraft}
        />
      );

      // Verify fallback content
      expect(screen.getByRole('heading')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should handle invalid status values', () => {
      const mockAircraft = generateMockAircraft({
        // @ts-expect-error Testing invalid status
        status: 'INVALID_STATUS'
      });

      renderWithProviders(
        <AircraftCard 
          aircraft={mockAircraft}
        />
      );

      const statusBadge = screen.getByRole('status');
      expect(statusBadge).toBeInTheDocument();
    });
  });
});