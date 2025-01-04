import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client'; // socket.io-client v4.7.2
import { websocketConfig } from '../config/websocket.config';

// Context type definition with comprehensive WebSocket functionality
interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  lastError: Error | null;
  retryCount: number;
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  subscribe: (channel: string, callback: (data: any) => void) => () => void;
  unsubscribe: (channel: string) => void;
}

// Props interface for the WebSocket provider component
interface WebSocketProviderProps {
  children: ReactNode;
  config?: typeof websocketConfig;
}

// Create context with type safety
const WebSocketContext = createContext<WebSocketContextType | null>(null);

// Custom hook for consuming WebSocket context with error handling
export const useWebSocketContext = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ 
  children, 
  config = websocketConfig 
}) => {
  // Socket instance state management
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Subscription management with Map for better performance
  const subscriptionsRef = useRef(new Map<string, Set<(data: any) => void>>());

  // Connection management with security and monitoring
  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      setLastError(null);

      const newSocket = io(config.baseURL, {
        ...config.options,
        auth: {
          token: await getAuthToken() // Implement your token retrieval logic
        }
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        setIsConnected(true);
        setIsConnecting(false);
        setRetryCount(0);
        console.info('WebSocket connected successfully');
      });

      newSocket.on('disconnect', (reason) => {
        setIsConnected(false);
        console.warn(`WebSocket disconnected: ${reason}`);
      });

      newSocket.on('error', (error: Error) => {
        setLastError(error);
        console.error('WebSocket error:', error);
      });

      newSocket.on('connect_error', (error: Error) => {
        setLastError(error);
        setIsConnecting(false);
        console.error('WebSocket connection error:', error);
      });

      // Message validation and handling
      newSocket.onAny((event, data) => {
        try {
          validateMessage(event, data);
          const callbacks = subscriptionsRef.current.get(event);
          callbacks?.forEach(callback => callback(data));
        } catch (error) {
          console.error('Invalid message received:', error);
        }
      });

      setSocket(newSocket);
    } catch (error) {
      setLastError(error as Error);
      setIsConnecting(false);
      throw error;
    }
  }, [config]);

  // Disconnect handling with cleanup
  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      subscriptionsRef.current.clear();
    }
  }, [socket]);

  // Reconnection logic with retry limiting
  const reconnect = useCallback(async () => {
    if (retryCount >= config.options.reconnectionAttempts) {
      throw new Error('Maximum reconnection attempts reached');
    }
    
    setRetryCount(prev => prev + 1);
    await connect();
  }, [connect, retryCount, config.options.reconnectionAttempts]);

  // Subscription management with cleanup
  const subscribe = useCallback((channel: string, callback: (data: any) => void) => {
    if (!subscriptionsRef.current.has(channel)) {
      subscriptionsRef.current.set(channel, new Set());
    }
    
    const callbacks = subscriptionsRef.current.get(channel)!;
    callbacks.add(callback);
    socket?.emit('subscribe', channel);

    // Return cleanup function
    return () => {
      const callbacks = subscriptionsRef.current.get(channel);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          subscriptionsRef.current.delete(channel);
          socket?.emit('unsubscribe', channel);
        }
      }
    };
  }, [socket]);

  // Unsubscribe from channel
  const unsubscribe = useCallback((channel: string) => {
    subscriptionsRef.current.delete(channel);
    socket?.emit('unsubscribe', channel);
  }, [socket]);

  // Connection lifecycle management
  useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout;

    if (socket && isConnected) {
      // Setup heartbeat monitoring
      heartbeatInterval = setInterval(() => {
        socket.emit(config.channels.system.health, { timestamp: Date.now() });
      }, config.options.pingInterval);

      // Setup performance monitoring
      socket.on(config.channels.system.metrics, (metrics) => {
        // Implement your metrics handling logic
        console.debug('WebSocket metrics:', metrics);
      });
    }

    return () => {
      clearInterval(heartbeatInterval);
      disconnect();
    };
  }, [socket, isConnected, config, disconnect]);

  // Context value with all WebSocket functionality
  const contextValue: WebSocketContextType = {
    socket,
    isConnected,
    isConnecting,
    lastError,
    retryCount,
    connect,
    disconnect,
    reconnect,
    subscribe,
    unsubscribe
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Helper function for message validation
const validateMessage = (event: string, data: any) => {
  if (!event || typeof event !== 'string') {
    throw new Error('Invalid event type');
  }
  if (data === undefined || data === null) {
    throw new Error('Invalid message data');
  }
};

// Helper function for auth token retrieval
const getAuthToken = async (): Promise<string> => {
  // Implement your token retrieval logic
  return 'your-auth-token';
};