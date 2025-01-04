/**
 * @fileoverview Aircraft routes configuration for JetStream API Gateway
 * Implements secure, rate-limited endpoints for real-time position tracking
 * and fleet management with comprehensive role-based access control.
 * @version 1.0.0
 */

import { Router } from 'express'; // v4.18.2
import { rateLimit } from 'express-rate-limit'; // v6.7.0
import cache from 'express-cache-middleware'; // v1.0.0
import { validateToken, requireRoles } from '../middleware/auth.middleware';
import { validatePosition } from '../middleware/validation.middleware';
import { PositionController } from '../../services/aircraft-tracking/controllers/position.controller';
import { logger } from '../../common/utils/logger';
import { ErrorCode } from '../../common/constants/error-codes';
import { HttpStatusCode } from '../../common/constants/status-codes';

// Role definitions for access control
const ROLES = {
    OPERATIONS: 'operations',
    SALES: 'sales',
    CUSTOMER_SERVICE: 'customer_service',
    MANAGEMENT: 'management'
} as const;

// Rate limit configurations based on technical requirements
const RATE_LIMITS = {
    POSITION_UPDATE: '300/min', // 300 requests per minute for position updates
    POSITION_GET: '300/min',    // 300 requests per minute for position queries
    HISTORY_GET: '100/min'      // 100 requests per minute for historical data
} as const;

/**
 * Configures and returns Express router with aircraft-related endpoints
 * Implements authentication, authorization, rate limiting, and caching
 */
export function configureAircraftRoutes(): Router {
    const router = Router();
    const positionController = new PositionController();

    // Apply global authentication middleware
    router.use(validateToken);

    // Configure caching middleware
    const cacheMiddleware = cache({
        enabled: process.env.NODE_ENV === 'production',
        defaultDuration: 5000, // 5 seconds default cache
        cacheHeader: 'x-cache'
    });

    // Position update endpoint - Operations only
    router.post(
        '/api/v1/aircraft/:id/position',
        rateLimit({
            windowMs: 60 * 1000, // 1 minute
            max: 300, // 300 requests per minute
            message: { error: ErrorCode.TOO_MANY_REQUESTS }
        }),
        requireRoles([ROLES.OPERATIONS]),
        validatePosition,
        async (req, res, next) => {
            try {
                const position = await positionController.updatePosition(req.body);
                logger.info('Position updated successfully', {
                    aircraftId: req.params.id,
                    correlationId: req.correlationId
                });
                res.status(HttpStatusCode.OK).json(position);
            } catch (error) {
                next(error);
            }
        }
    );

    // Latest position endpoint - All roles
    router.get(
        '/api/v1/aircraft/:id/position/latest',
        rateLimit({
            windowMs: 60 * 1000,
            max: 300,
            message: { error: ErrorCode.TOO_MANY_REQUESTS }
        }),
        requireRoles([
            ROLES.OPERATIONS,
            ROLES.SALES,
            ROLES.CUSTOMER_SERVICE,
            ROLES.MANAGEMENT
        ]),
        cacheMiddleware,
        async (req, res, next) => {
            try {
                const position = await positionController.getLatestPosition(req.params.id);
                if (!position) {
                    res.status(HttpStatusCode.NOT_FOUND).json({
                        error: ErrorCode.RESOURCE_NOT_FOUND,
                        message: 'No position data found for aircraft'
                    });
                    return;
                }
                res.status(HttpStatusCode.OK).json(position);
            } catch (error) {
                next(error);
            }
        }
    );

    // Position history endpoint - Operations and Management only
    router.get(
        '/api/v1/aircraft/:id/position/history',
        rateLimit({
            windowMs: 60 * 1000,
            max: 100,
            message: { error: ErrorCode.TOO_MANY_REQUESTS }
        }),
        requireRoles([ROLES.OPERATIONS, ROLES.MANAGEMENT]),
        cacheMiddleware,
        async (req, res, next) => {
            try {
                const { startTime, endTime, page = '1', limit = '100' } = req.query;
                
                const positions = await positionController.getPositionHistory(
                    req.params.id,
                    new Date(startTime as string),
                    new Date(endTime as string),
                    {
                        page: parseInt(page as string),
                        limit: parseInt(limit as string)
                    }
                );
                
                res.status(HttpStatusCode.OK).json(positions);
            } catch (error) {
                next(error);
            }
        }
    );

    // Error handling middleware
    router.use((error: Error, req: any, res: any, next: any) => {
        logger.error('Aircraft route error', error, {
            path: req.path,
            method: req.method,
            correlationId: req.correlationId
        });
        
        res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
            error: ErrorCode.INTERNAL_SERVER_ERROR,
            message: 'An unexpected error occurred',
            correlationId: req.correlationId
        });
    });

    return router;
}

// Export configured router
export default configureAircraftRoutes();