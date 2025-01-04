/**
 * @fileoverview Main API Gateway server configuration and initialization for JetStream platform
 * Implements secure routing, authentication, rate limiting, and real-time WebSocket connections
 * with enhanced security, performance, and reliability features.
 * 
 * @version 1.0.0
 */

import express from 'express'; // ^4.18.2
import helmet from 'helmet'; // ^6.0.0
import compression from 'compression'; // ^1.7.4
import { WebSocketServer } from 'ws'; // ^8.13.0
import http from 'http';
import CircuitBreaker from 'circuit-breaker-js'; // ^0.5.0
import { HealthCheck } from '@healthcheck/core'; // ^1.0.0
import { corsConfig } from './config/cors.config';
import { createRateLimiter, defaultConfig as rateLimitConfig } from './config/rate-limit.config';
import { validateToken } from './middleware/auth.middleware';
import { logger } from '../common/utils/logger';
import { HttpStatusCode } from '../common/constants/status-codes';
import { ErrorCode } from '../common/constants/error-codes';

// Server configuration constants
const PORT = process.env.PORT || 3000;
const WS_PATH = '/ws';
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const MAX_PAYLOAD_SIZE = 5242880; // 5MB

// Initialize Express application
const app = express();

/**
 * Configures comprehensive Express middleware stack with security and performance features
 * @param app Express application instance
 */
const configureMiddleware = (app: express.Application): void => {
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", process.env.API_URL as string],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  // CORS configuration
  app.use(corsConfig);

  // Compression middleware
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6,
  }));

  // Body parsing middleware
  app.use(express.json({ limit: MAX_PAYLOAD_SIZE }));
  app.use(express.urlencoded({ extended: true, limit: MAX_PAYLOAD_SIZE }));

  // Rate limiting middleware
  const rateLimiter = createRateLimiter(rateLimitConfig, {
    host: process.env.REDIS_HOST as string,
    port: parseInt(process.env.REDIS_PORT as string),
    password: process.env.REDIS_PASSWORD,
  });
  app.use(rateLimiter);

  // Authentication middleware
  app.use(validateToken);

  // Request ID middleware
  app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-ID', req.id);
    next();
  });

  // Response time monitoring
  app.use((req, res, next) => {
    const start = process.hrtime();
    res.on('finish', () => {
      const [seconds, nanoseconds] = process.hrtime(start);
      const duration = seconds * 1000 + nanoseconds / 1e6;
      logger.info('Request completed', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        requestId: req.id,
      });
    });
    next();
  });

  // Health check endpoint
  const healthCheck = new HealthCheck();
  app.get('/health', (req, res) => {
    const health = healthCheck.getStatus();
    res.status(health.status === 'up' ? 200 : 503).json(health);
  });

  // Circuit breaker middleware
  const breaker = new CircuitBreaker({
    windowDuration: 10000,
    numBuckets: 10,
    timeoutDuration: 3000,
    errorThreshold: 50,
    volumeThreshold: 10,
  });
  app.use((req, res, next) => {
    breaker.run(next, (err) => {
      logger.error('Circuit breaker triggered', err);
      res.status(HttpStatusCode.SERVICE_UNAVAILABLE).json({
        error: ErrorCode.SERVICE_UNAVAILABLE,
        requestId: req.id,
      });
    });
  });
};

/**
 * Sets up WebSocket server with enhanced reliability features
 * @param server HTTP server instance
 * @returns Configured WebSocket server
 */
const configureWebSocket = (server: http.Server): WebSocketServer => {
  const wss = new WebSocketServer({ server, path: WS_PATH });

  // Connection handling
  wss.on('connection', (ws, req) => {
    const clientId = crypto.randomUUID();
    ws.id = clientId;

    logger.info('WebSocket connection established', {
      clientId,
      ip: req.socket.remoteAddress,
    });

    // Heartbeat mechanism
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Message handling
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        // Process message based on type
        logger.debug('WebSocket message received', {
          clientId,
          type: message.type,
        });
      } catch (error) {
        logger.error('WebSocket message processing error', error as Error);
      }
    });

    // Error handling
    ws.on('error', (error) => {
      logger.error('WebSocket error', error, { clientId });
    });

    // Cleanup on close
    ws.on('close', () => {
      logger.info('WebSocket connection closed', { clientId });
    });
  });

  // Heartbeat interval
  setInterval(() => {
    wss.clients.forEach((ws: any) => {
      if (!ws.isAlive) {
        logger.warn('Terminating inactive WebSocket connection', { clientId: ws.id });
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);

  return wss;
};

/**
 * Initializes and starts the HTTP and WebSocket servers
 * @param app Express application instance
 */
const startServer = async (app: express.Application): Promise<void> => {
  try {
    // Configure middleware
    configureMiddleware(app);

    // Create HTTP server
    const server = http.createServer(app);

    // Configure WebSocket server
    const wss = configureWebSocket(server);

    // Start server
    server.listen(PORT, () => {
      logger.info(`Server started successfully`, {
        port: PORT,
        environment: process.env.NODE_ENV,
        websocketPath: WS_PATH,
      });
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down server...');
      
      // Close WebSocket server
      wss.close(() => {
        logger.info('WebSocket server closed');
      });

      // Close HTTP server
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force exit after timeout
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Server startup failed', error as Error);
    process.exit(1);
  }
};

// Start server
startServer(app);

// Export app instance for testing
export { app };