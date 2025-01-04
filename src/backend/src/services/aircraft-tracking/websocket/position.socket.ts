/**
 * @fileoverview WebSocket gateway implementation for real-time aircraft position updates
 * @version 1.0.0
 * @module services/aircraft-tracking/websocket/position
 */

import { Injectable } from '@nestjs/common'; // v10.0.0
import { WebSocketGateway, SubscribeMessage } from '@nestjs/websockets'; // v10.0.0
import { WebSocket } from 'ws'; // v8.0.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { IPosition } from '../../../common/interfaces/position.interface';
import { PositionService } from '../services/position.service';
import { logger } from '../../../common/utils/logger';
import { ErrorCode } from '../../../common/constants/error-codes';
import * as zlib from 'zlib';

/**
 * WebSocket gateway for handling real-time aircraft position updates
 * Implements high-performance client management and message broadcasting
 */
@Injectable()
@WebSocketGateway({
    namespace: 'positions',
    cors: true,
    transports: ['websocket'],
    pingInterval: 10000,
    pingTimeout: 5000
})
export class PositionWebSocketGateway {
    private readonly connectedClients: Map<string, WebSocket> = new Map();
    private readonly aircraftSubscriptions: Map<string, Set<string>> = new Map();
    private readonly messageQueue: Map<string, number> = new Map();
    private readonly BATCH_SIZE = 100;
    private readonly BROADCAST_INTERVAL = 100; // milliseconds
    private readonly MAX_RETRIES = 3;
    private readonly COMPRESSION_THRESHOLD = 1024; // bytes

    constructor(private readonly positionService: PositionService) {
        this.initializeHeartbeat();
        logger.info('Position WebSocket Gateway initialized');
    }

    /**
     * Handles new WebSocket client connections
     * @param client WebSocket client instance
     */
    async handleConnection(client: WebSocket): Promise<void> {
        try {
            const clientId = uuidv4();
            client.id = clientId;
            
            // Configure client settings
            client.binaryType = 'arraybuffer';
            client.setMaxListeners(20);
            
            // Initialize client tracking
            this.connectedClients.set(clientId, client);
            this.messageQueue.set(clientId, 0);
            
            // Set up client-specific error handling
            client.on('error', (error) => {
                logger.error('WebSocket client error', error, { clientId });
                this.handleDisconnect(client);
            });

            // Send connection acknowledgment
            const acknowledgment = {
                type: 'connection',
                clientId,
                timestamp: new Date().toISOString()
            };
            
            client.send(JSON.stringify(acknowledgment));
            
            logger.info('Client connected', { 
                clientId,
                totalClients: this.connectedClients.size 
            });
        } catch (error) {
            logger.error('Connection handling failed', error);
            client.terminate();
        }
    }

    /**
     * Handles client disconnections with cleanup
     * @param client WebSocket client instance
     */
    async handleDisconnect(client: WebSocket): Promise<void> {
        try {
            const clientId = client.id;
            
            // Clean up client subscriptions
            this.aircraftSubscriptions.forEach((subscribers, aircraftId) => {
                subscribers.delete(clientId);
                if (subscribers.size === 0) {
                    this.aircraftSubscriptions.delete(aircraftId);
                }
            });
            
            // Remove client tracking
            this.connectedClients.delete(clientId);
            this.messageQueue.delete(clientId);
            
            logger.info('Client disconnected', { 
                clientId,
                remainingClients: this.connectedClients.size 
            });
        } catch (error) {
            logger.error('Disconnect handling failed', error);
        }
    }

    /**
     * Broadcasts position updates to subscribed clients
     * @param position Aircraft position data
     */
    async broadcastPosition(position: IPosition): Promise<void> {
        try {
            const subscribers = this.aircraftSubscriptions.get(position.aircraftId) || new Set();
            if (subscribers.size === 0) return;

            // Prepare position payload
            const payload = JSON.stringify({
                type: 'position_update',
                data: position,
                timestamp: new Date().toISOString()
            });

            // Compress payload if above threshold
            let messageBuffer: Buffer | string = payload;
            if (payload.length > this.COMPRESSION_THRESHOLD) {
                messageBuffer = await this.compressMessage(payload);
            }

            // Broadcast to subscribers with retry logic
            for (const clientId of subscribers) {
                const client = this.connectedClients.get(clientId);
                if (!client) continue;

                let retries = 0;
                const sendMessage = async () => {
                    try {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(messageBuffer);
                            this.messageQueue.set(clientId, (this.messageQueue.get(clientId) || 0) + 1);
                        }
                    } catch (error) {
                        if (retries < this.MAX_RETRIES) {
                            retries++;
                            await new Promise(resolve => setTimeout(resolve, 100 * retries));
                            await sendMessage();
                        } else {
                            logger.error('Failed to send position update', error, {
                                clientId,
                                aircraftId: position.aircraftId
                            });
                            this.handleDisconnect(client);
                        }
                    }
                };

                await sendMessage();
            }
        } catch (error) {
            logger.error('Position broadcast failed', error, {
                aircraftId: position.aircraftId,
                errorCode: ErrorCode.WEBSOCKET_ERROR
            });
        }
    }

    /**
     * Subscribes a client to aircraft position updates
     * @param client WebSocket client
     * @param aircraftId Aircraft identifier
     */
    @SubscribeMessage('subscribe')
    async handleSubscribe(client: WebSocket, aircraftId: string): Promise<void> {
        try {
            if (!this.aircraftSubscriptions.has(aircraftId)) {
                this.aircraftSubscriptions.set(aircraftId, new Set());
            }
            
            this.aircraftSubscriptions.get(aircraftId).add(client.id);
            
            // Send latest position immediately
            const latestPosition = await this.positionService.getLatestPosition(aircraftId);
            if (latestPosition) {
                await this.broadcastPosition(latestPosition);
            }
            
            logger.info('Client subscribed to aircraft', {
                clientId: client.id,
                aircraftId
            });
        } catch (error) {
            logger.error('Subscription handling failed', error);
        }
    }

    /**
     * Initializes heartbeat monitoring for connected clients
     */
    private initializeHeartbeat(): void {
        setInterval(() => {
            this.connectedClients.forEach((client, clientId) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.ping();
                } else {
                    this.handleDisconnect(client);
                }
            });
        }, 30000); // 30 second interval
    }

    /**
     * Compresses message payload using zlib
     * @param message Message to compress
     * @returns Compressed message buffer
     */
    private async compressMessage(message: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            zlib.deflate(message, (error, buffer) => {
                if (error) reject(error);
                else resolve(buffer);
            });
        });
    }
}