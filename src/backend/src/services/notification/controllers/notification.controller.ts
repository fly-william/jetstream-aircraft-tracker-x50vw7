/**
 * @fileoverview Notification controller for handling Teams integration endpoints
 * @version 1.0.0
 */

// External imports
import { Request, Response } from 'express'; // v4.18.2
import { injectable, inject } from 'inversify'; // v6.0.1
import { controller, httpPost, httpGet } from 'inversify-express-utils'; // v6.4.3
import { body, validationResult } from 'express-validator'; // v7.0.1
import CircuitBreaker from 'circuit-breaker-js'; // v0.0.1
import NodeCache from 'node-cache'; // v5.1.2
import compression from 'compression'; // v1.7.4
import cors from 'cors'; // v2.8.5

// Internal imports
import { TeamsService } from '../services/teams.service';
import { logger } from '../../../common/utils/logger';
import { ErrorCode, ERROR_MESSAGES } from '../../../common/constants/error-codes';
import { ITrip, IMilestone } from '../../../common/interfaces/trip.interface';

// Constants
const CACHE_TTL = 300; // 5 minutes
const CIRCUIT_BREAKER_OPTIONS = {
    timeout: 10000,
    errorThreshold: 50,
    volumeThreshold: 10,
    resetTimeout: 30000
};

/**
 * Controller handling notification endpoints with comprehensive error handling
 */
@controller('/notifications')
@injectable()
export class NotificationController {
    private readonly cache: NodeCache;
    private readonly circuitBreaker: CircuitBreaker;

    constructor(
        @inject('TeamsService') private readonly teamsService: TeamsService
    ) {
        // Initialize cache
        this.cache = new NodeCache({
            stdTTL: CACHE_TTL,
            checkperiod: 60,
            useClones: false
        });

        // Initialize circuit breaker
        this.circuitBreaker = new CircuitBreaker({
            ...CIRCUIT_BREAKER_OPTIONS,
            onOpen: () => {
                logger.error('Teams notification circuit breaker opened');
            },
            onClose: () => {
                logger.info('Teams notification circuit breaker closed');
            }
        });
    }

    /**
     * Validates and sends trip status update notifications
     */
    @httpPost('/status')
    async sendStatusNotification(
        @body('trip') trip: ITrip,
        @body('updatedBy') updatedBy: string,
        @body('targetChannels') targetChannels: string[],
        @body('departmentRules') departmentRules: Record<string, string[]>,
        req: Request,
        res: Response
    ): Promise<void> {
        const correlationId = req.headers['x-correlation-id'] as string;

        try {
            // Validate request payload
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                logger.warn('Invalid status notification request', {
                    correlationId,
                    errors: errors.array()
                });
                res.status(400).json({
                    code: ErrorCode.VALIDATION_ERROR,
                    message: ERROR_MESSAGES.VALIDATION_ERROR,
                    errors: errors.array()
                });
                return;
            }

            // Check cache for duplicate notifications
            const cacheKey = `status-${trip.id}-${trip.status}`;
            if (this.cache.has(cacheKey)) {
                logger.info('Duplicate status notification skipped', {
                    correlationId,
                    tripId: trip.id
                });
                res.status(200).json({
                    message: 'Notification skipped (duplicate)',
                    cached: true
                });
                return;
            }

            // Send notification through circuit breaker
            const result = await this.circuitBreaker.run(
                async () => {
                    return this.teamsService.sendStatusUpdate(
                        trip,
                        updatedBy,
                        targetChannels,
                        departmentRules
                    );
                }
            );

            // Cache successful notification
            this.cache.set(cacheKey, true);

            logger.info('Status notification sent successfully', {
                correlationId,
                tripId: trip.id,
                channels: result.length
            });

            res.status(200).json({
                message: 'Notification sent successfully',
                results: result
            });

        } catch (error: any) {
            logger.error('Failed to send status notification', error, {
                correlationId,
                tripId: trip.id
            });

            res.status(500).json({
                code: ErrorCode.TEAMS_INTEGRATION_ERROR,
                message: ERROR_MESSAGES.TEAMS_INTEGRATION_ERROR
            });
        }
    }

    /**
     * Validates and sends trip milestone update notifications
     */
    @httpPost('/milestone')
    async sendMilestoneNotification(
        @body('trip') trip: ITrip,
        @body('milestone') milestone: IMilestone,
        @body('updatedBy') updatedBy: string,
        @body('targetChannels') targetChannels: string[],
        @body('departmentRules') departmentRules: Record<string, string[]>,
        req: Request,
        res: Response
    ): Promise<void> {
        const correlationId = req.headers['x-correlation-id'] as string;

        try {
            // Validate request payload
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                logger.warn('Invalid milestone notification request', {
                    correlationId,
                    errors: errors.array()
                });
                res.status(400).json({
                    code: ErrorCode.VALIDATION_ERROR,
                    message: ERROR_MESSAGES.VALIDATION_ERROR,
                    errors: errors.array()
                });
                return;
            }

            // Check cache for duplicate notifications
            const cacheKey = `milestone-${milestone.id}`;
            if (this.cache.has(cacheKey)) {
                logger.info('Duplicate milestone notification skipped', {
                    correlationId,
                    milestoneId: milestone.id
                });
                res.status(200).json({
                    message: 'Notification skipped (duplicate)',
                    cached: true
                });
                return;
            }

            // Send notification through circuit breaker
            const result = await this.circuitBreaker.run(
                async () => {
                    return this.teamsService.sendTripUpdate(
                        trip,
                        milestone,
                        updatedBy,
                        targetChannels,
                        departmentRules
                    );
                }
            );

            // Cache successful notification
            this.cache.set(cacheKey, true);

            logger.info('Milestone notification sent successfully', {
                correlationId,
                tripId: trip.id,
                milestoneId: milestone.id,
                channels: result.length
            });

            res.status(200).json({
                message: 'Notification sent successfully',
                results: result
            });

        } catch (error: any) {
            logger.error('Failed to send milestone notification', error, {
                correlationId,
                tripId: trip.id,
                milestoneId: milestone.id
            });

            res.status(500).json({
                code: ErrorCode.TEAMS_INTEGRATION_ERROR,
                message: ERROR_MESSAGES.TEAMS_INTEGRATION_ERROR
            });
        }
    }

    /**
     * Health check endpoint for monitoring
     */
    @httpGet('/health')
    async healthCheck(req: Request, res: Response): Promise<void> {
        try {
            const status = {
                service: 'notification-service',
                status: 'healthy',
                circuitBreaker: this.circuitBreaker.isOpen() ? 'open' : 'closed',
                timestamp: new Date().toISOString()
            };

            res.status(200).json(status);
        } catch (error) {
            logger.error('Health check failed', error as Error);
            res.status(500).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString()
            });
        }
    }
}

export default NotificationController;