/**
 * @fileoverview Enhanced ADS-B service for real-time aircraft position tracking
 * @version 1.0.0
 * @module services/aircraft-tracking/services/adsb
 */

import { Injectable } from '@nestjs/common'; // v10.0.0
import WebSocket from 'ws'; // v8.13.0
import { IPosition } from '../../../common/interfaces/position.interface';
import { PositionRepository } from '../repositories/position.repository';
import { logger } from '../../../common/utils/logger';
import { ErrorCode } from '../../../common/constants/error-codes';

/**
 * Interface for raw ADS-B message format with enhanced validation
 */
interface IADSBData {
    icao24: string;
    lat: number;
    lon: number;
    alt: number;
    speed: number;
    heading: number;
    timestamp: number;
    source: string;
    messageType: string;
    signalStrength: number;
    isValid: boolean;
}

/**
 * Enhanced service for processing ADS-B data streams with improved reliability
 * and monitoring capabilities
 */
@Injectable()
export class ADSBService {
    private adsbSocket: WebSocket | null = null;
    private readonly reconnectAttempts = 5;
    private readonly reconnectDelay = 5000;
    private readonly messageBuffer: IADSBData[] = [];
    private readonly bufferSize = 100;
    private readonly bufferInterval = 1000;
    private isConnected = false;
    private lastMessageTime: number = Date.now();
    private healthCheckInterval: NodeJS.Timeout | null = null;
    private bufferProcessInterval: NodeJS.Timeout | null = null;

    private readonly healthMetrics = {
        messagesReceived: 0,
        messagesProcessed: 0,
        errors: 0,
        lastConnectionTime: 0,
        avgProcessingTime: 0,
        connectionAttempts: 0
    };

    constructor(
        private readonly positionRepository: PositionRepository
    ) {
        this.initializeService();
    }

    /**
     * Initializes the ADS-B service and sets up monitoring
     */
    private initializeService(): void {
        this.setupHealthCheck();
        this.setupBufferProcessing();
        logger.info('ADS-B service initialized', {
            bufferSize: this.bufferSize,
            reconnectAttempts: this.reconnectAttempts
        });
    }

    /**
     * Establishes connection to ADS-B data provider with retry logic
     */
    public async connect(): Promise<void> {
        if (this.isConnected) {
            logger.info('ADS-B connection already established');
            return;
        }

        try {
            this.healthMetrics.connectionAttempts++;
            this.adsbSocket = new WebSocket(process.env.ADSB_WEBSOCKET_URL!, {
                handshakeTimeout: 10000,
                maxPayload: 1024 * 1024,
                rejectUnauthorized: process.env.NODE_ENV === 'production'
            });

            this.setupSocketHandlers();
            logger.info('Initiating ADS-B connection');
        } catch (error) {
            logger.error('Failed to establish ADS-B connection', error as Error);
            await this.handleConnectionError();
        }
    }

    /**
     * Sets up WebSocket event handlers with enhanced error handling
     */
    private setupSocketHandlers(): void {
        if (!this.adsbSocket) return;

        this.adsbSocket.on('open', () => {
            this.isConnected = true;
            this.healthMetrics.lastConnectionTime = Date.now();
            logger.info('ADS-B connection established successfully');
        });

        this.adsbSocket.on('message', async (data: WebSocket.Data) => {
            try {
                const parsedData = JSON.parse(data.toString()) as IADSBData;
                this.healthMetrics.messagesReceived++;
                this.lastMessageTime = Date.now();
                await this.handleMessage(parsedData);
            } catch (error) {
                this.healthMetrics.errors++;
                logger.error('Error processing ADS-B message', error as Error);
            }
        });

        this.adsbSocket.on('error', (error) => {
            this.healthMetrics.errors++;
            logger.error('ADS-B WebSocket error', error);
        });

        this.adsbSocket.on('close', async () => {
            this.isConnected = false;
            logger.warn('ADS-B connection closed');
            await this.handleConnectionError();
        });
    }

    /**
     * Handles incoming ADS-B messages with buffering and validation
     */
    private async handleMessage(data: IADSBData): Promise<void> {
        if (!this.validateMessage(data)) {
            logger.warn('Invalid ADS-B message received', { data });
            return;
        }

        this.messageBuffer.push(data);
        if (this.messageBuffer.length >= this.bufferSize) {
            await this.processMessageBuffer();
        }
    }

