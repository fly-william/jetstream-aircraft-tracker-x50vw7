/**
 * @fileoverview Test suite for TripDetails component
 * @version 1.0.0
 */

// External imports - Testing utilities
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';

// Internal imports - Component and types
import TripDetails from '../../../../src/components/trip/TripDetails';
import { Trip, TripStatus, ServiceRequestType } from '../../../../src/types/trip.types';
import { renderWithProviders, generateMockTrip, MockWebSocket } from '../../utils/test-helpers';

// Mock Teams SDK
vi.mock('@microsoft/teams-js', () => ({
  app: {
    initialize: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('TripDetails Component', () => {
  // Test setup variables
  let mockTrip: Trip;
  let mockSocket: MockWebSocket;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Generate mock trip data
    mockTrip = generateMockTrip({
      status: TripStatus.SCHEDULED,
      metadata: {
        flightNumber: 'JS123',
        aircraftRegistration: 'N123JS',
        origin: 'KBOS',
        destination: 'KLAX'
      }
    });

    // Initialize mock WebSocket
    mockSocket = new MockWebSocket('ws://localhost:3000', { latencyMs: 50 });
  });

  afterEach(() => {
    mockSocket?.close();
  });

  it('renders trip header information correctly', async () => {
    renderWithProviders(
      <TripDetails
        tripId={mockTrip.id}
        onClose={() => {}}
        enableRealTime={true}
        enableTeamsNotifications={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(`Trip Details - ${mockTrip.metadata.flightNumber}`)).toBeInTheDocument();
      expect(screen.getByText(`Current Status: ${mockTrip.status}`)).toBeInTheDocument();
      expect(screen.getByText(/Real-time updates active/)).toBeInTheDocument();
    });
  });

  it('handles real-time status updates via WebSocket', async () => {
    renderWithProviders(
      <TripDetails
        tripId={mockTrip.id}
        onClose={() => {}}
        enableRealTime={true}
      />
    );

    const newStatus = TripStatus.IN_POSITION;
    
    await act(async () => {
      mockSocket.simulateMessage({
        type: 'STATUS_UPDATE',
        data: {
          status: newStatus,
          updatedAt: new Date().toISOString()
        }
      });
    });

    await waitFor(() => {
      expect(screen.getByText(`Current Status: ${newStatus}`)).toBeInTheDocument();
    });
  });

  it('integrates with Teams notifications when status is updated', async () => {
    const mockTeamsSend = vi.spyOn(require('@microsoft/teams-js').app, 'sendMessage');
    
    renderWithProviders(
      <TripDetails
        tripId={mockTrip.id}
        onClose={() => {}}
        enableTeamsNotifications={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Update Status')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Update Status'));
    
    await act(async () => {
      fireEvent.click(screen.getByText('IN_POSITION'));
      fireEvent.click(screen.getByText('Confirm'));
    });

    await waitFor(() => {
      expect(mockTeamsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('IN_POSITION'),
          importance: 'normal'
        })
      );
    });
  });

  it('displays and updates trip milestones correctly', async () => {
    const { rerender } = renderWithProviders(
      <TripDetails
        tripId={mockTrip.id}
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Timeline')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Timeline'));

    const newMilestone = {
      id: crypto.randomUUID(),
      tripId: mockTrip.id,
      type: 'CREW_READY',
      timestamp: new Date().toISOString(),
      details: {}
    };

    await act(async () => {
      mockSocket.simulateMessage({
        type: 'MILESTONE_ADDED',
        data: newMilestone
      });
    });

    await waitFor(() => {
      expect(screen.getByText('CREW_READY')).toBeInTheDocument();
    });
  });

  it('handles service request creation and updates', async () => {
    renderWithProviders(
      <TripDetails
        tripId={mockTrip.id}
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Add Service')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Service'));

    const newRequest = {
      id: crypto.randomUUID(),
      tripId: mockTrip.id,
      type: ServiceRequestType.CATERING,
      status: 'PENDING',
      scheduledTime: new Date().toISOString(),
      vendorName: 'Sky Catering'
    };

    await act(async () => {
      mockSocket.simulateMessage({
        type: 'SERVICE_REQUEST_UPDATE',
        data: newRequest
      });
    });

    fireEvent.click(screen.getByText('Service Requests'));

    await waitFor(() => {
      expect(screen.getByText('CATERING')).toBeInTheDocument();
      expect(screen.getByText('Sky Catering')).toBeInTheDocument();
    });
  });

  it('handles error states gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    renderWithProviders(
      <TripDetails
        tripId="invalid-id"
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load trip details/)).toBeInTheDocument();
    });

    consoleError.mockRestore();
  });

  it('maintains WebSocket connection and handles reconnection', async () => {
    renderWithProviders(
      <TripDetails
        tripId={mockTrip.id}
        onClose={() => {}}
        enableRealTime={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Real-time updates active/)).toBeInTheDocument();
    });

    act(() => {
      mockSocket.close();
    });

    await waitFor(() => {
      expect(screen.getByText(/Connecting/)).toBeInTheDocument();
    });

    const newSocket = new MockWebSocket('ws://localhost:3000');
    
    await waitFor(() => {
      expect(screen.getByText(/Real-time updates active/)).toBeInTheDocument();
    });

    newSocket.close();
  });

  it('cleans up resources on unmount', async () => {
    const { unmount } = renderWithProviders(
      <TripDetails
        tripId={mockTrip.id}
        onClose={() => {}}
        enableRealTime={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Real-time updates active/)).toBeInTheDocument();
    });

    unmount();

    expect(mockSocket.readyState).toBe(WebSocket.CLOSED);
  });
});