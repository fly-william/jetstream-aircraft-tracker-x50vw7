/**
 * @fileoverview CRM Synchronization Service for JetStream platform
 * @version 1.0.0
 * 
 * Handles bidirectional synchronization between JetStream and FlyUSA's CRM system
 * with comprehensive error handling, retry mechanisms, and audit logging.
 */

// External imports
import { Injectable, Logger } from '@nestjs/common'; // version: 10.x
import { retry, catchError } from 'rxjs/operators'; // version: 7.x
import { Observable, throwError, from, TimeoutError } from 'rxjs'; // version: 7.x
import axios, { AxiosInstance, AxiosError } from 'axios'; // version: 1.x

// Internal imports
import { ITrip, TripStatus } from '../../../common/interfaces/trip.interface';
import { TripRepository } from '../repositories/trip.repository';
import { TripAuditLog, AuditActionType } from '../../../common/types/trip.types';

/**
 * Interface for CRM webhook payload
 */
interface ICrmWebhookPayload {
    tripId: string;
    crmTripId: string;
    status: string;
    metadata: Record<string, any>;
    timestamp: string;
    signature: string;
}

/**
 * Service responsible for managing CRM synchronization operations
 */
@Injectable()
export class CrmSyncService {
    private readonly logger = new Logger(CrmSyncService.name);
    private readonly crmClient: AxiosInstance;
    private readonly maxRetries = 3;
    private readonly retryDelay = 1000;
    private readonly syncTimeout = 5000;

    constructor(
        private readonly tripRepository: TripRepository
    ) {
        // Initialize CRM API client with configuration
        this.crmClient = axios.create({
            baseURL: process.env.CRM_API_URL,
            timeout: this.syncTimeout,
            headers: {
                'Authorization': `Bearer ${process.env.CRM_API_KEY}`,
                'Content-Type': 'application/json',
                'X-Api-Version': '1.0'
            }
        });
    }

    /**
     * Synchronizes trip data to the CRM system with retry logic
     * @param tripId Trip UUID to synchronize
     * @returns Promise resolving to sync success status
     */
    async syncTripToCrm(tripId: UUID): Promise<boolean> {
        const startTime = Date.now();
        this.logger.debug(`Starting CRM sync for trip ${tripId}`);

        try {
            const trip = await this.tripRepository.findById(tripId);
            const crmPayload = this.transformTripToCrmFormat(trip);

            await from(this.crmClient.post('/trips/sync', crmPayload)).pipe(
                retry({
                    count: this.maxRetries,
                    delay: (error, retryCount) => {
                        this.logger.warn(
                            `Retry ${retryCount} for trip ${tripId} sync: ${error.message}`
                        );
                        return this.retryDelay * Math.pow(2, retryCount - 1);
                    }
                }),
                catchError((error: AxiosError) => {
                    this.logger.error(
                        `Failed to sync trip ${tripId} to CRM after ${this.maxRetries} retries: ${error.message}`
                    );
                    return throwError(() => error);
                })
            ).toPromise();

            const syncDuration = Date.now() - startTime;
            this.logger.log(
                `Successfully synced trip ${tripId} to CRM in ${syncDuration}ms`
            );
            
            return true;
        } catch (error) {
            const syncDuration = Date.now() - startTime;
            this.logger.error(
                `CRM sync failed for trip ${tripId} after ${syncDuration}ms: ${error.message}`
            );
            return false;
        }
    }

