import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'; // v29.0.0
import { WebSocket, Server as WebSocketServer } from 'ws'; // v8.0.0
import { Cache } from '@nestjs/common'; // v10.0.0
import { PositionService } from '../../../src/services/aircraft-tracking/services/position.service';
import { PositionRepository } from '../../../src/services/aircraft-tracking/repositories/position.repository';
import { MetricsCollector } from '../../../src/common/utils/metrics-collector';
import { IPosition } from '../../../src/common/interfaces/position.interface';
import { ErrorCode } from '../../../src/common/constants/error-codes';
import { v4 as uuidv4 } from 'uuid';

describe('PositionService', () => {
    let positionService: PositionService;
    let mockPositionRepository: jest.Mocked<PositionRepository>;
    let mockWebSocketServer: jest.Mocked<WebSocketServer>;
    let mockCacheManager: jest.Mocked<Cache>;
    let mockMetricsCollector: jest.Mocked<MetricsCollector>;

    beforeEach(() => {
        // Initialize mocks
        mockPositionRepository = {
            savePosition: jest.fn(),
            getLatestPosition: jest.fn(),
            getPositionHistory: jest.fn(),
            cleanupOldPositions: jest.fn()
        } as any;

        mockWebSocketServer = {
            emit: jest.fn(),
            clients: new Set()
        } as any;

        mockCacheManager = {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn()
        } as any;

        mockMetricsCollector = {
            recordMetric: jest.fn(),
            incrementCounter: jest.fn()
        } as any;

        // Initialize service with mocks
        positionService = new PositionService(
            mockPositionRepository,
            mockCacheManager,
            mockMetricsCollector
        );
        (positionService as any).server = mockWebSocketServer;

        // Reset all mocks
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    describe('updatePosition', () => {
        it('should update position and broadcast within 5 second latency requirement', async () => {
            // Arrange
            const mockPosition: IPosition = {
                id: uuidv4(),
                aircraftId: uuidv4(),
                latitude: 42.3601,
                longitude: -71.0589,
                altitude: 35000,
                groundSpeed: 450,
                heading: 90,
                recorded: new Date()
            };

            mockPositionRepository.savePosition.mockResolvedValue(mockPosition);
            mockCacheManager.get.mockResolvedValue(null);

            // Act
            const startTime = Date.now();
            const result = await positionService.updatePosition(mockPosition);
            const endTime = Date.now();

            // Assert
            expect(result).toEqual(mockPosition);
            expect(endTime - startTime).toBeLessThan(5000); // 5s latency requirement
            expect(mockPositionRepository.savePosition).toHaveBeenCalledWith(mockPosition);
            expect(mockWebSocketServer.emit).toHaveBeenCalledWith(
                `position:${mockPosition.aircraftId}`,
                mockPosition
            );
            expect(mockMetricsCollector.recordMetric).toHaveBeenCalledWith(
                'position_update_latency',
                expect.any(Number)
            );
        });

        it('should handle duplicate position updates within threshold', async () => {
            // Arrange
            const mockPosition: IPosition = {
                id: uuidv4(),
                aircraftId: uuidv4(),
                latitude: 42.3601,
                longitude: -71.0589,
                altitude: 35000,
                groundSpeed: 450,
                heading: 90,
                recorded: new Date()
            };

            mockCacheManager.get.mockResolvedValue(mockPosition);

            // Act
            const result = await positionService.updatePosition(mockPosition);

            // Assert
            expect(result).toEqual(mockPosition);
            expect(mockPositionRepository.savePosition).not.toHaveBeenCalled();
            expect(mockWebSocketServer.emit).not.toHaveBeenCalled();
        });

        it('should validate position data before processing', async () => {
            // Arrange
            const invalidPosition = {
                aircraftId: uuidv4(),
                latitude: 200, // Invalid latitude
                longitude: -71.0589,
                altitude: 35000,
                groundSpeed: 450,
                heading: 90,
                recorded: new Date()
            };

            // Act & Assert
            await expect(positionService.updatePosition(invalidPosition as IPosition))
                .rejects.toThrow(ErrorCode.INVALID_POSITION_DATA);
        });
    });

    describe('getPositionHistory', () => {
        it('should retrieve paginated position history with time-series support', async () => {
            // Arrange
            const aircraftId = uuidv4();
            const startTime = new Date(Date.now() - 3600000); // 1 hour ago
            const endTime = new Date();
            const mockPositions = {
                data: Array(10).fill(null).map(() => ({
                    id: uuidv4(),
                    aircraftId,
                    latitude: 42.3601,
                    longitude: -71.0589,
                    altitude: 35000,
                    groundSpeed: 450,
                    heading: 90,
                    recorded: new Date()
                })),
                total: 100,
                hasMore: true
            };

            mockPositionRepository.getPositionHistory.mockResolvedValue(mockPositions);

            // Act
            const result = await positionService.getPositionHistory(
                aircraftId,
                startTime,
                endTime,
                { limit: 10, offset: 0 }
            );

            // Assert
            expect(result).toEqual(mockPositions);
            expect(mockPositionRepository.getPositionHistory).toHaveBeenCalledWith(
                aircraftId,
                startTime,
                endTime,
                { limit: 10, offset: 0 }
            );
        });

        it('should validate time range parameters', async () => {
            // Arrange
            const aircraftId = uuidv4();
            const startTime = new Date();
            const endTime = new Date(Date.now() - 3600000); // 1 hour before start

            // Act & Assert
            await expect(positionService.getPositionHistory(
                aircraftId,
                startTime,
                endTime,
                { limit: 10, offset: 0 }
            )).rejects.toThrow('Invalid date range');
        });
    });

    describe('cleanupOldPositions', () => {
        it('should execute cleanup job with 90-day retention policy', async () => {
            // Arrange
            const mockCleanupResult = {
                recordsDeleted: 1000,
                batchesProcessed: 10,
                executionTimeMs: 5000
            };
            mockPositionRepository.cleanupOldPositions.mockResolvedValue(mockCleanupResult);

            // Act
            await positionService.cleanupOldPositions();

            // Assert
            expect(mockPositionRepository.cleanupOldPositions).toHaveBeenCalled();
            expect(mockMetricsCollector.recordMetric).toHaveBeenCalledWith(
                'position_cleanup_duration',
                mockCleanupResult.executionTimeMs
            );
            expect(mockMetricsCollector.recordMetric).toHaveBeenCalledWith(
                'position_cleanup_records',
                mockCleanupResult.recordsDeleted
            );
        });

        it('should handle cleanup failures gracefully', async () => {
            // Arrange
            const mockError = new Error('Cleanup failed');
            mockPositionRepository.cleanupOldPositions.mockRejectedValue(mockError);

            // Act & Assert
            await expect(positionService.cleanupOldPositions())
                .rejects.toThrow(mockError);
        });
    });

    describe('getLatestPosition', () => {
        it('should retrieve cached position if available', async () => {
            // Arrange
            const aircraftId = uuidv4();
            const mockPosition: IPosition = {
                id: uuidv4(),
                aircraftId,
                latitude: 42.3601,
                longitude: -71.0589,
                altitude: 35000,
                groundSpeed: 450,
                heading: 90,
                recorded: new Date()
            };

            mockCacheManager.get.mockResolvedValue(mockPosition);

            // Act
            const result = await positionService.getLatestPosition(aircraftId);

            // Assert
            expect(result).toEqual(mockPosition);
            expect(mockCacheManager.get).toHaveBeenCalledWith(`position:${aircraftId}`);
            expect(mockPositionRepository.getLatestPosition).not.toHaveBeenCalled();
            expect(mockMetricsCollector.incrementCounter).toHaveBeenCalledWith('cache_hit');
        });

        it('should fetch from repository on cache miss', async () => {
            // Arrange
            const aircraftId = uuidv4();
            const mockPosition: IPosition = {
                id: uuidv4(),
                aircraftId,
                latitude: 42.3601,
                longitude: -71.0589,
                altitude: 35000,
                groundSpeed: 450,
                heading: 90,
                recorded: new Date()
            };

            mockCacheManager.get.mockResolvedValue(null);
            mockPositionRepository.getLatestPosition.mockResolvedValue(mockPosition);

            // Act
            const result = await positionService.getLatestPosition(aircraftId);

            // Assert
            expect(result).toEqual(mockPosition);
            expect(mockCacheManager.get).toHaveBeenCalledWith(`position:${aircraftId}`);
            expect(mockPositionRepository.getLatestPosition).toHaveBeenCalledWith(aircraftId);
            expect(mockCacheManager.set).toHaveBeenCalledWith(
                `position:${aircraftId}`,
                mockPosition,
                300
            );
            expect(mockMetricsCollector.incrementCounter).toHaveBeenCalledWith('cache_miss');
        });
    });
});