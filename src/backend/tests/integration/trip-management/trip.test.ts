/**
 * @fileoverview Integration tests for trip management service
 * @version 1.0.0
 * 
 * Validates trip lifecycle, status updates, milestone tracking, and system integrations
 * with comprehensive performance monitoring and error scenario coverage.
 */

// External imports
import { 
    describe, 
    it, 
    beforeAll, 
    afterAll, 
    expect, 
    jest 
} from '@jest/globals'; // ^29.0.0
import { TestDatabaseManager } from '@test/database-manager'; // ^1.0.0
import { MockServiceProvider } from '@test/mock-service-provider'; // ^1.0.0

// Internal imports
import { TripService } from '../../src/services/trip-management/services/trip.service';
import { TripRepository } from '../../src/services/trip-management/repositories/trip.repository';
import { TripStatus, MilestoneType } from '../../src/common/interfaces/trip.interface';
import { ErrorCode } from '../../src/common/constants/error-codes';

describe('Trip Management Integration Tests', () => {
    let tripService: TripService;
    let tripRepository: TripRepository;
    let dbManager: TestDatabaseManager;
    let mockProvider: MockServiceProvider;
    let testTripId: UUID;

    // Test data
    const testUserId = '550e8400-e29b-41d4-a716-446655440000';
    const testAircraftId = '7a6ef900-c5c8-4a42-8d2e-6876543210ab';

    beforeAll(async () => {
        // Initialize test database
        dbManager = new TestDatabaseManager();
        await dbManager.initialize();

        // Setup mock services
        mockProvider = new MockServiceProvider();
        const mockTeamsService = mockProvider.createMockTeamsService();
        const mockCrmService = mockProvider.createMockCrmService();
        const mockMetrics = mockProvider.createMockMetrics();
        const mockCache = mockProvider.createMockCache();

        // Initialize repository and service
        tripRepository = new TripRepository(dbManager.getConnection());
        tripService = new TripService(
            tripRepository,
            mockCrmService,
            mockTeamsService,
            mockMetrics,
            mockCache
        );

        // Configure test timeouts
        jest.setTimeout(10000);
    });

    afterAll(async () => {
        await dbManager.cleanup();
        await mockProvider.cleanup();
    });

    describe('Trip Lifecycle Management', () => {
        it('should create a new trip with initial status', async () => {
            const tripData = {
                aircraftId: testAircraftId,
                startTime: new Date(Date.now() + 3600000), // 1 hour from now
                endTime: new Date(Date.now() + 7200000),   // 2 hours from now
                metadata: {
                    flightNumber: 'TEST123',
                    priority: 'HIGH'
                }
            };

            const trip = await tripService.createTrip(tripData, testUserId);
            testTripId = trip.id;

            expect(trip).toBeDefined();
            expect(trip.status).toBe(TripStatus.SCHEDULED);
            expect(trip.aircraftId).toBe(testAircraftId);
            expect(trip.lastUpdatedBy).toBe(testUserId);
        });

        it('should validate trip status transitions', async () => {
            const validTransition = await tripService.updateTripStatus(
                testTripId,
                TripStatus.IN_POSITION,
                testUserId
            );

            expect(validTransition.status).toBe(TripStatus.IN_POSITION);

            await expect(
                tripService.updateTripStatus(
                    testTripId,
                    TripStatus.COMPLETED,
                    testUserId
                )
            ).rejects.toThrow(ErrorCode.INVALID_STATUS_TRANSITION);
        });

        it('should track trip milestones', async () => {
            const milestone = await tripService.addTripMilestone({
                tripId: testTripId,
                type: MilestoneType.STATUS_UPDATE,
                timestamp: new Date(),
                details: {
                    previousStatus: TripStatus.SCHEDULED,
                    newStatus: TripStatus.IN_POSITION
                },
                userId: testUserId,
                userRole: 'OPERATIONS'
            });

            expect(milestone).toBeDefined();
            expect(milestone.tripId).toBe(testTripId);
            expect(milestone.type).toBe(MilestoneType.STATUS_UPDATE);
        });

        it('should verify Teams notification delivery', async () => {
            const notificationSpy = jest.spyOn(mockProvider.teamsService, 'sendStatusUpdate');
            
            await tripService.updateTripStatus(
                testTripId,
                TripStatus.BOARDING,
                testUserId
            );

            expect(notificationSpy).toHaveBeenCalled();
            const notificationArgs = notificationSpy.mock.calls[0];
            expect(notificationArgs[0].id).toBe(testTripId);
            expect(notificationArgs[0].status).toBe(TripStatus.BOARDING);
        });

        it('should verify CRM synchronization', async () => {
            const crmSyncSpy = jest.spyOn(mockProvider.crmService, 'syncTripToCrm');
            
            await tripService.updateTripStatus(
                testTripId,
                TripStatus.DEPARTED,
                testUserId
            );

            expect(crmSyncSpy).toHaveBeenCalled();
            const syncArgs = crmSyncSpy.mock.calls[0];
            expect(syncArgs[0]).toBe(testTripId);
        });
    });

    describe('Performance Requirements', () => {
        it('should meet status update latency requirements', async () => {
            const startTime = Date.now();
            
            await tripService.updateTripStatus(
                testTripId,
                TripStatus.ENROUTE,
                testUserId
            );

            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(5000); // 5-second SLA requirement
        });

        it('should handle concurrent status updates', async () => {
            const trips = await Promise.all([
                tripService.createTrip({
                    aircraftId: testAircraftId,
                    startTime: new Date(Date.now() + 3600000),
                    endTime: new Date(Date.now() + 7200000)
                }, testUserId),
                tripService.createTrip({
                    aircraftId: testAircraftId,
                    startTime: new Date(Date.now() + 7200000),
                    endTime: new Date(Date.now() + 10800000)
                }, testUserId)
            ]);

            const updatePromises = trips.map(trip =>
                tripService.updateTripStatus(
                    trip.id,
                    TripStatus.IN_POSITION,
                    testUserId
                )
            );

            const results = await Promise.all(updatePromises);
            results.forEach(result => {
                expect(result.status).toBe(TripStatus.IN_POSITION);
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle Teams notification failures gracefully', async () => {
            mockProvider.teamsService.sendStatusUpdate.mockRejectedValueOnce(
                new Error(ErrorCode.TEAMS_INTEGRATION_ERROR)
            );

            const trip = await tripService.updateTripStatus(
                testTripId,
                TripStatus.ARRIVED,
                testUserId
            );

            expect(trip.status).toBe(TripStatus.ARRIVED);
        });

        it('should handle CRM sync failures gracefully', async () => {
            mockProvider.crmService.syncTripToCrm.mockRejectedValueOnce(
                new Error(ErrorCode.CRM_SYNC_ERROR)
            );

            const trip = await tripService.updateTripStatus(
                testTripId,
                TripStatus.COMPLETED,
                testUserId
            );

            expect(trip.status).toBe(TripStatus.COMPLETED);
        });

        it('should handle invalid trip IDs', async () => {
            const invalidTripId = '00000000-0000-0000-0000-000000000000';
            
            await expect(
                tripService.updateTripStatus(
                    invalidTripId,
                    TripStatus.IN_POSITION,
                    testUserId
                )
            ).rejects.toThrow(ErrorCode.RESOURCE_NOT_FOUND);
        });
    });
});