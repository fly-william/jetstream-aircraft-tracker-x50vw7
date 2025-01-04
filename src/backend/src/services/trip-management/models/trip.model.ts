/**
 * @fileoverview Trip model for trip management service with enhanced audit capabilities
 * @version 1.0.0
 * 
 * Implements the database entity model for trips with comprehensive audit logging,
 * metadata validation, and optimized relationships with milestones.
 */

// External imports - TypeORM v0.3.x
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
    Index
} from 'typeorm';

// Internal imports
import {
    ITrip,
    TripStatus
} from '../../../common/interfaces/trip.interface';
import { Milestone } from './milestone.model';

/**
 * TypeORM entity representing a flight trip with enhanced audit capabilities
 */
@Entity('trips')
@Index(['aircraftId'])
@Index(['status'])
@Index(['startTime', 'endTime'])
export class Trip implements ITrip {
    @PrimaryGeneratedColumn('uuid')
    id: UUID;

    @Column('uuid')
    @Index()
    aircraftId: UUID;

    @Column('timestamp with time zone')
    startTime: Date;

    @Column('timestamp with time zone')
    endTime: Date;

    @Column({
        type: 'enum',
        enum: TripStatus,
        default: TripStatus.SCHEDULED
    })
    status: TripStatus;

    @Column('jsonb', { default: {} })
    metadata: Record<string, unknown>;

    @OneToMany(() => Milestone, milestone => milestone.tripId, {
        cascade: ['insert', 'update'],
        eager: false
    })
    milestones: Promise<Milestone[]>;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    updatedAt: Date;

    @Column('uuid', { nullable: true })
    lastUpdatedBy: UUID;

    @Column('boolean', { default: true })
    isActive: boolean;

    /**
     * Creates a new Trip instance with enhanced validation
     * @param tripData Partial trip data for initialization
     */
    constructor(tripData?: Partial<ITrip>) {
        if (tripData) {
            Object.assign(this, tripData);
        }

        // Validate and set default values
        this.status = this.status || TripStatus.SCHEDULED;
        this.metadata = this.metadata || {};
        this.isActive = true;

        // Validate date ranges
        if (this.startTime && this.endTime && this.startTime >= this.endTime) {
            throw new Error('Trip end time must be after start time');
        }

        // Validate required fields
        if (!this.aircraftId) {
            throw new Error('Aircraft ID is required');
        }
    }

    /**
     * Converts trip entity to JSON representation with audit data
     * @returns Complete trip data including audit information
     */
    toJSON(): ITrip & { isActive: boolean } {
        return {
            id: this.id,
            aircraftId: this.aircraftId,
            startTime: this.startTime,
            endTime: this.endTime,
            status: this.status,
            metadata: this.metadata,
            milestones: this.milestones,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            lastUpdatedBy: this.lastUpdatedBy,
            isActive: this.isActive
        };
    }

    /**
     * Adds a new milestone to the trip with enhanced validation
     * @param milestoneData Partial milestone data
     * @returns Created milestone instance
     */
    async addMilestone(milestoneData: Partial<IMilestone>): Promise<Milestone> {
        // Validate milestone timestamp is within trip timeframe
        if (milestoneData.timestamp) {
            if (milestoneData.timestamp < this.startTime || milestoneData.timestamp > this.endTime) {
                throw new Error('Milestone timestamp must be within trip timeframe');
            }
        }

        const milestone = new Milestone({
            ...milestoneData,
            tripId: this.id
        });

        // Update trip audit information
        this.updatedAt = new Date();
        this.lastUpdatedBy = milestoneData.userId;

        return milestone;
    }

    /**
     * Performs soft deletion of the trip for audit purposes
     * @param userId UUID of the user performing the deletion
     */
    async softDelete(userId: UUID): Promise<void> {
        this.isActive = false;
        this.lastUpdatedBy = userId;
        this.updatedAt = new Date();
    }

    /**
     * Updates trip metadata with schema validation
     * @param metadata New metadata object
     * @param userId UUID of the user performing the update
     */
    updateMetadata(metadata: Record<string, unknown>, userId: UUID): void {
        // Validate metadata schema
        if (typeof metadata !== 'object' || metadata === null) {
            throw new Error('Invalid metadata format');
        }

        this.metadata = {
            ...this.metadata,
            ...metadata,
            _lastUpdated: new Date(),
            _lastUpdatedBy: userId
        };

        this.lastUpdatedBy = userId;
        this.updatedAt = new Date();
    }

    /**
     * Updates trip status with audit logging
     * @param status New trip status
     * @param userId UUID of the user performing the update
     */
    updateStatus(status: TripStatus, userId: UUID): void {
        // Validate status transition
        if (!Object.values(TripStatus).includes(status)) {
            throw new Error(`Invalid trip status: ${status}`);
        }

        const previousStatus = this.status;
        this.status = status;
        this.lastUpdatedBy = userId;
        this.updatedAt = new Date();

        // Add status change to metadata
        this.metadata = {
            ...this.metadata,
            statusHistory: [
                ...(this.metadata.statusHistory || []),
                {
                    from: previousStatus,
                    to: status,
                    timestamp: new Date(),
                    userId
                }
            ]
        };
    }
}