    /**
     * Processes buffered messages in batch for improved performance
     */
    private async processMessageBuffer(): Promise<void> {
        if (this.messageBuffer.length === 0) return;

        const startTime = Date.now();
        const positions: IPosition[] = this.messageBuffer
            .map(data => this.convertToPosition(data))
            .filter((pos): pos is IPosition => pos !== null);

        try {
            await this.positionRepository.saveBatchPositions(positions);
            this.healthMetrics.messagesProcessed += positions.length;
            
            const processingTime = Date.now() - startTime;
            this.healthMetrics.avgProcessingTime = 
                (this.healthMetrics.avgProcessingTime + processingTime) / 2;

            this.messageBuffer.length = 0;
            logger.debug('Processed message buffer', { 
                count: positions.length,
                processingTime 
            });
        } catch (error) {
            this.healthMetrics.errors++;
            logger.error('Failed to process message buffer', error as Error);
        }
    }

    /**
     * Validates incoming ADS-B message format and data ranges
     */
    private validateMessage(data: IADSBData): boolean {
        return (
            data.icao24 &&
            typeof data.lat === 'number' && data.lat >= -90 && data.lat <= 90 &&
            typeof data.lon === 'number' && data.lon >= -180 && data.lon <= 180 &&
            typeof data.alt === 'number' && data.alt >= -1000 && data.alt <= 60000 &&
            typeof data.speed === 'number' && data.speed >= 0 &&
            typeof data.heading === 'number' && data.heading >= 0 && data.heading < 360 &&
            typeof data.timestamp === 'number' &&
            Date.now() - data.timestamp < 30000 // Message not older than 30 seconds
        );
    }

    /**
     * Converts ADS-B message to position interface format
     */
    private convertToPosition(data: IADSBData): IPosition | null {
        try {
            return {
                aircraftId: data.icao24,
                latitude: data.lat,
                longitude: data.lon,
                altitude: data.alt,
                groundSpeed: data.speed,
                heading: data.heading,
                recorded: new Date(data.timestamp)
            };
        } catch (error) {
            logger.error('Error converting ADS-B data to position', error as Error, {
                data,
                errorCode: ErrorCode.INVALID_POSITION_DATA
            });
            return null;
        }
    }

    /**
     * Handles connection errors with exponential backoff retry
     */
    private async handleConnectionError(): Promise<void> {
        if (this.healthMetrics.connectionAttempts < this.reconnectAttempts) {
            const delay = this.reconnectDelay * Math.pow(2, this.healthMetrics.connectionAttempts - 1);
            logger.info('Attempting to reconnect', { 
                attempt: this.healthMetrics.connectionAttempts,
                delay 
            });
            
            setTimeout(() => {
                this.connect();
            }, delay);
        } else {
            logger.error('Max reconnection attempts reached', new Error(ErrorCode.ADSB_DATA_ERROR));
        }
    }

    /**
     * Sets up health monitoring interval
     */
    private setupHealthCheck(): void {
        this.healthCheckInterval = setInterval(() => {
            const now = Date.now();
            if (this.isConnected && now - this.lastMessageTime > 30000) {
                logger.warn('No ADS-B messages received in last 30 seconds');
                this.handleConnectionError();
            }
        }, 10000);
    }

    /**
     * Sets up buffer processing interval
     */
    private setupBufferProcessing(): void {
        this.bufferProcessInterval = setInterval(() => {
            if (this.messageBuffer.length > 0) {
                this.processMessageBuffer();
            }
        }, this.bufferInterval);
    }

    /**
     * Retrieves current health metrics
     */
    public getHealthMetrics() {
        return {
            ...this.healthMetrics,
            isConnected: this.isConnected,
            bufferSize: this.messageBuffer.length,
            lastMessageAge: Date.now() - this.lastMessageTime
        };
    }

    /**
     * Cleanup resources on service shutdown
     */
    public async onApplicationShutdown(): Promise<void> {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        if (this.bufferProcessInterval) {
            clearInterval(this.bufferProcessInterval);
        }
        if (this.adsbSocket) {
            this.adsbSocket.close();
        }
        logger.info('ADS-B service shutdown complete');
    }
}