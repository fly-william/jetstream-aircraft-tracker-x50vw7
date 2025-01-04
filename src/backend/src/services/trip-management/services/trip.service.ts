/**
 * @fileoverview Core service implementation for trip management functionality
 * @version 1.0.0
 * 
 * Implements comprehensive trip lifecycle operations with optimistic locking,
 * transaction management, and integration with Teams notifications and CRM sync.
 */

// External imports
import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { Cache } from '@nestjs/cache-manager'; // v10.x
import { Metrics } from '@nestjs/metrics'; // v10.x
import { CircuitBreaker } from 'opossum'; // v6.0.0

// Internal imports
import { Trip } from '../models/trip.model';
import { TripRepository } from '../repositories/trip.repository';
import { CrmSyncService } from './crm-sync.service';
import { TeamsService } from '../../notification/services/teams.service';
import { TripStatus, ITripCreate, ITripUpdate } from '../../../common/interfaces/trip.interface';
import { ErrorCode, ERROR_MESSAGES } from '../../../common/constants/error-codes';
import { logger } from '../../../common/utils/logger';

@Injectable()
export class TripService {
    private readonly logger = new Logger(TripService.name);
    private readonly crmCircuitBreaker: CircuitBreaker;
    private readonly teamsCircuitBreaker: CircuitBreaker;

    constructor(
        private readonly tripRepository: TripRepository,
        private readonly crmSyncService: CrmSyncService,
        private readonly teamsService: TeamsService,
        private readonly metrics: Metrics,
        private readonly cache: Cache
    ) {
        // Initialize circuit breakers
        this.crmCircuitBreaker = new CircuitBreaker(this.crmSyncService.syncTripToCrm, {
            timeout: 5000,
            resetTimeout: 10000,
            errorThresholdPercentage: 50
        });

        this.teamsCircuitBreaker = new CircuitBreaker(this.teamsService.sendStatusUpdate, {
            timeout: 3000,
            resetTimeout: 5000,
            errorThresholdPercentage: 50
        });

        // Circuit breaker event handlers
        this.crmCircuitBreaker.on('open', () => {
            logger.error('CRM sync circuit breaker opened', new Error(ErrorCode.CRM_SYNC_ERROR));
        });

        this.teamsCircuitBreaker.on('open', () => {
            logger.error('Teams notification circuit breaker opened', new Error(ErrorCode.TEAMS_INTEGRATION_ERROR));
        });
    }

    /**
     * Creates a new trip with comprehensive validation and integration
     * @param tripData Trip creation data
     * @param userId User creating the trip
     */
    async createTrip(tripData: ITripCreate, userId: UUID): Promise<Trip> {
        const startTime = Date.now();
        this.metrics.increment('trip.create.attempts');

        try {
            // Validate trip data
            this.validateTripData(tripData);

            // Create trip with transaction
            const trip = await this.tripRepository.createTrip(tripData, userId);

            // Attempt CRM sync with circuit breaker
            await this.crmCircuitBreaker.fire(trip.id)
                .catch(error => {
                    logger.error('CRM sync failed during trip creation', error, {
                        tripId: trip.id,
                        userId
                    });
                });

            // Send Teams notification with circuit breaker
            await this.teamsCircuitBreaker.fire(
                trip,
                userId,
                ['operations', 'sales'],
                { operations: ['primary'] }
            ).catch(error => {
                logger.error('Teams notification failed during trip creation', error, {
                    tripId: trip.id,
                    userId
                });
            });

            // Cache trip data
            await this.cache.set(`trip:${trip.id}`, trip, { ttl: 300 });

            // Record metrics
            const duration = Date.now() - startTime;
            this.metrics.timing('trip.create.duration', duration);
            this.metrics.increment('trip.create.success');

            logger.info('Trip created successfully', {
                tripId: trip.id,
                userId,
                duration
            });

            return trip;
        } catch (error) {
            this.metrics.increment('trip.create.errors');
            logger.error('Failed to create trip', error as Error, {
                userId,
                tripData
            });
            throw error;
        }
    }

