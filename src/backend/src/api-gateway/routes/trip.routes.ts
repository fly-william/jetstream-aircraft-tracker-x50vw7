/**
 * @fileoverview Trip management routes for the JetStream platform API Gateway
 * Implements secure, monitored, and validated routes for trip operations with
 * comprehensive error handling and audit logging.
 * @version 1.0.0
 */

import express, { Router, Request, Response, NextFunction } from 'express'; // v4.18.2
import rateLimit from 'express-rate-limit'; // v6.7.0
import compression from 'compression'; // v1.7.4
import cors from 'cors'; // v2.8.5
import { TripController } from '../../services/trip-management/controllers/trip.controller';
import { validateToken, requireRoles } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { tripSchema } from '../../common/validators/trip.validator';
import { logger } from '../../common/utils/logger';
import { ApiError } from '../middleware/error.middleware';
import { ErrorCode } from '../../common/constants/error-codes';
import { HttpStatusCode } from '../../common/constants/status-codes';

// Role definitions for access control
const ROLES = {
    OPERATIONS: 'operations',
    SALES: 'sales',
    CUSTOMER_SERVICE: 'customer_service',
    MANAGEMENT: 'management'
} as const;

// Rate limit configurations
const RATE_LIMITS = {
    CREATE_TRIP: '50/min',
    UPDATE_STATUS: '100/min',
    GET_TRIPS: '300/min'
} as const;

// Initialize controller
const tripController = new TripController();

// Configure rate limiters
const createTripLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 50,
    message: 'Too many trip creation requests, please try again later'
});

const updateStatusLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: 'Too many status update requests, please try again later'
});

const getTripLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    message: 'Too many trip retrieval requests, please try again later'
});

// Create router instance
const router: Router = express.Router();

// Apply global middleware
router.use(compression());
router.use(cors());
router.use(express.json());

// Security headers
router.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

// Create new trip - Operations only
router.post('/',
    validateToken,
    requireRoles([ROLES.OPERATIONS]),
    validate({ schema: tripSchema }),
    createTripLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const trip = await tripController.createTrip(req.body);
            
            logger.info('Trip created successfully', {
                tripId: trip.id,
                userId: req.user?.id,
                correlationId: req.correlationId
            });

            res.status(HttpStatusCode.CREATED).json(trip);
        } catch (error) {
            next(new ApiError(
                HttpStatusCode.INTERNAL_SERVER_ERROR,
                ErrorCode.INTERNAL_SERVER_ERROR,
                'Failed to create trip',
                { error: error.message },
                req.correlationId
            ));
        }
    }
);

// Update trip status - Operations only
router.patch('/:tripId/status',
    validateToken,
    requireRoles([ROLES.OPERATIONS]),
    validate({ schema: tripSchema.pick({ status: true }) }),
    updateStatusLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const trip = await tripController.updateTripStatus(
                req.params.tripId,
                req.body.status,
                req.user?.id
            );

            logger.info('Trip status updated successfully', {
                tripId: trip.id,
                status: trip.status,
                userId: req.user?.id,
                correlationId: req.correlationId
            });

            res.status(HttpStatusCode.OK).json(trip);
        } catch (error) {
            next(new ApiError(
                HttpStatusCode.INTERNAL_SERVER_ERROR,
                ErrorCode.INTERNAL_SERVER_ERROR,
                'Failed to update trip status',
                { error: error.message },
                req.correlationId
            ));
        }
    }
);

// Get active trips - All roles
router.get('/active',
    validateToken,
    requireRoles([ROLES.OPERATIONS, ROLES.SALES, ROLES.CUSTOMER_SERVICE, ROLES.MANAGEMENT]),
    getTripLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { page = 1, limit = 10 } = req.query;
            const trips = await tripController.getActiveTrips({
                page: Number(page),
                limit: Number(limit)
            });

            logger.info('Active trips retrieved successfully', {
                userId: req.user?.id,
                correlationId: req.correlationId,
                count: trips.length
            });

            res.status(HttpStatusCode.OK).json(trips);
        } catch (error) {
            next(new ApiError(
                HttpStatusCode.INTERNAL_SERVER_ERROR,
                ErrorCode.INTERNAL_SERVER_ERROR,
                'Failed to retrieve active trips',
                { error: error.message },
                req.correlationId
            ));
        }
    }
);

// Get specific trip - All roles
router.get('/:tripId',
    validateToken,
    requireRoles([ROLES.OPERATIONS, ROLES.SALES, ROLES.CUSTOMER_SERVICE, ROLES.MANAGEMENT]),
    getTripLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const trip = await tripController.getTripById(req.params.tripId);

            if (!trip) {
                throw new ApiError(
                    HttpStatusCode.NOT_FOUND,
                    ErrorCode.RESOURCE_NOT_FOUND,
                    'Trip not found',
                    { tripId: req.params.tripId },
                    req.correlationId
                );
            }

            logger.info('Trip retrieved successfully', {
                tripId: trip.id,
                userId: req.user?.id,
                correlationId: req.correlationId
            });

            res.status(HttpStatusCode.OK).json(trip);
        } catch (error) {
            next(error instanceof ApiError ? error : new ApiError(
                HttpStatusCode.INTERNAL_SERVER_ERROR,
                ErrorCode.INTERNAL_SERVER_ERROR,
                'Failed to retrieve trip',
                { error: error.message },
                req.correlationId
            ));
        }
    }
);

export default router;