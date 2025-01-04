/**
 * @fileoverview Authentication routes configuration for JetStream API Gateway
 * Implements OAuth 2.0 with Azure AD B2C integration, enhanced security features,
 * and comprehensive audit logging for the authentication service.
 * @version 1.0.0
 */

import express, { Router } from 'express'; // v4.18.2
import helmet from 'helmet'; // v7.0.0
import cors from 'cors'; // v2.8.5
import rateLimit from 'express-rate-limit'; // v6.7.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0

// Internal imports
import { AuthController } from '../controllers/auth.controller';
import { validateToken } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { logger } from '../../common/utils/logger';
import { ErrorCode } from '../../common/constants/error-codes';
import { HttpStatusCode } from '../../common/constants/status-codes';

// Route path constants
const AUTH_ROUTES = {
    LOGIN: '/login',
    LOGOUT: '/logout',
    REFRESH: '/refresh',
    MFA: '/mfa',
    HEALTH: '/health'
} as const;

// Rate limiting configurations
const RATE_LIMITS = {
    LOGIN: '30/5m',    // 30 requests per 5 minutes
    MFA: '5/5m',       // 5 attempts per 5 minutes
    REFRESH: '60/5m'   // 60 requests per 5 minutes
} as const;

// Validation schemas
const loginSchema = {
    email: 'string|email|required',
    password: 'string|min:8|required'
};

const refreshTokenSchema = {
    refreshToken: 'string|required'
};

const mfaSchema = {
    mfaCode: 'string|length:6|required',
    sessionId: 'string|uuid|required'
};

/**
 * Configures and returns Express router with enhanced authentication endpoints
 * @returns Configured Express router with secured auth routes
 */
export function configureAuthRoutes(): Router {
    const router = express.Router();
    const authController = new AuthController();

    // Apply security middleware
    router.use(helmet({
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        },
        noSniff: true,
        frameguard: { action: 'deny' },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    }));

    router.use(cors({
        origin: process.env.ALLOWED_ORIGINS?.split(','),
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['X-Correlation-ID'],
        credentials: true,
        maxAge: 600 // 10 minutes
    }));

    // Health check endpoint
    router.get(AUTH_ROUTES.HEALTH, (req, res) => {
        const correlationId = uuidv4();
        logger.info('Auth service health check', { correlationId });
        res.status(HttpStatusCode.OK).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            correlationId
        });
    });

    // Login endpoint with rate limiting and validation
    router.post(
        AUTH_ROUTES.LOGIN,
        rateLimit({
            windowMs: 5 * 60 * 1000, // 5 minutes
            max: parseInt(RATE_LIMITS.LOGIN.split('/')[0]),
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                logger.warn('Rate limit exceeded for login', {
                    ipAddress: req.ip,
                    correlationId: req.headers['x-correlation-id']
                });
                res.status(HttpStatusCode.TOO_MANY_REQUESTS).json({
                    code: ErrorCode.AUTHENTICATION_ERROR,
                    message: 'Too many login attempts. Please try again later.'
                });
            }
        }),
        validate({ schema: loginSchema, source: 'body' }),
        authController.login
    );

    // Logout endpoint with token validation
    router.post(
        AUTH_ROUTES.LOGOUT,
        validateToken,
        authController.logout
    );

    // Token refresh endpoint with rate limiting
    router.post(
        AUTH_ROUTES.REFRESH,
        rateLimit({
            windowMs: 5 * 60 * 1000,
            max: parseInt(RATE_LIMITS.REFRESH.split('/')[0]),
            standardHeaders: true,
            legacyHeaders: false
        }),
        validate({ schema: refreshTokenSchema, source: 'body' }),
        authController.refreshToken
    );

    // MFA verification endpoint with strict rate limiting
    router.post(
        AUTH_ROUTES.MFA,
        rateLimit({
            windowMs: 5 * 60 * 1000,
            max: parseInt(RATE_LIMITS.MFA.split('/')[0]),
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                logger.warn('Rate limit exceeded for MFA verification', {
                    sessionId: req.body.sessionId,
                    correlationId: req.headers['x-correlation-id']
                });
                res.status(HttpStatusCode.TOO_MANY_REQUESTS).json({
                    code: ErrorCode.AUTHENTICATION_ERROR,
                    message: 'Too many MFA attempts. Please try again later.'
                });
            }
        }),
        validate({ schema: mfaSchema, source: 'body' }),
        authController.verifyMFA
    );

    // Error handling for auth routes
    router.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
        const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
        
        logger.error('Authentication error', err, {
            correlationId,
            path: req.path,
            method: req.method,
            ipAddress: req.ip
        });

        res.status(err.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
            code: err.code || ErrorCode.AUTHENTICATION_ERROR,
            message: err.message || 'Authentication failed',
            correlationId
        });
    });

    return router;
}

// Export configured router
export default configureAuthRoutes();