    /**
     * Updates trip status with optimistic locking and integration
     * @param tripId Trip UUID
     * @param newStatus New trip status
     * @param userId User updating the status
     */
    async updateTripStatus(tripId: UUID, newStatus: TripStatus, userId: UUID): Promise<Trip> {
        const startTime = Date.now();
        this.metrics.increment('trip.status.update.attempts');

        try {
            // Validate status transition
            const trip = await this.tripRepository.findById(tripId);
            this.validateStatusTransition(trip.status, newStatus);

            // Update status with optimistic locking
            const updatedTrip = await this.tripRepository.updateTripStatus(
                tripId,
                newStatus,
                userId
            );

            // Parallel integration updates with Promise.allSettled
            const [crmResult, teamsResult] = await Promise.allSettled([
                this.crmCircuitBreaker.fire(tripId),
                this.teamsCircuitBreaker.fire(
                    updatedTrip,
                    userId,
                    ['operations', 'sales'],
                    { operations: ['primary'] }
                )
            ]);

            // Handle integration results
            if (crmResult.status === 'rejected') {
                logger.error('CRM sync failed during status update', crmResult.reason, {
                    tripId,
                    userId
                });
            }

            if (teamsResult.status === 'rejected') {
                logger.error('Teams notification failed during status update', teamsResult.reason, {
                    tripId,
                    userId
                });
            }

            // Update cache
            await this.cache.set(`trip:${tripId}`, updatedTrip, { ttl: 300 });

            // Record metrics
            const duration = Date.now() - startTime;
            this.metrics.timing('trip.status.update.duration', duration);
            this.metrics.increment('trip.status.update.success');

            logger.info('Trip status updated successfully', {
                tripId,
                previousStatus: trip.status,
                newStatus,
                userId,
                duration
            });

            return updatedTrip;
        } catch (error) {
            this.metrics.increment('trip.status.update.errors');
            logger.error('Failed to update trip status', error as Error, {
                tripId,
                newStatus,
                userId
            });
            throw error;
        }
    }

    /**
     * Validates trip creation data
     * @param tripData Trip data to validate
     */
    private validateTripData(tripData: ITripCreate): void {
        if (!tripData.aircraftId) {
            throw new BadRequestException(ERROR_MESSAGES.VALIDATION_ERROR);
        }

        if (!tripData.startTime || !tripData.endTime) {
            throw new BadRequestException(ERROR_MESSAGES.VALIDATION_ERROR);
        }

        if (new Date(tripData.startTime) >= new Date(tripData.endTime)) {
            throw new BadRequestException('Trip end time must be after start time');
        }
    }

    /**
     * Validates trip status transitions
     * @param currentStatus Current trip status
     * @param newStatus Requested new status
     */
    private validateStatusTransition(currentStatus: TripStatus, newStatus: TripStatus): void {
        const validTransitions: Record<TripStatus, TripStatus[]> = {
            [TripStatus.SCHEDULED]: [TripStatus.IN_POSITION, TripStatus.CANCELLED],
            [TripStatus.IN_POSITION]: [TripStatus.BOARDING, TripStatus.CANCELLED],
            [TripStatus.BOARDING]: [TripStatus.DEPARTED, TripStatus.CANCELLED],
            [TripStatus.DEPARTED]: [TripStatus.ENROUTE],
            [TripStatus.ENROUTE]: [TripStatus.ARRIVED],
            [TripStatus.ARRIVED]: [TripStatus.COMPLETED],
            [TripStatus.COMPLETED]: [],
            [TripStatus.CANCELLED]: []
        };

        if (!validTransitions[currentStatus]?.includes(newStatus)) {
            throw new BadRequestException(ERROR_MESSAGES.INVALID_STATUS_TRANSITION);
        }
    }
}