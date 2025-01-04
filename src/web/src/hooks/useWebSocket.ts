import { useState, useEffect, useCallback, useRef } from 'react'; // v18.2.0
import { io, Socket } from 'socket.io-client'; // v4.7.2
import { websocketConfig } from '../config/websocket.config';

/**
 * Custom error type for WebSocket-specific errors
 */
interface WebSocketError {
  code: string;
  message: string;
  timestamp: Date;
  retryable: boolean;
}

/**
 * Connection performance metrics
 */
interface ConnectionStats {
  latency: number;
  reconnectCount: number;
  lastHeartbeat: Date;
  uptime: number;
}

/**
 * Return type for useWebSocket hook
 */
interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  error: WebSocketError | null;
  stats: ConnectionStats;
  resetConnection: () => Promise<void>;
}

const defaultStats: ConnectionStats = {
  latency: 0,
  reconnectCount: 0,
  lastHeartbeat: new Date(),
  uptime: 0
};

/**
 * Enhanced custom hook for managing WebSocket connections with advanced monitoring
 */
export const useWebSocket = (): UseWebSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<WebSocketError | null>(null);
  const [stats, setStats] = useState<ConnectionStats>(defaultStats);

  // Refs for tracking connection state and intervals
  const connectionStartTime = useRef<Date | null>(null);
  const heartbeatInterval = useRef<NodeJS.Timeout>();
  const uptimeInterval = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);

  /**
   * Creates a new Socket.IO instance with configured options
   */
  const createSocket = useCallback(() => {
    return io(websocketConfig.baseURL, websocketConfig.options);
  }, []);

  /**
   * Updates connection statistics
   */
  const updateStats = useCallback((updates: Partial<ConnectionStats>) => {
    setStats(current => ({
      ...current,
      ...updates
    }));
  }, []);

  /**
   * Measures and updates connection latency
   */
  const measureLatency = useCallback(() => {
    if (!socket) return;
    
    const start = Date.now();
    socket.emit('ping');
    socket.once('pong', () => {
      const latency = Date.now() - start;
      updateStats({ latency });
    });
  }, [socket, updateStats]);

  /**
   * Initializes connection monitoring
   */
  const initializeMonitoring = useCallback(() => {
    if (!socket) return;

    // Set up heartbeat check
    heartbeatInterval.current = setInterval(() => {
      measureLatency();
      updateStats({ lastHeartbeat: new Date() });
    }, websocketConfig.options.pingInterval);

    // Track uptime
    uptimeInterval.current = setInterval(() => {
      if (connectionStartTime.current) {
        const uptime = Date.now() - connectionStartTime.current.getTime();
        updateStats({ uptime });
      }
    }, 1000);
  }, [socket, measureLatency, updateStats]);

  /**
   * Establishes WebSocket connection
   */
  const connect = useCallback(async (): Promise<void> => {
    try {
      const newSocket = createSocket();
      
      newSocket.on('connect', () => {
        setIsConnected(true);
        setError(null);
        connectionStartTime.current = new Date();
        reconnectAttempts.current = 0;
        initializeMonitoring();
      });

      newSocket.on('disconnect', (reason) => {
        setIsConnected(false);
        setError({
          code: 'DISCONNECT',
          message: `Connection lost: ${reason}`,
          timestamp: new Date(),
          retryable: reason !== 'io client disconnect'
        });
      });

      newSocket.on('connect_error', (err) => {
        reconnectAttempts.current++;
        setError({
          code: 'CONNECT_ERROR',
          message: err.message,
          timestamp: new Date(),
          retryable: reconnectAttempts.current < websocketConfig.options.reconnectionAttempts
        });
        updateStats({ reconnectCount: reconnectAttempts.current });
      });

      setSocket(newSocket);
    } catch (err) {
      setError({
        code: 'INITIALIZATION_ERROR',
        message: err instanceof Error ? err.message : 'Failed to initialize WebSocket',
        timestamp: new Date(),
        retryable: true
      });
    }
  }, [createSocket, initializeMonitoring, updateStats]);

  /**
   * Disconnects WebSocket and cleans up resources
   */
  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      connectionStartTime.current = null;
      setStats(defaultStats);
    }
  }, [socket]);

  /**
   * Resets connection by performing disconnect and reconnect
   */
  const resetConnection = useCallback(async () => {
    disconnect();
    await connect();
  }, [disconnect, connect]);

  /**
   * Manages WebSocket lifecycle and cleanup
   */
  useEffect(() => {
    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      if (uptimeInterval.current) {
        clearInterval(uptimeInterval.current);
      }
      disconnect();
    };
  }, [disconnect]);

  return {
    socket,
    isConnected,
    connect,
    disconnect,
    error,
    stats,
    resetConnection
  };
};

export default useWebSocket;