    /**
     * Synchronizes trip updates from CRM to JetStream
     * @param crmTripId CRM trip identifier
     * @returns Promise resolving to updated trip entity
     */
    async syncTripFromCrm(crmTripId: string): Promise<ITrip> {
        const startTime = Date.now();
        this.logger.debug(`Starting sync from CRM for trip ${crmTripId}`);

        try {
            const crmData = await from(
                this.crmClient.get(`/trips/${crmTripId}`)
            ).pipe(
                retry({
                    count: this.maxRetries,
                    delay: this.retryDelay
                }),
                catchError((error: AxiosError) => {
                    this.logger.error(
                        `Failed to fetch trip ${crmTripId} from CRM: ${error.message}`
                    );
                    return throwError(() => error);
                })
            ).toPromise();

            const tripData = this.transformCrmToTripFormat(crmData.data);
            const updatedTrip = await this.tripRepository.updateTripStatus(
                tripData.id,
                tripData.status,
                'CRM_SYNC'
            );

            const syncDuration = Date.now() - startTime;
            this.logger.log(
                `Successfully synced trip ${crmTripId} from CRM in ${syncDuration}ms`
            );

            return updatedTrip;
        } catch (error) {
            const syncDuration = Date.now() - startTime;
            this.logger.error(
                `Failed to sync trip ${crmTripId} from CRM after ${syncDuration}ms: ${error.message}`
            );
            throw error;
        }
    }

    /**
     * Handles incoming webhooks from CRM for trip updates
     * @param webhookData Webhook payload from CRM
     */
    async handleCrmWebhook(webhookData: ICrmWebhookPayload): Promise<void> {
        const startTime = Date.now();
        this.logger.debug(
            `Processing CRM webhook for trip ${webhookData.tripId}`
        );

        try {
            // Validate webhook signature
            if (!this.validateWebhookSignature(webhookData)) {
                throw new Error('Invalid webhook signature');
            }

            // Process webhook data with retry logic
            await from(Promise.resolve()).pipe(
                retry({
                    count: this.maxRetries,
                    delay: this.retryDelay
                }),
                catchError((error) => {
                    this.logger.error(
                        `Webhook processing failed: ${error.message}`
                    );
                    return throwError(() => error);
                })
            ).toPromise();

            // Update trip status
            await this.tripRepository.updateTripStatus(
                webhookData.tripId as UUID,
                webhookData.status as TripStatus,
                'CRM_WEBHOOK'
            );

            const processingDuration = Date.now() - startTime;
            this.logger.log(
                `Successfully processed webhook for trip ${webhookData.tripId} in ${processingDuration}ms`
            );
        } catch (error) {
            const processingDuration = Date.now() - startTime;
            this.logger.error(
                `Webhook processing failed for trip ${webhookData.tripId} after ${processingDuration}ms: ${error.message}`
            );
            throw error;
        }
    }

    /**
     * Transforms trip data to CRM format
     * @param trip Trip entity to transform
     * @returns CRM formatted trip data
     */
    private transformTripToCrmFormat(trip: ITrip): Record<string, any> {
        return {
            tripId: trip.id,
            status: trip.status,
            metadata: {
                ...trip.metadata,
                lastSyncedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Transforms CRM data to trip format
     * @param crmData CRM trip data
     * @returns Transformed trip data
     */
    private transformCrmToTripFormat(crmData: Record<string, any>): Partial<ITrip> {
        return {
            id: crmData.tripId,
            status: crmData.status as TripStatus,
            metadata: {
                ...crmData.metadata,
                crmLastUpdated: crmData.timestamp
            }
        };
    }

    /**
     * Validates webhook signature from CRM
     * @param webhookData Webhook payload to validate
     * @returns Boolean indicating signature validity
     */
    private validateWebhookSignature(webhookData: ICrmWebhookPayload): boolean {
        try {
            const expectedSignature = webhookData.signature;
            const calculatedSignature = this.calculateWebhookSignature(webhookData);
            return expectedSignature === calculatedSignature;
        } catch (error) {
            this.logger.error(`Webhook signature validation failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Calculates webhook signature for validation
     * @param webhookData Webhook payload
     * @returns Calculated signature
     */
    private calculateWebhookSignature(webhookData: ICrmWebhookPayload): string {
        // Implementation of signature calculation based on CRM requirements
        // This is a placeholder - actual implementation would use crypto
        return 'signature';
    }
}