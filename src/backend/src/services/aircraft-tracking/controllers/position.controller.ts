/**
 * @fileoverview Enhanced controller for aircraft position data management with rate limiting and caching
 * @version 1.0.0
 */

import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  UseInterceptors, 
  UsePipes,
  ValidationPipe,
  ParseUUIDPipe,
  BadRequestException,
  NotFoundException
} from '@nestjs/common'; // v10.0.0
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiBody, 
  ApiQuery 
} from '@nestjs/swagger'; // v7.0.0
import { RateLimit, RateLimitGuard } from '@nestjs/throttler'; // v5.0.0
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager'; // v2.0.0

import { PositionService } from '../services/position.service';
import { IPosition } from '../../../common/interfaces/position.interface';
import { validatePosition } from '../../../common/validators/position.validator';
import { logger } from '../../../common/utils/logger';
import { ErrorCode } from '../../../common/constants/error-codes';

/**
 * Interface for paginated position results
 */
interface PaginatedPositions {
  data: IPosition[];
  total: number;
  hasMore: boolean;
}

/**
 * Enhanced controller for aircraft position data management
 * Implements rate limiting, caching, and comprehensive validation
 */
@Controller('positions')
@ApiTags('positions')
@UseGuards(RateLimitGuard)
export class PositionController {
  private readonly CACHE_TTL = 5; // 5 seconds for real-time data
  private readonly MAX_HISTORY_DAYS = 90; // 90 days retention

  constructor(
    private readonly positionService: PositionService
  ) {
    logger.info('Position controller initialized');
  }

  /**
   * Updates aircraft position with enhanced validation
   */
  @Post()
  @ApiOperation({ summary: 'Update aircraft position' })
  @ApiResponse({ status: 201, description: 'Position updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid position data' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @RateLimit({ limit: 300, ttl: 60000 }) // 300 requests per minute
  @UsePipes(new ValidationPipe({ transform: true }))
  async updatePosition(@Body() position: IPosition): Promise<IPosition> {
    try {
      logger.debug('Processing position update request', {
        aircraftId: position.aircraftId
      });

      // Validate position data
      const validationResult = await validatePosition(position);
      if (!validationResult.isValid) {
        logger.warn('Invalid position data received', {
          errors: validationResult.errors,
          position
        });
        throw new BadRequestException({
          code: ErrorCode.INVALID_POSITION_DATA,
          errors: validationResult.errors
        });
      }

      // Update position
      const updatedPosition = await this.positionService.updatePosition(position);
      
      logger.info('Position updated successfully', {
        aircraftId: position.aircraftId,
        timestamp: position.recorded
      });

      return updatedPosition;
    } catch (error) {
      logger.error('Position update failed', error, {
        aircraftId: position.aircraftId
      });
      throw error;
    }
  }

  /**
   * Retrieves latest position for an aircraft with caching
   */
  @Get(':aircraftId/latest')
  @ApiOperation({ summary: 'Get latest aircraft position' })
  @ApiResponse({ status: 200, description: 'Latest position retrieved' })
  @ApiResponse({ status: 404, description: 'Position not found' })
  @ApiParam({ name: 'aircraftId', type: 'string', format: 'uuid' })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(5) // 5 seconds cache
  async getLatestPosition(
    @Param('aircraftId', new ParseUUIDPipe()) aircraftId: string
  ): Promise<IPosition> {
    try {
      const position = await this.positionService.getLatestPosition(aircraftId);
      
      if (!position) {
        logger.debug('No position found for aircraft', { aircraftId });
        throw new NotFoundException('No position data found for aircraft');
      }

      return position;
    } catch (error) {
      logger.error('Failed to retrieve latest position', error, { aircraftId });
      throw error;
    }
  }

  /**
   * Retrieves historical position data with pagination
   */
  @Get(':aircraftId/history')
  @ApiOperation({ summary: 'Get aircraft position history' })
  @ApiResponse({ status: 200, description: 'Position history retrieved' })
  @ApiParam({ name: 'aircraftId', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'startTime', required: true, type: 'string', format: 'date-time' })
  @ApiQuery({ name: 'endTime', required: true, type: 'string', format: 'date-time' })
  @ApiQuery({ name: 'page', required: false, type: 'number', default: 1 })
  @ApiQuery({ name: 'limit', required: false, type: 'number', default: 100 })
  @RateLimit({ limit: 100, ttl: 60000 }) // 100 requests per minute
  async getPositionHistory(
    @Param('aircraftId', new ParseUUIDPipe()) aircraftId: string,
    @Query('startTime') startTime: Date,
    @Query('endTime') endTime: Date,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 100
  ): Promise<PaginatedPositions> {
    try {
      // Validate date range
      if (startTime > endTime) {
        throw new BadRequestException('Start time must be before end time');
      }

      // Validate against retention period
      const maxHistoryDate = new Date();
      maxHistoryDate.setDate(maxHistoryDate.getDate() - this.MAX_HISTORY_DAYS);
      if (startTime < maxHistoryDate) {
        throw new BadRequestException(`Historical data only available for last ${this.MAX_HISTORY_DAYS} days`);
      }

      // Calculate pagination
      const offset = (page - 1) * limit;

      const positions = await this.positionService.getPositionHistory(
        aircraftId,
        startTime,
        endTime,
        { limit, offset }
      );

      logger.debug('Retrieved position history', {
        aircraftId,
        count: positions.data.length,
        total: positions.total
      });

      return positions;
    } catch (error) {
      logger.error('Failed to retrieve position history', error, {
        aircraftId,
        startTime,
        endTime
      });
      throw error;
    }
  }
}