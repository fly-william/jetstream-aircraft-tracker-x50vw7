/**
 * @fileoverview Enhanced repository for aircraft position data management in TimescaleDB
 * @version 1.0.0
 * @module services/aircraft-tracking/repositories/position
 */

import { Injectable } from '@nestjs/common'; // v10.0.0
import { 
    Repository,
    EntityManager,
    Between,
    LessThanOrEqual,
    In,
    QueryRunner
} from 'typeorm'; // v0.3.x
import { Position } from '../models/position.model';
import { IPosition } from '../../../common/interfaces/position.interface';
import { logger } from '../../../common/utils/logger';
import { ErrorCode } from '../../../common/constants/error-codes';

/**
 * Interface for pagination options in position queries
 */
interface PaginationOptions {
    limit: number;
    offset: number;
}

/**
 * Interface for cleanup operation results
 */
interface CleanupResult {
    recordsDeleted: number;
    batchesProcessed: number;
    executionTimeMs: number;
}

/**
 * Interface for paginated position results
 */
interface PaginatedPositions {
    data: Position[];
    total: number;
    hasMore: boolean;
}

/**
 * Enhanced repository for aircraft position data management with advanced features
 * Implements time-series optimizations and data retention policies
 */
@Injectable()
export class PositionRepository extends Repository<Position> {
    private readonly RETENTION_DAYS = 90;
    private readonly BATCH_SIZE = 1000;
    private readonly QUERY_TIMEOUT = 30000; // 30 seconds
    private readonly CACHE_TTL = 5000; // 5 seconds for real-time data

    constructor(private readonly entityManager: EntityManager) {
        super(Position, entityManager);
        logger.info('Position repository initialized', { retention: this.RETENTION_DAYS });
    }

    /**
     * Saves a new aircraft position record with validation
     * @param position Position data to save
     * @returns Saved position record
     * @throws Error if validation fails
     */
    async savePosition(position: IPosition): Promise<Position> {
        try {
            // Create and validate new position entity
            const newPosition = new Position({
                aircraftId: position.aircraftId,
                latitude: position.latitude,
                longitude: position.longitude,
                altitude: position.altitude,
                groundSpeed: position.groundSpeed,
                heading: position.heading,
                recorded: position.recorded || new Date()
            });

            // Validate position data
            newPosition.validate();

            // Save to database with high precision timestamp
            const saved = await this.save(newPosition);
            logger.debug('Position saved successfully', { 
                aircraftId: saved.aircraftId,
                timestamp: saved.recorded
            });

            return saved;
        } catch (error) {
            logger.error('Failed to save position', error, {
                aircraftId: position.aircraftId,
                errorCode: ErrorCode.INVALID_POSITION_DATA
            });
            throw error;
        }
    }

    /**
     * Efficiently saves multiple position records in a transaction
     * @param positions Array of position data to save
     * @returns Array of saved positions
     */
    async saveBatchPositions(positions: IPosition[]): Promise<Position[]> {
        const queryRunner = this.entityManager.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const savedPositions: Position[] = [];
            
            // Process in batches for better performance
            for (let i = 0; i < positions.length; i += this.BATCH_SIZE) {
                const batch = positions.slice(i, i + this.BATCH_SIZE);
                const positionEntities = batch.map(pos => new Position(pos));
                
                // Validate all positions in batch
                positionEntities.forEach(pos => pos.validate());
                
                const saved = await queryRunner.manager.save(positionEntities);
                savedPositions.push(...saved);
            }

            await queryRunner.commitTransaction();
            logger.info('Batch position save completed', { 
                count: savedPositions.length 
            });

            return savedPositions;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            logger.error('Batch position save failed', error);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Retrieves the most recent position for an aircraft
     * @param aircraftId Aircraft identifier
     * @returns Latest position or null if not found
     */
    async getLatestPosition(aircraftId: string): Promise<Position | null> {
        try {
            const position = await this.findOne({
                where: { aircraftId },
                order: { recorded: 'DESC' }
            });

            if (!position) {
                logger.debug('No position found for aircraft', { aircraftId });
                return null;
            }

            return position;
        } catch (error) {
            logger.error('Failed to retrieve latest position', error, { aircraftId });
            throw error;
        }
    }

    /**
     * Retrieves historical position data with pagination
     * @param aircraftId Aircraft identifier
     * @param startTime Start of time range
     * @param endTime End of time range
     * @param options Pagination options
     * @returns Paginated position records
     */
    async getPositionHistory(
        aircraftId: string,
        startTime: Date,
        endTime: Date,
        options: PaginationOptions
    ): Promise<PaginatedPositions> {
        try {
            const [positions, total] = await this.findAndCount({
                where: {
                    aircraftId,
                    recorded: Between(startTime, endTime)
                },
                order: { recorded: 'ASC' },
                skip: options.offset,
                take: options.limit
            });

            return {
                data: positions,
                total,
                hasMore: total > options.offset + positions.length
            };
        } catch (error) {
            logger.error('Failed to retrieve position history', error, {
                aircraftId,
                startTime,
                endTime
            });
            throw error;
        }
    }

    /**
     * Removes position records older than retention period
     * @returns Cleanup operation results
     */
    async cleanupOldPositions(): Promise<CleanupResult> {
        const startTime = Date.now();
        const queryRunner = this.entityManager.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const retentionDate = new Date();
            retentionDate.setDate(retentionDate.getDate() - this.RETENTION_DAYS);

            let totalDeleted = 0;
            let batchesProcessed = 0;

            // Delete in batches to avoid memory issues
            while (true) {
                const result = await queryRunner.manager.delete(Position, {
                    recorded: LessThanOrEqual(retentionDate)
                });

                if (result.affected === 0) break;

                totalDeleted += result.affected;
                batchesProcessed++;

                await queryRunner.commitTransaction();
                await queryRunner.startTransaction();
            }

            await queryRunner.commitTransaction();

            const executionTimeMs = Date.now() - startTime;
            logger.info('Position cleanup completed', {
                recordsDeleted: totalDeleted,
                executionTimeMs
            });

            return {
                recordsDeleted: totalDeleted,
                batchesProcessed,
                executionTimeMs
            };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            logger.error('Position cleanup failed', error);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}