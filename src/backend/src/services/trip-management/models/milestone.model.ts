/**
 * @fileoverview Milestone model for trip management service with enhanced audit logging
 * @version 1.0.0
 * 
 * Implements the database entity model for trip milestones with comprehensive
 * audit logging capabilities using TypeORM.
 */

// External imports - TypeORM v0.3.x
import { 
    Entity, 
    Column, 
    PrimaryGeneratedColumn, 
    ManyToOne, 
    JoinColumn, 
    Index,
    CreateDateColumn,
    UpdateDateColumn
} from 'typeorm';

// Internal imports
import { 
    IMilestone, 
    MilestoneType 
} from '../../../common/interfaces/trip.interface';

/**
 * TypeORM entity representing a trip milestone with enhanced audit capabilities
 */
@Entity('milestones')
@Index(['tripId', 'timestamp'])
@Index(['userId', 'timestamp'])
@Index(['type', 'isDeleted'])
export class Milestone implements IMilestone {
    @PrimaryGeneratedColumn('uuid')
    id: UUID;

    @Column('uuid')
    @Index()
    tripId: UUID;

    @Column({
        type: 'enum',
        enum: MilestoneType,
        nullable: false
    })
    type: MilestoneType;

    @Column('timestamp with time zone')
    timestamp: Date;

    @Column('jsonb', { default: {} })
    details: Record<string, unknown>;

    @Column('uuid')
    userId: UUID;

    @Column('varchar')
    userRole: string;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    createdAt: Date;

    @Column('boolean', { default: false })
    isDeleted: boolean;

    @Column('timestamp with time zone', { nullable: true })
    deletedAt?: Date;

    @Column('uuid', { nullable: true })
    deletedBy?: UUID;

    /**
     * Creates a new Milestone instance with audit logging support
     * @param milestoneData Partial milestone data for initialization
     */
    constructor(milestoneData?: Partial<IMilestone>) {
        if (milestoneData) {
            Object.assign(this, milestoneData);
        }
        
        // Set default values for required fields
        this.timestamp = this.timestamp || new Date();
        this.details = this.details || {};
        this.isDeleted = false;

        // Validate milestone type
        if (this.type && !Object.values(MilestoneType).includes(this.type)) {
            throw new Error(`Invalid milestone type: ${this.type}`);
        }
    }

    /**
     * Converts milestone entity to JSON representation with audit data
     * @returns Complete milestone data including audit information
     */
    toJSON(): IMilestone & { isDeleted: boolean; deletedAt?: Date; deletedBy?: UUID } {
        return {
            id: this.id,
            tripId: this.tripId,
            type: this.type,
            timestamp: this.timestamp,
            details: this.details,
            userId: this.userId,
            userRole: this.userRole,
            createdAt: this.createdAt,
            isDeleted: this.isDeleted,
            deletedAt: this.deletedAt,
            deletedBy: this.deletedBy
        };
    }

    /**
     * Performs soft deletion of the milestone for audit purposes
     * @param userId UUID of the user performing the deletion
     */
    softDelete(userId: UUID): void {
        this.isDeleted = true;
        this.deletedAt = new Date();
        this.deletedBy = userId;
    }

    /**
     * Updates milestone details with audit tracking
     * @param details New milestone details
     * @param userId UUID of the user performing the update
     */
    updateDetails(details: Record<string, unknown>, userId: UUID): void {
        this.details = {
            ...this.details,
            ...details,
            _lastUpdated: new Date(),
            _lastUpdatedBy: userId
        };
    }
}