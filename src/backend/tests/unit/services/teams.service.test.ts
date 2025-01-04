/**
 * @fileoverview Comprehensive unit tests for Teams notification service
 * @version 1.0.0
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals'; // v29.0.0
import { Client } from '@microsoft/microsoft-graph-client'; // v3.0.0
import { TeamsService } from '../../../src/services/notification/services/teams.service';
import { teamsConfig } from '../../../src/config/teams.config';
import { TripStatus, MilestoneType } from '../../../src/common/interfaces/trip.interface';
import { ErrorCode } from '../../../src/common/constants/error-codes';
import { generateMockTrip } from '../../utils/test-helpers';

// Constants for testing
const MOCK_CHANNEL_ID = 'mock-channel-123';
const MOCK_USER = 'test-user@flyusa.com';
const PERFORMANCE_THRESHOLD_MS = 5000; // 5 second SLA requirement
const RETRY_ATTEMPTS = 3;
const CIRCUIT_BREAKER_THRESHOLD = 5;

describe('TeamsService', () => {
  let teamsService: TeamsService;
  let mockGraphClient: jest.Mocked<Client>;
  let mockTrip: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock Graph client
    mockGraphClient = {
      api: jest.fn().mockReturnThis(),
      post: jest.fn()
    } as unknown as jest.Mocked<Client>;

    // Initialize service with test configuration
    teamsService = new TeamsService({
      maxRetries: RETRY_ATTEMPTS,
      retryDelay: 100,
      circuitBreakerTimeout: 1000
    });

    // Generate mock trip data
    mockTrip = generateMockTrip({
      status: TripStatus.IN_POSITION,
      coordinates: {
        latitude: 42.3601,
        longitude: -71.0589,
        accuracy: 0.0001
      }
    });

    // Replace internal Graph client with mock
    (teamsService as any).graphClient = mockGraphClient;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('sendStatusUpdate', () => {
    it('should successfully send status update notification', async () => {
      // Setup mock response
      mockGraphClient.post.mockResolvedValueOnce({ id: 'message-123' });

      const result = await teamsService.sendStatusUpdate(
        mockTrip,
        MOCK_USER,
        [MOCK_CHANNEL_ID],
        { operations: ['ops-channel'] }
      );

      expect(result).toHaveLength(1);
      expect(result[0].success).toBe(true);
      expect(result[0].channelId).toBe(MOCK_CHANNEL_ID);
      expect(result[0].messageId).toBe('message-123');
      expect(mockGraphClient.api).toHaveBeenCalledWith(
        expect.stringContaining('/teams/')
      );
    });

    it('should handle notification failures with retry mechanism', async () => {
      // Setup mock to fail twice then succeed
      mockGraphClient.post
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ id: 'message-123' });

      const result = await teamsService.sendStatusUpdate(
        mockTrip,
        MOCK_USER,
        [MOCK_CHANNEL_ID],
        {}
      );

      expect(result[0].success).toBe(true);
      expect(mockGraphClient.post).toHaveBeenCalledTimes(3);
    });

    it('should respect performance SLA requirements', async () => {
      const startTime = Date.now();
      
      await teamsService.sendStatusUpdate(
        mockTrip,
        MOCK_USER,
        [MOCK_CHANNEL_ID],
        {}
      );

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('should deduplicate identical notifications within cache window', async () => {
      // Send first notification
      await teamsService.sendStatusUpdate(
        mockTrip,
        MOCK_USER,
        [MOCK_CHANNEL_ID],
        {}
      );

      // Send duplicate immediately
      const duplicateResult = await teamsService.sendStatusUpdate(
        mockTrip,
        MOCK_USER,
        [MOCK_CHANNEL_ID],
        {}
      );

      expect(duplicateResult).toHaveLength(0);
      expect(mockGraphClient.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendTripUpdate', () => {
    const mockMilestone = {
      id: 'milestone-123',
      type: MilestoneType.SERVICE_UPDATE,
      timestamp: new Date(),
      details: {
        service: 'CATERING',
        status: 'COMPLETED'
      }
    };

    it('should successfully send trip milestone update', async () => {
      mockGraphClient.post.mockResolvedValueOnce({ id: 'message-123' });

      const result = await teamsService.sendTripUpdate(
        mockTrip,
        mockMilestone,
        MOCK_USER,
        [MOCK_CHANNEL_ID],
        {}
      );

      expect(result[0].success).toBe(true);
      expect(result[0].messageId).toBe('message-123');
    });

    it('should apply department routing rules correctly', async () => {
      mockGraphClient.post.mockResolvedValue({ id: 'message-123' });

      const departmentRules = {
        operations: ['ops-channel'],
        sales: ['sales-channel']
      };

      const result = await teamsService.sendTripUpdate(
        mockTrip,
        mockMilestone,
        MOCK_USER,
        [MOCK_CHANNEL_ID],
        departmentRules
      );

      expect(result).toHaveLength(3); // Original + 2 department channels
      expect(result.every(r => r.success)).toBe(true);
    });
  });

  describe('Circuit Breaker Pattern', () => {
    it('should open circuit after threshold failures', async () => {
      // Configure mock to always fail
      mockGraphClient.post.mockRejectedValue(new Error('Service unavailable'));

      // Attempt calls until circuit breaker threshold
      for (let i = 0; i < CIRCUIT_BREAKER_THRESHOLD; i++) {
        try {
          await teamsService.sendStatusUpdate(
            mockTrip,
            MOCK_USER,
            [MOCK_CHANNEL_ID],
            {}
          );
        } catch (error) {
          expect(error).toBeDefined();
        }
      }

      // Verify circuit is open
      const circuitBreaker = (teamsService as any).circuitBreaker;
      expect(circuitBreaker.opened).toBe(true);
    });

    it('should reset circuit after timeout period', async () => {
      // Configure mock to fail initially then succeed
      mockGraphClient.post
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValueOnce({ id: 'message-123' });

      // Trigger circuit breaker
      for (let i = 0; i < CIRCUIT_BREAKER_THRESHOLD; i++) {
        try {
          await teamsService.sendStatusUpdate(
            mockTrip,
            MOCK_USER,
            [MOCK_CHANNEL_ID],
            {}
          );
        } catch (error) {
          expect(error).toBeDefined();
        }
      }

      // Fast-forward past reset timeout
      jest.advanceTimersByTime(teamsConfig.circuitBreaker.resetTimeout + 100);

      // Attempt new request
      const result = await teamsService.sendStatusUpdate(
        mockTrip,
        MOCK_USER,
        [MOCK_CHANNEL_ID],
        {}
      );

      expect(result[0].success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle Graph API authentication errors', async () => {
      mockGraphClient.post.mockRejectedValueOnce(
        new Error('Authentication failed')
      );

      try {
        await teamsService.sendStatusUpdate(
          mockTrip,
          MOCK_USER,
          [MOCK_CHANNEL_ID],
          {}
        );
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Authentication failed');
      }
    });

    it('should handle network timeouts', async () => {
      mockGraphClient.post.mockRejectedValueOnce(
        new Error('Request timeout')
      );

      const result = await teamsService.sendStatusUpdate(
        mockTrip,
        MOCK_USER,
        [MOCK_CHANNEL_ID],
        {}
      );

      expect(result[0].success).toBe(false);
      expect(result[0].error).toContain('Request timeout');
    });
  });

  describe('Performance Monitoring', () => {
    it('should handle concurrent notifications efficiently', async () => {
      mockGraphClient.post.mockResolvedValue({ id: 'message-123' });

      const channels = Array(10).fill(MOCK_CHANNEL_ID);
      const startTime = Date.now();

      const results = await teamsService.sendStatusUpdate(
        mockTrip,
        MOCK_USER,
        channels,
        {}
      );

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(results).toHaveLength(channels.length);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should maintain performance under retry conditions', async () => {
      mockGraphClient.post
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ id: 'message-123' });

      const startTime = Date.now();

      await teamsService.sendStatusUpdate(
        mockTrip,
        MOCK_USER,
        [MOCK_CHANNEL_ID],
        {}
      );

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });
  });
});