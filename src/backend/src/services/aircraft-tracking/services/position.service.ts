/**
 * @fileoverview Enhanced service for managing aircraft position data with real-time WebSocket updates
 * @version 1.0.0
 * @module services/aircraft-tracking/services/position
 */

import { Injectable } from '@nestjs/common'; // v10.0.0
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets'; // v10.0.0
import { Cron } from '@nestjs/schedule'; // v3.0.0
import { Server } from 'socket.io';
import { Cache } from '@nestjs/common';
import { IPosition, isValidPosition } from '../../../common/interfaces/position.interface';
import { PositionRepository } from '../repositories/position.repository';
import { logger } from '../../../common/utils/logger';
import { ErrorCode } from '../../../common/constants/error-codes';
import { MetricsCollector } from '../../../common/utils/metrics-collector';

/**
 * Interface for paginated position results
 */
interface PaginatedPositions {
    data: IPosition[];
    total: number;
    hasMore: boolean;
}

/**
 * Interface for position update metrics
 */
interface PositionMetrics {
    latency: number;
    cacheHitRate: number;
    updateRate: number;
}

/**
 * Enhanced service for managing aircraft position data with real-time capabilities
 * Implements WebSocket updates, caching, and comprehensive error handling
 */
@Injectable()
@WebSocketGateway({ namespace: 'positions', cors: true })
export class PositionService {
    @WebSocketServer()
    private server: Server;

    private readonly CACHE_TTL = 300; // 5 minutes
    private readonly BATCH_SIZE = 100;
    private readonly UPDATE_THRESHOLD = 5000; // 5 seconds

    constructor(
        private readonly positionRepository: PositionRepository,
        private readonly cacheManager: Cache,
        private readonly metricsCollector: MetricsCollector
    ) {
        logger.info('Position service initialized');
    }

    /**
     * Updates aircraft position with validation and broadcasts to WebSocket clients
     * @param position Position data to update
     * @returns Updated position data with validation status
     */
    async updatePosition(position: IPosition): Promise<IPosition> {
        const startTime = Date.now();
        
        try {
            // Validate position data
            if (!isValidPosition(position)) {
                throw new Error(ErrorCode.INVALID_POSITION_DATA);
            }

            // Check for duplicate position within threshold
            const cachedPosition = await this.cacheManager.get<IPosition>(
                `position:${position.aircraftId}`
            );

            if (cachedPosition && 
                Date.now() - new Date(cachedPosition.recorded).getTime() < this.UPDATE_THRESHOLD) {
                logger.debug('Skipping duplicate position update', {
                    aircraftId: position.aircraftId
                });
                return cachedPosition;
            }

            // Save position to database
            const savedPosition = await this.positionRepository.savePosition(position);

            // Update cache
            await this.cacheManager.set(
                `position:${position.aircraftId}`,
                savedPosition,
                this.CACHE_TTL
            );

            // Broadcast to WebSocket clients
            this.server.emit(`position:${position.aircraftId}`, savedPosition);

            // Collect metrics
            const latency = Date.now() - startTime;
            this.metricsCollector.recordMetric('position_update_latency', latency);

            logger.info('Position updated successfully', {
                aircraftId: position.aircraftId,
                latency
            });

            return savedPosition;
        } catch (error) {
            logger.error('Failed to update position', error, {
                aircraftId: position.aircraftId
            });
            throw error;
        }
    }

    /**
     * Retrieves latest position with caching
     * @param aircraftId Aircraft identifier
     * @returns Latest position with cache status
     */
    async getLatestPosition(aircraftId: string): Promise<IPosition | null> {
        try {
            // Check cache first
            const cachedPosition = await this.cacheManager.get<IPosition>(
                `position:${aircraftId}`
            );

            if (cachedPosition) {
                this.metricsCollector.incrementCounter('cache_hit');
                return cachedPosition;
            }

            // Cache miss - query database
            const position = await this.positionRepository.getLatestPosition(aircraftId);
            
            if (position) {
                // Update cache
                await this.cacheManager.set(
                    `position:${aircraftId}`,
                    position,
                    this.CACHE_TTL
                );
            }

            this.metricsCollector.incrementCounter('cache_miss');
            return position;
        } catch (error) {
            logger.error('Failed to get latest position', error, { aircraftId });
            throw error;
        }
    }

    /**
     * Retrieves historical position data with pagination
     * @param aircraftId Aircraft identifier
     * @param startTime Start of time range
     * @param endTime End of time range
     * @param options Pagination options
     * @returns Paginated historical positions
     */
    async getPositionHistory(
        aircraftId: string,
        startTime: Date,
        endTime: Date,
        options: { limit: number; offset: number }
    ): Promise<PaginatedPositions> {
        try {
            // Validate date range
            if (startTime > endTime) {
                throw new Error('Invalid date range');
            }

            const result = await this.positionRepository.getPositionHistory(
                aircraftId,
                startTime,
                endTime,
                options
            );

            logger.debug('Retrieved position history', {
                aircraftId,
                count: result.data.length,
                total: result.total
            });

            return result;
        } catch (error) {
            logger.error('Failed to get position history', error, {
                aircraftId,
                startTime,
                endTime
            });
            throw error;
        }
    }

    /**
     * Scheduled task for position data cleanup
     * Runs daily to maintain data retention policy
     */
    @Cron('0 0 * * *') // Run at midnight
    async cleanupOldPositions(): Promise<void> {
        try {
            const startTime = Date.now();
            const result = await this.positionRepository.cleanupOldPositions();

            logger.info('Position cleanup completed', {
                recordsDeleted: result.recordsDeleted,
                executionTimeMs: result.executionTimeMs
            });

            // Record cleanup metrics
            this.metricsCollector.recordMetric('position_cleanup_duration', result.executionTimeMs);
            this.metricsCollector.recordMetric('position_cleanup_records', result.recordsDeleted);
        } catch (error) {
            logger.error('Position cleanup failed', error);
            throw error;
        }
    }
}