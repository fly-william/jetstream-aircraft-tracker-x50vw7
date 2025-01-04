/**
 * @fileoverview Trip management controller implementing REST API endpoints
 * @version 1.0.0
 * 
 * Implements comprehensive trip management endpoints with validation,
 * role-based access control, audit logging, and sub-5-second latency.
 */

// External imports - NestJS v10.x
import {
    Controller,
    Post,
    Get,
    Patch,
    Body,
    Param,
    UseGuards,
    HttpException,
    HttpStatus,
    Query,
    UseInterceptors,
    CacheInterceptor,
    CacheTTL
} from '@nestjs/common';
import { UUID } from 'crypto';

// Internal imports
import { TripService } from '../services/trip.service';
import { tripSchema } from '../../../common/validators/trip.validator';
import { ITrip, TripStatus } from '../../../common/interfaces/trip.interface';
import { logger } from '../../../common/utils/logger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RoleGuard } from '../../../common/guards/role.guard';
import { ErrorCode, ERROR_MESSAGES } from '../../../common/constants/error-codes';

/**
 * Controller handling HTTP requests for trip management operations
 */
@Controller('trips')
@UseGuards(AuthGuard)
@UseInterceptors(CacheInterceptor)
export class TripController {
    constructor(private readonly tripService: TripService) {}

    /**
     * Creates a new trip with comprehensive validation
     * @param tripData Trip creation data
     * @returns Created trip entity
     */
    @Post()
    @UseGuards(RoleGuard(['operations']))
    async createTrip(@Body() tripData: any): Promise<ITrip> {
        const startTime = Date.now();
        const correlationId = crypto.randomUUID();

        logger.info('Creating new trip', {
            correlationId,
            tripData,
            userId: tripData.userId
        });

        try {
            // Validate request body against schema
            const validationResult = await tripSchema.safeParseAsync(tripData);
            if (!validationResult.success) {
                logger.error('Trip validation failed', null, {
                    correlationId,
                    errors: validationResult.error.errors
                });
                throw new HttpException(
                    ERROR_MESSAGES.VALIDATION_ERROR,
                    HttpStatus.BAD_REQUEST
                );
            }

            // Create trip through service
            const trip = await this.tripService.createTrip(
                validationResult.data,
                tripData.userId
            );

            const duration = Date.now() - startTime;
            logger.info('Trip created successfully', {
                correlationId,
                tripId: trip.id,
                duration
            });

            return trip;
        } catch (error) {
            logger.error('Failed to create trip', error as Error, {
                correlationId,
                tripData
            });
            throw error;
        }
    }

    /**
     * Retrieves trip details by ID with caching
     * @param id Trip UUID
     * @returns Trip details if found
     */
    @Get(':id')
    @CacheTTL(30) // 30 second cache
    async getTrip(@Param('id') id: string): Promise<ITrip> {
        const correlationId = crypto.randomUUID();

        logger.info('Retrieving trip details', {
            correlationId,
            tripId: id
        });

        try {
            const trip = await this.tripService.getTrip(id as UUID);

            logger.info('Trip details retrieved', {
                correlationId,
                tripId: id
            });

            return trip;
        } catch (error) {
            logger.error('Failed to retrieve trip', error as Error, {
                correlationId,
                tripId: id
            });
            throw error;
        }
    }

    /**
     * Retrieves paginated active trips with caching
     * @param query Query parameters for pagination and filtering
     * @returns Paginated array of active trips
     */
    @Get()
    @CacheTTL(15) // 15 second cache
    async getActiveTrips(
        @Query('page') page = 1,
        @Query('limit') limit = 10,
        @Query('status') status?: TripStatus[]
    ): Promise<{ trips: ITrip[]; total: number }> {
        const correlationId = crypto.randomUUID();

        logger.info('Retrieving active trips', {
            correlationId,
            page,
            limit,
            status
        });

        try {
            const skip = (page - 1) * limit;
            const [trips, total] = await this.tripService.getActiveTrips({
                skip,
                take: limit,
                status
            });

            logger.info('Active trips retrieved', {
                correlationId,
                count: trips.length,
                total
            });

            return { trips, total };
        } catch (error) {
            logger.error('Failed to retrieve active trips', error as Error, {
                correlationId,
                page,
                limit
            });
            throw error;
        }
    }

    /**
     * Updates trip status with validation and notification
     * @param id Trip UUID
     * @param updateData Status update data
     * @returns Updated trip entity
     */
    @Patch(':id/status')
    @UseGuards(RoleGuard(['operations']))
    async updateTripStatus(
        @Param('id') id: string,
        @Body() updateData: { status: TripStatus; userId: UUID }
    ): Promise<ITrip> {
        const startTime = Date.now();
        const correlationId = crypto.randomUUID();

        logger.info('Updating trip status', {
            correlationId,
            tripId: id,
            newStatus: updateData.status,
            userId: updateData.userId
        });

        try {
            // Validate status transition
            const trip = await this.tripService.updateTripStatus(
                id as UUID,
                updateData.status,
                updateData.userId
            );

            const duration = Date.now() - startTime;
            logger.info('Trip status updated successfully', {
                correlationId,
                tripId: id,
                status: updateData.status,
                duration
            });

            return trip;
        } catch (error) {
            logger.error('Failed to update trip status', error as Error, {
                correlationId,
                tripId: id,
                status: updateData.status
            });
            throw error;
        }
    }
}