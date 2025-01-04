/**
 * @fileoverview Test helper utilities for JetStream frontend testing
 * @version 1.0.0
 */

import { render, RenderOptions, waitFor } from '@testing-library/react'; // version: 14.x
import { vi, afterEach, beforeEach } from 'vitest'; // version: 0.34.x
import { Provider, configureStore } from 'react-redux'; // version: 8.x
import { Aircraft, AircraftCategory, AircraftStatus } from '../../src/types/aircraft.types';
import { Trip, TripStatus, ServiceRequestType } from '../../src/types/trip.types';
import { ThemeProvider } from '@mui/material/styles'; // version: 5.x
import { theme } from '../../src/theme';

// WebSocket ready states matching the WebSocket spec
export enum WebSocketReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3
}

// Track mock WebSocket instances for cleanup
const mockWebSockets = new Set<MockWebSocket>();

/**
 * Enhanced WebSocket mock implementation for testing real-time features
 */
export class MockWebSocket {
  private static instances = new Set<MockWebSocket>();
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public readyState: WebSocketReadyState = WebSocketReadyState.CONNECTING;
  private messageQueue: Array<{ data: any; timestamp: number }> = [];
  private latencyMs: number;

  constructor(url: string, options: { latencyMs?: number } = {}) {
    this.latencyMs = options.latencyMs || 0;
    MockWebSocket.instances.add(this);
    
    // Simulate connection establishment
    setTimeout(() => {
      this.readyState = WebSocketReadyState.OPEN;
      this.dispatchEvent(new Event('open'));
    }, 0);
  }

  public send(data: string | ArrayBuffer): void {
    if (this.readyState !== WebSocketReadyState.OPEN) {
      throw new Error('WebSocket is not open');
    }

    this.messageQueue.push({
      data,
      timestamp: Date.now()
    });

    // Process queue with simulated latency
    setTimeout(() => this.processMessageQueue(), this.latencyMs);
  }

  public close(code?: number, reason?: string): void {
    this.readyState = WebSocketReadyState.CLOSING;
    setTimeout(() => {
      this.readyState = WebSocketReadyState.CLOSED;
      if (this.onclose) {
        this.onclose(new CloseEvent('close', { code, reason }));
      }
      MockWebSocket.instances.delete(this);
    }, 0);
  }

  public simulateError(errorType: string): void {
    if (this.onerror) {
      this.onerror(new ErrorEvent('error', { error: new Error(errorType) }));
    }
  }

  public simulateMessage(data: any): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message && this.onmessage) {
        this.onmessage(new MessageEvent('message', { data: message.data }));
      }
    }
  }

  private dispatchEvent(event: Event): void {
    const handler = `on${event.type}` as keyof MockWebSocket;
    const callback = this[handler] as ((event: Event) => void) | null;
    if (callback) callback(event);
  }

  static cleanup(): void {
    MockWebSocket.instances.forEach(socket => socket.close());
    MockWebSocket.instances.clear();
  }
}

/**
 * Cleanup mock WebSockets after each test
 */
export const cleanupMockWebSockets = (): void => {
  MockWebSocket.cleanup();
};

/**
 * Wait for WebSocket to reach a specific state
 */
export const waitForWebSocketState = async (
  socket: MockWebSocket,
  state: WebSocketReadyState,
  timeout: number = 5000
): Promise<void> => {
  return waitFor(
    () => {
      if (socket.readyState !== state) {
        throw new Error('WebSocket state not reached');
      }
    },
    { timeout }
  );
};

/**
 * Generate mock aircraft data for testing
 */
export const generateMockAircraft = (
  overrides: Partial<Aircraft> & { validateFields?: boolean } = {}
): Aircraft => {
  const defaultAircraft: Aircraft = {
    id: crypto.randomUUID(),
    registration: `N${Math.floor(Math.random() * 999)}JS`,
    type: 'Citation XLS',
    category: AircraftCategory.MIDSIZE_JET,
    operator: 'FlyUSA',
    status: AircraftStatus.ACTIVE,
    isActive: true,
    ...overrides
  };

  if (overrides.validateFields) {
    validateAircraftData(defaultAircraft);
  }

  return defaultAircraft;
};

/**
 * Generate mock trip data for testing
 */
export const generateMockTrip = (
  overrides: Partial<Trip> = {}
): Trip => {
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + 3600000); // 1 hour later

  return {
    id: crypto.randomUUID(),
    aircraftId: crypto.randomUUID(),
    startTime,
    endTime,
    status: TripStatus.SCHEDULED,
    metadata: {},
    milestones: [],
    serviceRequests: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
};

/**
 * Render component with all required providers
 */
export const renderWithProviders = (
  ui: React.ReactElement,
  {
    initialState = {},
    store = configureStore({
      reducer: {
        // Add your reducers here
      },
      preloadedState: initialState
    }),
    ...renderOptions
  }: RenderOptions & {
    initialState?: any;
    store?: any;
  } = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          {children}
        </ThemeProvider>
      </Provider>
    );
  };

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions })
  };
};

// Private helper functions
const validateAircraftData = (aircraft: Aircraft): void => {
  if (!aircraft.registration.match(/^N[0-9]{1,5}[A-Z]{1,2}$/)) {
    throw new Error('Invalid aircraft registration format');
  }
  
  if (!Object.values(AircraftCategory).includes(aircraft.category)) {
    throw new Error('Invalid aircraft category');
  }
  
  if (!Object.values(AircraftStatus).includes(aircraft.status)) {
    throw new Error('Invalid aircraft status');
  }
};

// Setup and teardown hooks
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  cleanupMockWebSockets();
});