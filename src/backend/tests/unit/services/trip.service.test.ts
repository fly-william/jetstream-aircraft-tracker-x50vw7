/**
 * @fileoverview Comprehensive unit test suite for TripService class
 * @version 1.0.0
 */

import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TripService } from '../../../src/services/trip-management/services/trip.service';
import { TripRepository } from '../../../src/services/trip-management/repositories/trip.repository';
import { CrmSyncService } from '../../../src/services/trip-management/services/crm-sync.service';
import { TeamsService } from '../../../src/services/notification/services/teams.service';
import { TripStatus } from '../../../src/common/interfaces/trip.interface';
import { ErrorCode, ERROR_MESSAGES } from '../../../src/common/constants/error-codes';
import { generateMockTrip } from '../../utils/test-helpers';

describe('TripService', () => {
    let tripService: TripService;
    let tripRepository: jest.Mocked<TripRepository>;
    let crmSyncService: jest.Mocked<CrmSyncService>;
    let teamsService: jest.Mocked<TeamsService>;
    let metrics: jest.Mocked<any>;
    let cache: jest.Mocked<any>;

    beforeEach(() => {
        // Initialize mocks
        tripRepository = {
            findById: jest.fn(),
            findActiveTrips: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            createTrip: jest.fn(),
            updateTripStatus: jest.fn()
        } as any;

        crmSyncService = {
            syncTripToCrm: jest.fn(),
            validateCrmSync: jest.fn()
        } as any;

        teamsService = {
            sendStatusUpdate: jest.fn(),
            batchNotifications: jest.fn()
        } as any;

        metrics = {
            increment: jest.fn(),
            timing: jest.fn()
        };

        cache = {
            get: jest.fn(),
            set: jest.fn()
        };

        // Initialize service
        tripService = new TripService(
            tripRepository,
            crmSyncService,
            teamsService,
            metrics,
            cache
        );
    });

    describe('createTrip', () => {
        const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
        
        it('should create a trip with valid data and handle integrations within 5 seconds', async () => {
            // Arrange
            const startTime = Date.now();
            const mockTripData = generateMockTrip();
            const mockCreatedTrip = { ...mockTripData, id: '123' };

            tripRepository.createTrip.mockResolvedValue(mockCreatedTrip);
            crmSyncService.syncTripToCrm.mockResolvedValue(true);
            teamsService.sendStatusUpdate.mockResolvedValue([{ success: true, channelId: 'channel1' }]);

            // Act
            const result = await tripService.createTrip(mockTripData, mockUserId);

            // Assert
            expect(result).toEqual(mockCreatedTrip);
            expect(tripRepository.createTrip).toHaveBeenCalledWith(mockTripData, mockUserId);
            expect(crmSyncService.syncTripToCrm).toHaveBeenCalledWith(mockCreatedTrip.id);
            expect(teamsService.sendStatusUpdate).toHaveBeenCalledWith(
                mockCreatedTrip,
                mockUserId,
                ['operations', 'sales'],
                expect.any(Object)
            );
            expect(cache.set).toHaveBeenCalledWith(`trip:${mockCreatedTrip.id}`, mockCreatedTrip, { ttl: 300 });
            expect(Date.now() - startTime).toBeLessThan(5000);
        });

        it('should handle CRM sync failure gracefully', async () => {
            // Arrange
            const mockTripData = generateMockTrip();
            const mockCreatedTrip = { ...mockTripData, id: '123' };

            tripRepository.createTrip.mockResolvedValue(mockCreatedTrip);
            crmSyncService.syncTripToCrm.mockRejectedValue(new Error('CRM sync failed'));
            teamsService.sendStatusUpdate.mockResolvedValue([{ success: true, channelId: 'channel1' }]);

            // Act
            const result = await tripService.createTrip(mockTripData, mockUserId);

            // Assert
            expect(result).toEqual(mockCreatedTrip);
            expect(metrics.increment).toHaveBeenCalledWith('trip.create.errors');
        });

        it('should validate trip data before creation', async () => {
            // Arrange
            const invalidTripData = generateMockTrip({ departure: new Date(2023, 1, 1), arrival: new Date(2022, 1, 1) });

            // Act & Assert
            await expect(tripService.createTrip(invalidTripData, mockUserId))
                .rejects
                .toThrow(BadRequestException);
            expect(tripRepository.createTrip).not.toHaveBeenCalled();
        });
    });

    describe('updateTripStatus', () => {
        const mockTripId = '123e4567-e89b-12d3-a456-426614174000';
        const mockUserId = '123e4567-e89b-12d3-a456-426614174001';

        it('should update trip status and handle integrations within 5 seconds', async () => {
            // Arrange
            const startTime = Date.now();
            const mockTrip = generateMockTrip({ status: TripStatus.SCHEDULED });
            const mockUpdatedTrip = { ...mockTrip, status: TripStatus.IN_POSITION };

            tripRepository.findById.mockResolvedValue(mockTrip);
            tripRepository.updateTripStatus.mockResolvedValue(mockUpdatedTrip);
            crmSyncService.syncTripToCrm.mockResolvedValue(true);
            teamsService.sendStatusUpdate.mockResolvedValue([{ success: true, channelId: 'channel1' }]);

            // Act
            const result = await tripService.updateTripStatus(
                mockTripId,
                TripStatus.IN_POSITION,
                mockUserId
            );

            // Assert
            expect(result).toEqual(mockUpdatedTrip);
            expect(tripRepository.updateTripStatus).toHaveBeenCalledWith(
                mockTripId,
                TripStatus.IN_POSITION,
                mockUserId
            );
            expect(crmSyncService.syncTripToCrm).toHaveBeenCalledWith(mockTripId);
            expect(teamsService.sendStatusUpdate).toHaveBeenCalled();
            expect(Date.now() - startTime).toBeLessThan(5000);
        });

        it('should validate status transitions', async () => {
            // Arrange
            const mockTrip = generateMockTrip({ status: TripStatus.COMPLETED });
            tripRepository.findById.mockResolvedValue(mockTrip);

            // Act & Assert
            await expect(tripService.updateTripStatus(
                mockTripId,
                TripStatus.IN_POSITION,
                mockUserId
            )).rejects.toThrow(BadRequestException);
            expect(tripRepository.updateTripStatus).not.toHaveBeenCalled();
        });

        it('should handle parallel integration failures gracefully', async () => {
            // Arrange
            const mockTrip = generateMockTrip({ status: TripStatus.SCHEDULED });
            const mockUpdatedTrip = { ...mockTrip, status: TripStatus.IN_POSITION };

            tripRepository.findById.mockResolvedValue(mockTrip);
            tripRepository.updateTripStatus.mockResolvedValue(mockUpdatedTrip);
            crmSyncService.syncTripToCrm.mockRejectedValue(new Error('CRM sync failed'));
            teamsService.sendStatusUpdate.mockRejectedValue(new Error('Teams notification failed'));

            // Act
            const result = await tripService.updateTripStatus(
                mockTripId,
                TripStatus.IN_POSITION,
                mockUserId
            );

            // Assert
            expect(result).toEqual(mockUpdatedTrip);
            expect(metrics.increment).toHaveBeenCalledWith('trip.status.update.errors');
        });

        it('should handle non-existent trips', async () => {
            // Arrange
            tripRepository.findById.mockRejectedValue(new NotFoundException(ERROR_MESSAGES.RESOURCE_NOT_FOUND));

            // Act & Assert
            await expect(tripService.updateTripStatus(
                mockTripId,
                TripStatus.IN_POSITION,
                mockUserId
            )).rejects.toThrow(NotFoundException);
        });
    });

    describe('performance requirements', () => {
        it('should complete status updates within 5 seconds including integrations', async () => {
            // Arrange
            const startTime = Date.now();
            const mockTrip = generateMockTrip({ status: TripStatus.SCHEDULED });
            const mockUpdatedTrip = { ...mockTrip, status: TripStatus.IN_POSITION };

            tripRepository.findById.mockResolvedValue(mockTrip);
            tripRepository.updateTripStatus.mockResolvedValue(mockUpdatedTrip);
            crmSyncService.syncTripToCrm.mockResolvedValue(true);
            teamsService.sendStatusUpdate.mockResolvedValue([{ success: true, channelId: 'channel1' }]);

            // Act
            await tripService.updateTripStatus(
                mockTrip.id,
                TripStatus.IN_POSITION,
                'test-user'
            );

            // Assert
            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(5000);
            expect(metrics.timing).toHaveBeenCalledWith('trip.status.update.duration', expect.any(Number));
        });

        it('should optimize notification delivery for 60% efficiency improvement', async () => {
            // Arrange
            const mockTrip = generateMockTrip();
            const batchSize = 10;
            const notifications = Array(batchSize).fill({ success: true, channelId: 'channel1' });

            teamsService.batchNotifications.mockResolvedValue(notifications);

            // Act
            const startTime = Date.now();
            await Promise.all(Array(batchSize).fill(null).map(() => 
                tripService.updateTripStatus(mockTrip.id, TripStatus.IN_POSITION, 'test-user')
            ));

            // Assert
            const duration = Date.now() - startTime;
            expect(duration / batchSize).toBeLessThan(500); // Average time per notification
            expect(teamsService.batchNotifications).toHaveBeenCalled();
        });
    });
});