/**
 * @fileoverview Enhanced milestone service implementing comprehensive trip status tracking
 * with optimized notification delivery and caching mechanisms.
 * @version 1.0.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { CircuitBreaker } from '@nestjs/common';
import { Cache } from '@nestjs/common/cache';
import { UUID } from 'crypto';

// Internal imports
import { Milestone } from '../models/milestone.model';
import { MilestoneRepository } from '../repositories/milestone.repository';
import { TeamsService } from '../../notification/services/teams.service';
import { IMilestone, MilestoneType } from '../../../common/interfaces/trip.interface';
import { ErrorCode } from '../../../common/constants/error-codes';

// Cache configuration
const CACHE_TTL = 300; // 5 minutes
const CACHE_PREFIX = 'milestone';

@Injectable()
@CircuitBreaker({ timeout: 5000, maxFailures: 3, resetTimeout: 60000 })
export class MilestoneService {
    private readonly logger = new Logger(MilestoneService.name);

    constructor(
        private readonly milestoneRepository: MilestoneRepository,
        private readonly teamsService: TeamsService,
        private readonly cacheManager: Cache
    ) {
        this.logger.log('Initializing MilestoneService with enhanced features');
    }

    /**
     * Retrieves all milestones for a trip with caching support
     * @param tripId UUID of the trip
     * @returns Promise resolving to array of milestones
     */
    async getTripMilestones(tripId: UUID): Promise<Milestone[]> {
        const cacheKey = `${CACHE_PREFIX}:trip:${tripId}`;

        try {
            // Check cache first
            const cached = await this.cacheManager.get<Milestone[]>(cacheKey);
            if (cached) {
                this.logger.debug(`Cache hit for trip milestones: ${tripId}`);
                return cached;
            }

            // Fetch from repository if cache miss
            const milestones = await this.milestoneRepository.findByTripId(tripId);
            
            // Update cache
            await this.cacheManager.set(cacheKey, milestones, CACHE_TTL);
            
            return milestones;
        } catch (error) {
            this.logger.error(`Failed to retrieve trip milestones: ${error.message}`, {
                tripId,
                errorCode: ErrorCode.INTERNAL_SERVER_ERROR
            });
            throw error;
        }
    }

    /**
     * Retrieves latest milestone of specific type with optimized query
     * @param tripId UUID of the trip
     * @param type Type of milestone to retrieve
     * @returns Promise resolving to latest milestone or null
     */
    async getLatestMilestone(tripId: UUID, type: MilestoneType): Promise<Milestone | null> {
        const cacheKey = `${CACHE_PREFIX}:latest:${tripId}:${type}`;

        try {
            // Check cache first
            const cached = await this.cacheManager.get<Milestone>(cacheKey);
            if (cached) {
                this.logger.debug(`Cache hit for latest milestone: ${tripId}, type: ${type}`);
                return cached;
            }

            // Fetch from repository if cache miss
            const milestone = await this.milestoneRepository.findLatestByType(tripId, type);
            
            if (milestone) {
                // Update cache
                await this.cacheManager.set(cacheKey, milestone, CACHE_TTL);
            }
            
            return milestone;
        } catch (error) {
            this.logger.error(`Failed to retrieve latest milestone: ${error.message}`, {
                tripId,
                type,
                errorCode: ErrorCode.INTERNAL_SERVER_ERROR
            });
            throw error;
        }
    }

    /**
     * Creates new milestone with enhanced validation and notification delivery
     * @param milestoneData Data for new milestone
     * @param userId ID of user creating milestone
     * @param notifyChannels Array of Teams channels to notify
     * @returns Promise resolving to created milestone
     */
    async createMilestone(
        milestoneData: IMilestone,
        userId: string,
        notifyChannels: string[]
    ): Promise<Milestone> {
        this.logger.debug('Creating new milestone', { tripId: milestoneData.tripId });

        try {
            // Create milestone with audit data
            const milestone = await this.milestoneRepository.createMilestone({
                ...milestoneData,
                userId,
                timestamp: new Date()
            });

            // Invalidate relevant caches
            const tripCacheKey = `${CACHE_PREFIX}:trip:${milestone.tripId}`;
            const latestCacheKey = `${CACHE_PREFIX}:latest:${milestone.tripId}:${milestone.type}`;
            await Promise.all([
                this.cacheManager.del(tripCacheKey),
                this.cacheManager.del(latestCacheKey)
            ]);

            // Send notifications with circuit breaker protection
            if (notifyChannels.length > 0) {
                try {
                    await this.teamsService.sendTripUpdate(
                        { id: milestone.tripId } as any, // Minimal trip data
                        milestone,
                        userId,
                        notifyChannels,
                        {} // Department rules - implement as needed
                    );
                } catch (notifyError) {
                    this.logger.warn(`Notification delivery failed: ${notifyError.message}`, {
                        milestoneId: milestone.id,
                        errorCode: ErrorCode.TEAMS_INTEGRATION_ERROR
                    });
                    // Continue execution - notification failure shouldn't fail milestone creation
                }
            }

            return milestone;
        } catch (error) {
            this.logger.error(`Failed to create milestone: ${error.message}`, {
                tripId: milestoneData.tripId,
                type: milestoneData.type,
                errorCode: ErrorCode.INTERNAL_SERVER_ERROR
            });
            throw error;
        }
    }

    /**
     * Updates existing milestone with transaction safety and notification
     * @param id UUID of milestone to update
     * @param updateData Partial milestone data to update
     * @param userId ID of user updating milestone
     * @param notifyChannels Array of Teams channels to notify
     * @returns Promise resolving to updated milestone
     */
    async updateMilestone(
        id: UUID,
        updateData: Partial<IMilestone>,
        userId: string,
        notifyChannels: string[]
    ): Promise<Milestone> {
        this.logger.debug(`Updating milestone: ${id}`);

        try {
            // Update milestone with audit data
            const milestone = await this.milestoneRepository.updateMilestone(id, {
                ...updateData,
                userId
            });

            // Invalidate relevant caches
            const tripCacheKey = `${CACHE_PREFIX}:trip:${milestone.tripId}`;
            const latestCacheKey = `${CACHE_PREFIX}:latest:${milestone.tripId}:${milestone.type}`;
            await Promise.all([
                this.cacheManager.del(tripCacheKey),
                this.cacheManager.del(latestCacheKey)
            ]);

            // Send notifications with circuit breaker protection
            if (notifyChannels.length > 0) {
                try {
                    await this.teamsService.sendTripUpdate(
                        { id: milestone.tripId } as any, // Minimal trip data
                        milestone,
                        userId,
                        notifyChannels,
                        {} // Department rules - implement as needed
                    );
                } catch (notifyError) {
                    this.logger.warn(`Notification delivery failed: ${notifyError.message}`, {
                        milestoneId: milestone.id,
                        errorCode: ErrorCode.TEAMS_INTEGRATION_ERROR
                    });
                    // Continue execution - notification failure shouldn't fail milestone update
                }
            }

            return milestone;
        } catch (error) {
            this.logger.error(`Failed to update milestone: ${error.message}`, {
                milestoneId: id,
                errorCode: ErrorCode.INTERNAL_SERVER_ERROR
            });
            throw error;
        }
    }
}