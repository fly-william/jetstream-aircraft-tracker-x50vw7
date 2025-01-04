/**
 * @fileoverview Repository class for handling trip milestone database operations
 * @version 1.0.0
 * 
 * Implements comprehensive milestone management with enhanced audit logging
 * and error handling capabilities.
 */

// External imports
import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Repository, EntityRepository, QueryFailedError } from 'typeorm';
import { UUID } from 'crypto';

// Internal imports
import { Milestone } from '../models/milestone.model';
import { IMilestone, MilestoneType } from '../../../common/interfaces/trip.interface';

/**
 * Repository class for managing trip milestone entities with comprehensive audit logging
 */
@Injectable()
@EntityRepository(Milestone)
export class MilestoneRepository extends Repository<Milestone> {
    private readonly logger = new Logger('MilestoneRepository');

    constructor() {
        super();
        this.logger.log('Initializing MilestoneRepository');
    }

    /**
     * Retrieves all milestones for a specific trip ordered by timestamp
     * @param tripId UUID of the trip
     * @returns Promise resolving to array of milestone entities
     * @throws Enhanced error with context on query failure
     */
    async findByTripId(tripId: UUID): Promise<Milestone[]> {
        this.logger.debug(`Retrieving milestones for trip: ${tripId}`);

        try {
            const milestones = await this.createQueryBuilder('milestone')
                .where('milestone.tripId = :tripId', { tripId })
                .andWhere('milestone.isDeleted = false')
                .orderBy('milestone.timestamp', 'DESC')
                .getMany();

            this.logger.debug(`Retrieved ${milestones.length} milestones for trip: ${tripId}`);
            return milestones;
        } catch (error) {
            this.logger.error(`Failed to retrieve milestones for trip ${tripId}: ${error.message}`);
            if (error instanceof QueryFailedError) {
                throw new Error(`Database error retrieving milestones: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Finds the most recent milestone of a specific type for a trip
     * @param tripId UUID of the trip
     * @param type Type of milestone to find
     * @returns Promise resolving to latest milestone or null if none found
     * @throws Enhanced error with context on query failure
     */
    async findLatestByType(tripId: UUID, type: MilestoneType): Promise<Milestone | null> {
        this.logger.debug(`Finding latest ${type} milestone for trip: ${tripId}`);

        try {
            const milestone = await this.createQueryBuilder('milestone')
                .where('milestone.tripId = :tripId', { tripId })
                .andWhere('milestone.type = :type', { type })
                .andWhere('milestone.isDeleted = false')
                .orderBy('milestone.timestamp', 'DESC')
                .limit(1)
                .getOne();

            this.logger.debug(
                milestone 
                    ? `Found latest ${type} milestone for trip ${tripId}`
                    : `No ${type} milestone found for trip ${tripId}`
            );
            return milestone;
        } catch (error) {
            this.logger.error(`Failed to find latest ${type} milestone for trip ${tripId}: ${error.message}`);
            if (error instanceof QueryFailedError) {
                throw new Error(`Database error finding latest milestone: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Creates a new milestone record with audit logging
     * @param milestoneData Data for creating new milestone
     * @returns Promise resolving to created milestone entity
     * @throws Enhanced error with context on creation failure
     */
    async createMilestone(milestoneData: IMilestone): Promise<Milestone> {
        this.logger.debug(`Creating new milestone for trip: ${milestoneData.tripId}`);

        try {
            const milestone = new Milestone(milestoneData);
            
            // Set audit fields
            milestone.timestamp = milestone.timestamp || new Date();
            milestone.createdAt = new Date();
            
            const savedMilestone = await this.save(milestone);
            
            this.logger.debug(`Created milestone ${savedMilestone.id} for trip ${savedMilestone.tripId}`);
            return savedMilestone;
        } catch (error) {
            this.logger.error(`Failed to create milestone: ${error.message}`, {
                tripId: milestoneData.tripId,
                type: milestoneData.type
            });
            if (error instanceof QueryFailedError) {
                throw new Error(`Database error creating milestone: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Updates an existing milestone record with audit trail
     * @param id UUID of milestone to update
     * @param updateData Partial milestone data to update
     * @returns Promise resolving to updated milestone entity
     * @throws Enhanced error with context on update failure
     */
    async updateMilestone(id: UUID, updateData: Partial<IMilestone>): Promise<Milestone> {
        this.logger.debug(`Updating milestone: ${id}`);

        try {
            const existingMilestone = await this.findOne({ where: { id } });
            if (!existingMilestone) {
                throw new Error(`Milestone ${id} not found`);
            }

            this.logger.debug(`Found existing milestone ${id}`, { 
                beforeUpdate: existingMilestone.toJSON() 
            });

            // Merge update data
            const updatedMilestone = Object.assign(existingMilestone, updateData);
            
            const savedMilestone = await this.save(updatedMilestone);
            
            this.logger.debug(`Updated milestone ${id}`, { 
                afterUpdate: savedMilestone.toJSON() 
            });
            
            return savedMilestone;
        } catch (error) {
            this.logger.error(`Failed to update milestone ${id}: ${error.message}`);
            if (error instanceof QueryFailedError) {
                throw new Error(`Database error updating milestone: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Performs soft deletion of a milestone with audit trail
     * @param id UUID of milestone to delete
     * @param userId UUID of user performing deletion
     * @returns Promise resolving to void
     * @throws Enhanced error with context on deletion failure
     */
    async softDeleteMilestone(id: UUID, userId: UUID): Promise<void> {
        this.logger.debug(`Soft deleting milestone: ${id} by user: ${userId}`);

        try {
            const milestone = await this.findOne({ where: { id } });
            if (!milestone) {
                throw new Error(`Milestone ${id} not found`);
            }

            milestone.softDelete(userId);
            await this.save(milestone);

            this.logger.debug(`Soft deleted milestone ${id}`);
        } catch (error) {
            this.logger.error(`Failed to soft delete milestone ${id}: ${error.message}`);
            if (error instanceof QueryFailedError) {
                throw new Error(`Database error soft deleting milestone: ${error.message}`);
            }
            throw error;
        }
    }
}