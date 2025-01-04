/**
 * @fileoverview Enhanced repository implementation for trip management operations
 * @version 1.0.0
 * 
 * Implements data access layer for trip management with comprehensive audit logging,
 * caching, transaction management, and optimized query capabilities.
 */

// External imports
import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { 
    Repository, 
    EntityRepository, 
    FindOptionsWhere, 
    FindManyOptions,
    QueryRunner,
    DataSource,
    In,
    Between,
    IsNull
} from 'typeorm'; // version: 0.3.x
import { Transactional } from 'typeorm-transactional-cls-hooked'; // version: 0.1.x
import { UseInterceptors, CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager'; // version: 2.x

// Internal imports
import { Trip } from '../models/trip.model';
import { 
    ITrip, 
    TripStatus,
    ITripCreate,
    ITripUpdate 
} from '../../../common/interfaces/trip.interface';
import { 
    TripAuditLog,
    AuditActionType,
    TripTimelineEntry,
    TimelineEntryType,
    ServiceRequestPriority
} from '../../../common/types/trip.types';

@Injectable()
@EntityRepository(Trip)
@UseInterceptors(CacheInterceptor)
export class TripRepository {
    private readonly logger = new Logger(TripRepository.name);

    constructor(
        private readonly repository: Repository<Trip>,
        private readonly dataSource: DataSource
    ) {}

    /**
     * Retrieves a trip by ID with optimized caching
     * @param id Trip UUID
     * @returns Trip entity if found
     * @throws HttpException if trip not found
     */
    @CacheKey('trip')
    @CacheTTL(30)
    async findById(id: UUID): Promise<Trip> {
        try {
            const trip = await this.repository.findOne({
                where: { id, isActive: true },
                relations: ['milestones'],
                cache: true
            });

            if (!trip) {
                throw new HttpException('Trip not found', HttpStatus.NOT_FOUND);
            }

            this.logger.debug(`Retrieved trip ${id}`);
            return trip;
        } catch (error) {
            this.logger.error(`Error retrieving trip ${id}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Retrieves active trips with pagination and optimized query
     * @param options Pagination and filter options
     * @returns Paginated trip results
     */
    @CacheKey('active-trips')
    @CacheTTL(15)
    async findActiveTrips(options: {
        skip?: number;
        take?: number;
        status?: TripStatus[];
        startDate?: Date;
        endDate?: Date;
    }): Promise<[Trip[], number]> {
        try {
            const { skip = 0, take = 10, status, startDate, endDate } = options;

            const queryBuilder = this.repository.createQueryBuilder('trip')
                .leftJoinAndSelect('trip.milestones', 'milestone')
                .where('trip.isActive = :isActive', { isActive: true });

            if (status?.length) {
                queryBuilder.andWhere('trip.status IN (:...status)', { status });
            }

            if (startDate && endDate) {
                queryBuilder.andWhere('trip.startTime BETWEEN :startDate AND :endDate', {
                    startDate,
                    endDate
                });
            }

            const [trips, total] = await queryBuilder
                .orderBy('trip.startTime', 'DESC')
                .skip(skip)
                .take(take)
                .cache(true)
                .getManyAndCount();

            this.logger.debug(`Retrieved ${trips.length} active trips`);
            return [trips, total];
        } catch (error) {
            this.logger.error(`Error retrieving active trips: ${error.message}`);
            throw new HttpException(
                'Error retrieving trips',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Creates a new trip with transaction and audit logging
     * @param tripData Trip creation data
     * @param userId User performing the action
     * @returns Created trip entity
     */
    @Transactional()
    async createTrip(tripData: ITripCreate, userId: UUID): Promise<Trip> {
        const queryRunner = this.dataSource.createQueryRunner();

        try {
            await queryRunner.connect();
            await queryRunner.startTransaction();

            const trip = new Trip(tripData);
            trip.lastUpdatedBy = userId;

            const savedTrip = await queryRunner.manager.save(Trip, trip);

            // Create audit log entry
            const auditLog: TripAuditLog = {
                tripId: savedTrip.id,
                userId,
                action: AuditActionType.CREATED,
                timestamp: new Date(),
                changes: { ...tripData }
            };

            await queryRunner.manager.save('trip_audit_logs', auditLog);
            await queryRunner.commitTransaction();

            this.logger.log(`Created trip ${savedTrip.id}`);
            return savedTrip;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error(`Error creating trip: ${error.message}`);
            throw new HttpException(
                'Error creating trip',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Updates trip status with comprehensive audit logging
     * @param id Trip UUID
     * @param status New trip status
     * @param userId User performing the update
     * @returns Updated trip entity
     */
    @Transactional()
    async updateTripStatus(
        id: UUID,
        status: TripStatus,
        userId: UUID
    ): Promise<Trip> {
        const queryRunner = this.dataSource.createQueryRunner();

        try {
            await queryRunner.connect();
            await queryRunner.startTransaction();

            const trip = await this.findById(id);
            const previousStatus = trip.status;

            trip.updateStatus(status, userId);

            const savedTrip = await queryRunner.manager.save(Trip, trip);

            // Create audit log entry
            const auditLog: TripAuditLog = {
                tripId: id,
                userId,
                action: AuditActionType.STATUS_CHANGED,
                timestamp: new Date(),
                changes: {
                    previousStatus,
                    newStatus: status
                }
            };

            await queryRunner.manager.save('trip_audit_logs', auditLog);

            // Create timeline entry
            const timelineEntry: TripTimelineEntry = {
                tripId: id,
                timestamp: new Date(),
                entryType: TimelineEntryType.STATUS_CHANGE,
                details: {
                    previousStatus,
                    newStatus: status,
                    updatedBy: userId
                }
            };

            await queryRunner.manager.save('trip_timeline', timelineEntry);
            await queryRunner.commitTransaction();

            this.logger.log(`Updated trip ${id} status to ${status}`);
            return savedTrip;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error(`Error updating trip status: ${error.message}`);
            throw new HttpException(
                'Error updating trip status',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        } finally {
            await queryRunner.release();
        }
    }
}