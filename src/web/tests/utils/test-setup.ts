/**
 * @fileoverview Global test setup configuration for JetStream frontend testing
 * @version 1.0.0
 */

import { vi } from 'vitest'; // version: 0.34.x
import '@testing-library/jest-dom'; // version: 5.x
import { renderWithProviders } from './test-helpers';
import WebSocket from 'ws'; // version: 8.x

/**
 * Interface for matchMedia mock configuration
 */
interface MatchMediaConfig {
  matches: boolean;
  media: string;
  onchange: null | ((this: MediaQueryList, ev: MediaQueryListEvent) => any);
  addListener: (callback: (e: MediaQueryListEvent) => void) => void;
  removeListener: (callback: (e: MediaQueryListEvent) => void) => void;
  addEventListener: (type: string, callback: EventListener) => void;
  removeEventListener: (type: string, callback: EventListener) => void;
  dispatchEvent: (event: Event) => boolean;
}

/**
 * Sets up enhanced matchMedia mock with breakpoint simulation
 */
export const setupMatchMedia = (initialMatches: Record<string, boolean> = {}) => {
  const listeners = new Map<string, Set<EventListener>>();

  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const matches = initialMatches[query] ?? false;
    const mediaQueryList: MatchMediaConfig = {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn((callback) => mediaQueryList.addEventListener('change', callback)),
      removeListener: vi.fn((callback) => mediaQueryList.removeEventListener('change', callback)),
      addEventListener: vi.fn((type, callback) => {
        if (!listeners.has(query)) {
          listeners.set(query, new Set());
        }
        listeners.get(query)?.add(callback);
      }),
      removeEventListener: vi.fn((type, callback) => {
        listeners.get(query)?.delete(callback);
      }),
      dispatchEvent: vi.fn((event) => {
        listeners.get(query)?.forEach(callback => callback(event));
        return true;
      })
    };

    return mediaQueryList;
  });

  return () => {
    listeners.clear();
    vi.restoreAllMocks();
  };
};

/**
 * Enhanced ResizeObserver mock implementation
 */
class MockResizeObserver {
  private callback: ResizeObserverCallback;
  private observedElements: Set<Element>;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    this.observedElements = new Set();
  }

  observe(target: Element): void {
    this.observedElements.add(target);
    this.triggerCallback([{
      target,
      contentRect: target.getBoundingClientRect(),
      borderBoxSize: [{ blockSize: 0, inlineSize: 0 }],
      contentBoxSize: [{ blockSize: 0, inlineSize: 0 }],
      devicePixelContentBoxSize: [{ blockSize: 0, inlineSize: 0 }]
    }]);
  }

  unobserve(target: Element): void {
    this.observedElements.delete(target);
  }

  disconnect(): void {
    this.observedElements.clear();
  }

  private triggerCallback(entries: ResizeObserverEntry[]): void {
    this.callback(entries, this);
  }
}

/**
 * Sets up ResizeObserver mock with validation
 */
export const setupResizeObserver = () => {
  window.ResizeObserver = MockResizeObserver;
  return () => {
    delete window.ResizeObserver;
  };
};

/**
 * Interface for fetch mock configuration
 */
interface FetchMockOptions {
  delay?: number;
  errorRate?: number;
}

/**
 * Sets up enhanced fetch mock with error simulation
 */
export const setupFetchMock = (options: FetchMockOptions = {}) => {
  const { delay = 0, errorRate = 0 } = options;
  const originalFetch = window.fetch;

  window.fetch = vi.fn().mockImplementation(async (input: RequestInfo, init?: RequestInit) => {
    if (Math.random() < errorRate) {
      throw new Error('Network error');
    }

    await new Promise(resolve => setTimeout(resolve, delay));
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  });

  return () => {
    window.fetch = originalFetch;
  };
};

/**
 * Interface for WebSocket mock configuration
 */
interface WebSocketMockOptions {
  latencyMs?: number;
  errorRate?: number;
}

/**
 * Sets up WebSocket mock for real-time testing
 */
export const setupWebSocketMock = (options: WebSocketMockOptions = {}) => {
  const { latencyMs = 0, errorRate = 0 } = options;
  const originalWebSocket = global.WebSocket;
  const mockInstances = new Set<WebSocket>();

  global.WebSocket = vi.fn().mockImplementation((url: string) => {
    const ws = new WebSocket(url);
    mockInstances.add(ws);

    if (Math.random() < errorRate) {
      setTimeout(() => {
        ws.emit('error', new Error('WebSocket connection error'));
      }, latencyMs);
    }

    return ws;
  });

  return () => {
    mockInstances.forEach(ws => ws.close());
    mockInstances.clear();
    global.WebSocket = originalWebSocket;
  };
};

/**
 * Configure global test environment
 */
beforeAll(() => {
  // Setup all mocks
  const cleanupMatchMedia = setupMatchMedia({
    '(min-width: 1025px)': true,
    '(prefers-color-scheme: dark)': false
  });
  const cleanupResizeObserver = setupResizeObserver();
  const cleanupFetch = setupFetchMock({ delay: 100, errorRate: 0.1 });
  const cleanupWebSocket = setupWebSocketMock({ latencyMs: 50, errorRate: 0.05 });

  // Return cleanup function
  return () => {
    cleanupMatchMedia();
    cleanupResizeObserver();
    cleanupFetch();
    cleanupWebSocket();
  };
});

/**
 * Reset all mocks after each test
 */
afterEach(() => {
  vi.clearAllMocks();
});

/**
 * Export test utilities
 */
export { renderWithProviders };