/**
 * @fileoverview Integration tests for aircraft position tracking functionality
 * @version 1.0.0
 */

import { jest, describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from '@jest/globals'; // v29.0.0
import { TestingModule, Test } from '@nestjs/testing'; // v10.0.0
import { faker } from '@faker-js/faker'; // v8.0.0
import { PositionService } from '../../../src/services/aircraft-tracking/services/position.service';
import { IPosition } from '../../../src/common/interfaces/position.interface';
import { TestHelpers } from '../../utils/test-helpers';
import { v4 as uuidv4 } from 'uuid';

// Constants for test configuration
const TEST_TIMEOUT = 30000;
const RETENTION_DAYS = 90;
const MAX_LATENCY_MS = 5000;
const BULK_UPDATE_SIZE = 100;
const POSITION_ACCURACY_DECIMAL_PLACES = 6;

describe('Position Service Integration Tests', () => {
    let module: TestingModule;
    let positionService: PositionService;
    let mockWebSocketGateway: any;
    let mockCacheManager: any;

    beforeAll(async () => {
        // Initialize test database
        await TestHelpers.createTestDatabase({
            schema: ['tracking'],
            extensions: ['timescaledb'],
            performanceMonitoring: true
        });

        // Mock WebSocket gateway
        mockWebSocketGateway = {
            emit: jest.fn()
        };

        // Mock cache manager
        mockCacheManager = {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn()
        };

        // Create test module
        module = await Test.createTestingModule({
            providers: [
                PositionService,
                {
                    provide: 'WebSocketGateway',
                    useValue: mockWebSocketGateway
                },
                {
                    provide: 'CacheManager',
                    useValue: mockCacheManager
                }
            ]
        }).compile();

        positionService = module.get<PositionService>(PositionService);
    }, TEST_TIMEOUT);

    afterAll(async () => {
        await TestHelpers.cleanupTestDatabase({ verify: true });
        await module.close();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Real-time Position Updates', () => {
        it('should update position with valid data within latency requirements', async () => {
            // Arrange
            const aircraftId = uuidv4();
            const position: IPosition = {
                id: uuidv4(),
                aircraftId,
                latitude: faker.location.latitude(),
                longitude: faker.location.longitude(),
                altitude: faker.number.int({ min: 0, max: 45000 }),
                groundSpeed: faker.number.int({ min: 0, max: 500 }),
                heading: faker.number.int({ min: 0, max: 359 }),
                recorded: new Date()
            };

            // Act
            const startTime = Date.now();
            const result = await positionService.updatePosition(position);
            const latency = Date.now() - startTime;

            // Assert
            expect(result).toBeDefined();
            expect(result.aircraftId).toBe(aircraftId);
            expect(latency).toBeLessThan(MAX_LATENCY_MS);
            expect(mockWebSocketGateway.emit).toHaveBeenCalledWith(
                `position:${aircraftId}`,
                expect.any(Object)
            );
            expect(mockCacheManager.set).toHaveBeenCalled();
        });

        it('should handle concurrent position updates without data corruption', async () => {
            // Arrange
            const updateCount = BULK_UPDATE_SIZE;
            const positions: IPosition[] = Array.from({ length: updateCount }, () => ({
                id: uuidv4(),
                aircraftId: uuidv4(),
                latitude: faker.location.latitude(),
                longitude: faker.location.longitude(),
                altitude: faker.number.int({ min: 0, max: 45000 }),
                groundSpeed: faker.number.int({ min: 0, max: 500 }),
                heading: faker.number.int({ min: 0, max: 359 }),
                recorded: new Date()
            }));

            // Act
            const startTime = Date.now();
            const results = await Promise.all(
                positions.map(pos => positionService.updatePosition(pos))
            );
            const totalLatency = Date.now() - startTime;

            // Assert
            expect(results).toHaveLength(updateCount);
            expect(totalLatency / updateCount).toBeLessThan(MAX_LATENCY_MS);
            results.forEach(result => {
                expect(result).toMatchObject({
                    id: expect.any(String),
                    aircraftId: expect.any(String),
                    latitude: expect.any(Number),
                    longitude: expect.any(Number)
                });
            });
        });
    });

    describe('Historical Data Management', () => {
        it('should retrieve position history with correct pagination', async () => {
            // Arrange
            const aircraftId = uuidv4();
            const positions = Array.from({ length: 50 }, (_, index) => ({
                id: uuidv4(),
                aircraftId,
                latitude: faker.location.latitude(),
                longitude: faker.location.longitude(),
                altitude: faker.number.int({ min: 0, max: 45000 }),
                groundSpeed: faker.number.int({ min: 0, max: 500 }),
                heading: faker.number.int({ min: 0, max: 359 }),
                recorded: new Date(Date.now() - index * 60000) // 1 minute intervals
            }));

            // Save positions
            await Promise.all(positions.map(pos => positionService.updatePosition(pos)));

            // Act
            const result = await positionService.getPositionHistory(
                aircraftId,
                new Date(Date.now() - 3600000), // Last hour
                new Date(),
                { limit: 25, offset: 0 }
            );

            // Assert
            expect(result.data).toHaveLength(25);
            expect(result.total).toBeGreaterThanOrEqual(50);
            expect(result.hasMore).toBe(true);
            expect(result.data[0].recorded.getTime()).toBeGreaterThan(
                result.data[1].recorded.getTime()
            );
        });
    });

    describe('Data Retention Policy', () => {
        it('should enforce retention policy and clean up old data', async () => {
            // Arrange
            const aircraftId = uuidv4();
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - (RETENTION_DAYS + 1));
            
            const oldPosition: IPosition = {
                id: uuidv4(),
                aircraftId,
                latitude: faker.location.latitude(),
                longitude: faker.location.longitude(),
                altitude: faker.number.int({ min: 0, max: 45000 }),
                groundSpeed: faker.number.int({ min: 0, max: 500 }),
                heading: faker.number.int({ min: 0, max: 359 }),
                recorded: oldDate
            };

            await positionService.updatePosition(oldPosition);

            // Act
            const cleanupResult = await positionService.cleanupHistoricalData();

            // Assert
            expect(cleanupResult.recordsDeleted).toBeGreaterThan(0);
            const oldPositionQuery = await positionService.getLatestPosition(aircraftId);
            expect(oldPositionQuery).toBeNull();
        });
    });

    describe('Performance Metrics', () => {
        it('should maintain position accuracy within required decimal places', async () => {
            // Arrange
            const position: IPosition = {
                id: uuidv4(),
                aircraftId: uuidv4(),
                latitude: 42.123456789,
                longitude: -71.123456789,
                altitude: faker.number.int({ min: 0, max: 45000 }),
                groundSpeed: faker.number.int({ min: 0, max: 500 }),
                heading: faker.number.int({ min: 0, max: 359 }),
                recorded: new Date()
            };

            // Act
            const result = await positionService.updatePosition(position);

            // Assert
            expect(result.latitude.toString().split('.')[1].length)
                .toBeLessThanOrEqual(POSITION_ACCURACY_DECIMAL_PLACES);
            expect(result.longitude.toString().split('.')[1].length)
                .toBeLessThanOrEqual(POSITION_ACCURACY_DECIMAL_PLACES);
        });

        it('should handle bulk position updates efficiently', async () => {
            // Arrange
            const positions: IPosition[] = Array.from({ length: BULK_UPDATE_SIZE }, () => ({
                id: uuidv4(),
                aircraftId: uuidv4(),
                latitude: faker.location.latitude(),
                longitude: faker.location.longitude(),
                altitude: faker.number.int({ min: 0, max: 45000 }),
                groundSpeed: faker.number.int({ min: 0, max: 500 }),
                heading: faker.number.int({ min: 0, max: 359 }),
                recorded: new Date()
            }));

            // Act
            const startTime = Date.now();
            const results = await positionService.bulkUpdatePositions(positions);
            const totalTime = Date.now() - startTime;

            // Assert
            expect(results).toHaveLength(BULK_UPDATE_SIZE);
            expect(totalTime).toBeLessThan(MAX_LATENCY_MS * 2); // Allow higher latency for bulk
            expect(mockWebSocketGateway.emit).toHaveBeenCalledTimes(BULK_UPDATE_SIZE);
        });
    });
});