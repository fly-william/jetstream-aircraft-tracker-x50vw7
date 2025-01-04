/**
 * @fileoverview Unit test suite for ADS-B service validating real-time aircraft tracking,
 * position data processing, and data quality requirements
 * @version 1.0.0
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals'; // v29.0.0
import WebSocket from 'ws'; // v8.13.0
import { ADSBService } from '../../../src/services/aircraft-tracking/services/adsb.service';
import { PositionRepository } from '../../../src/services/aircraft-tracking/repositories/position.repository';
import { generateMockPosition } from '../../utils/test-helpers';
import { ErrorCode } from '../../../src/common/constants/error-codes';

// Mock WebSocket
jest.mock('ws');

describe('ADSBService', () => {
    let adsbService: ADSBService;
    let mockPositionRepository: jest.Mocked<PositionRepository>;
    let mockWebSocket: jest.Mocked<WebSocket>;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        jest.useFakeTimers();

        // Setup WebSocket mock
        mockWebSocket = {
            on: jest.fn(),
            send: jest.fn(),
            close: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        } as unknown as jest.Mocked<WebSocket>;
        (WebSocket as jest.Mock).mockImplementation(() => mockWebSocket);

        // Setup repository mock
        mockPositionRepository = {
            savePosition: jest.fn(),
            getLatestPosition: jest.fn(),
            saveBatchPositions: jest.fn()
        } as unknown as jest.Mocked<PositionRepository>;

        // Initialize service
        adsbService = new ADSBService(mockPositionRepository);
    });

    afterEach(() => {
        mockWebSocket.close();
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    describe('WebSocket Connection Management', () => {
        it('should establish connection successfully', async () => {
            await adsbService.connect();

            expect(WebSocket).toHaveBeenCalledWith(
                process.env.ADSB_WEBSOCKET_URL,
                expect.any(Object)
            );
            expect(mockWebSocket.on).toHaveBeenCalledWith('open', expect.any(Function));
            expect(mockWebSocket.on).toHaveBeenCalledWith('message', expect.any(Function));
            expect(mockWebSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
            expect(mockWebSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
        });

        it('should implement connection retry with exponential backoff', async () => {
            // Simulate connection failure
            mockWebSocket.on.mockImplementation((event, callback) => {
                if (event === 'error') {
                    callback(new Error('Connection failed'));
                }
                return mockWebSocket;
            });

            await adsbService.connect();
            jest.advanceTimersByTime(5000); // First retry
            jest.advanceTimersByTime(10000); // Second retry

            expect(WebSocket).toHaveBeenCalledTimes(3);
        });

        it('should monitor connection health with heartbeat', async () => {
            await adsbService.connect();
            
            // Simulate no messages received
            jest.advanceTimersByTime(31000); // Exceed 30s threshold

            expect(mockWebSocket.close).toHaveBeenCalled();
            expect(WebSocket).toHaveBeenCalledTimes(2); // Original + reconnect
        });
    });

    describe('Message Processing', () => {
        const validMessage = {
            icao24: 'ABC123',
            lat: 42.3601,
            lon: -71.0589,
            alt: 30000,
            speed: 450,
            heading: 90,
            timestamp: Date.now(),
            source: 'ADS-B',
            messageType: 'position',
            signalStrength: 0.8,
            isValid: true
        };

        it('should process valid ADS-B messages correctly', async () => {
            // Simulate message reception
            mockWebSocket.on.mockImplementation((event, callback) => {
                if (event === 'message') {
                    callback(JSON.stringify(validMessage));
                }
                return mockWebSocket;
            });

            await adsbService.connect();
            
            // Trigger message processing
            const messageCallback = mockWebSocket.on.mock.calls.find(
                call => call[0] === 'message'
            )[1];
            await messageCallback(JSON.stringify(validMessage));

            expect(mockPositionRepository.savePosition).toHaveBeenCalledWith(
                expect.objectContaining({
                    aircraftId: validMessage.icao24,
                    latitude: validMessage.lat,
                    longitude: validMessage.lon,
                    altitude: validMessage.alt,
                    groundSpeed: validMessage.speed,
                    heading: validMessage.heading
                })
            );
        });

        it('should buffer messages and process in batches', async () => {
            const messages = Array(100).fill(validMessage).map((msg, i) => ({
                ...msg,
                icao24: `ABC${i}`,
                timestamp: Date.now() + i * 1000
            }));

            // Simulate batch of messages
            messages.forEach(msg => {
                const messageCallback = mockWebSocket.on.mock.calls.find(
                    call => call[0] === 'message'
                )[1];
                messageCallback(JSON.stringify(msg));
            });

            // Trigger buffer processing
            jest.advanceTimersByTime(1000);

            expect(mockPositionRepository.saveBatchPositions).toHaveBeenCalled();
            expect(mockPositionRepository.saveBatchPositions.mock.calls[0][0]).toHaveLength(100);
        });

        it('should validate message data ranges', async () => {
            const invalidMessage = {
                ...validMessage,
                lat: 100, // Invalid latitude
                lon: 200  // Invalid longitude
            };

            // Simulate invalid message
            const messageCallback = mockWebSocket.on.mock.calls.find(
                call => call[0] === 'message'
            )[1];
            await messageCallback(JSON.stringify(invalidMessage));

            expect(mockPositionRepository.savePosition).not.toHaveBeenCalled();
        });
    });

    describe('Data Quality Validation', () => {
        it('should validate coordinate ranges', () => {
            const testCases = [
                { lat: -90, lon: -180, expected: true },
                { lat: 90, lon: 180, expected: true },
                { lat: -91, lon: 0, expected: false },
                { lat: 91, lon: 0, expected: false },
                { lat: 0, lon: -181, expected: false },
                { lat: 0, lon: 181, expected: false }
            ];

            testCases.forEach(({ lat, lon, expected }) => {
                const message = {
                    icao24: 'TEST',
                    lat,
                    lon,
                    alt: 30000,
                    speed: 450,
                    heading: 90,
                    timestamp: Date.now(),
                    source: 'ADS-B',
                    messageType: 'position',
                    signalStrength: 0.8,
                    isValid: true
                };

                const messageCallback = mockWebSocket.on.mock.calls.find(
                    call => call[0] === 'message'
                )[1];
                messageCallback(JSON.stringify(message));

                if (expected) {
                    expect(mockPositionRepository.savePosition).toHaveBeenCalled();
                } else {
                    expect(mockPositionRepository.savePosition).not.toHaveBeenCalled();
                }
                mockPositionRepository.savePosition.mockClear();
            });
        });

        it('should validate altitude ranges', () => {
            const testCases = [
                { alt: -1000, expected: true },
                { alt: 60000, expected: true },
                { alt: -1001, expected: false },
                { alt: 60001, expected: false }
            ];

            testCases.forEach(({ alt, expected }) => {
                const message = {
                    ...validMessage,
                    alt
                };

                const messageCallback = mockWebSocket.on.mock.calls.find(
                    call => call[0] === 'message'
                )[1];
                messageCallback(JSON.stringify(message));

                if (expected) {
                    expect(mockPositionRepository.savePosition).toHaveBeenCalled();
                } else {
                    expect(mockPositionRepository.savePosition).not.toHaveBeenCalled();
                }
                mockPositionRepository.savePosition.mockClear();
            });
        });

        it('should validate message timestamps', () => {
            const now = Date.now();
            const testCases = [
                { timestamp: now, expected: true },
                { timestamp: now - 29000, expected: true }, // Just within 30s
                { timestamp: now - 31000, expected: false }, // Just outside 30s
                { timestamp: now + 1000, expected: true }, // Slight future timestamp ok
                { timestamp: now + 31000, expected: false } // Too far in future
            ];

            testCases.forEach(({ timestamp, expected }) => {
                const message = {
                    ...validMessage,
                    timestamp
                };

                const messageCallback = mockWebSocket.on.mock.calls.find(
                    call => call[0] === 'message'
                )[1];
                messageCallback(JSON.stringify(message));

                if (expected) {
                    expect(mockPositionRepository.savePosition).toHaveBeenCalled();
                } else {
                    expect(mockPositionRepository.savePosition).not.toHaveBeenCalled();
                }
                mockPositionRepository.savePosition.mockClear();
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle WebSocket errors gracefully', async () => {
            const error = new Error('WebSocket error');
            mockWebSocket.on.mockImplementation((event, callback) => {
                if (event === 'error') {
                    callback(error);
                }
                return mockWebSocket;
            });

            await adsbService.connect();
            const errorCallback = mockWebSocket.on.mock.calls.find(
                call => call[0] === 'error'
            )[1];
            errorCallback(error);

            // Should attempt reconnection
            expect(WebSocket).toHaveBeenCalledTimes(2);
        });

        it('should handle message parsing errors', async () => {
            const messageCallback = mockWebSocket.on.mock.calls.find(
                call => call[0] === 'message'
            )[1];
            await messageCallback('invalid json');

            expect(mockPositionRepository.savePosition).not.toHaveBeenCalled();
        });

        it('should handle repository errors', async () => {
            mockPositionRepository.savePosition.mockRejectedValue(
                new Error(ErrorCode.INVALID_POSITION_DATA)
            );

            const messageCallback = mockWebSocket.on.mock.calls.find(
                call => call[0] === 'message'
            )[1];
            await messageCallback(JSON.stringify(validMessage));

            // Should not throw but log error
            expect(mockPositionRepository.savePosition).toHaveBeenCalled();
        });
    });
});