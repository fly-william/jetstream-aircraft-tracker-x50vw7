/**
 * @fileoverview TimescaleDB model for aircraft position data with time-based partitioning and validation
 * @version 1.0.0
 * @module services/aircraft-tracking/models/position
 */

import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm'; // v0.3.x
import { IsLatitude, IsLongitude, Min, Max } from 'class-validator'; // v0.14.x
import { TimeseriesEntity } from 'typeorm-timescale'; // v0.3.x
import { IPosition } from '../../../common/interfaces/position.interface';
import { UUID } from 'crypto';
import { createHash } from 'crypto';

/**
 * TimescaleDB entity for aircraft position tracking with optimized time-series storage
 * Implements 90-day retention policy with automated archival
 */
@TimeseriesEntity('positions', { 
    partitionBy: 'recorded',
    retentionDays: 90
})
@Index(['aircraftId', 'recorded'])
@Index(['recorded'])
@Index(['aircraftId', 'recorded'], { where: "recorded >= NOW() - INTERVAL '24 hours'" })
export class Position implements IPosition {
    @PrimaryGeneratedColumn('uuid')
    id: UUID;

    @Column('uuid')
    aircraftId: UUID;

    @Column('decimal', { precision: 10, scale: 6 })
    @IsLatitude()
    latitude: number;

    @Column('decimal', { precision: 10, scale: 6 })
    @IsLongitude()
    longitude: number;

    @Column('integer')
    @Min(-1000) // Support operations below sea level
    @Max(60000) // Maximum practical flight altitude
    altitude: number;

    @Column('integer')
    @Min(0)
    @Max(1000) // Maximum practical ground speed in knots
    groundSpeed: number;

    @Column('smallint')
    @Min(0)
    @Max(359)
    heading: number;

    @Column('timestamptz')
    recorded: Date;

    @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt: Date;

    @Column('varchar', { length: 50 })
    dataSource: string;

    @Column('char', { length: 64 })
    checksum: string;

    constructor(data?: Partial<IPosition>) {
        if (data) {
            this.aircraftId = data.aircraftId;
            this.latitude = data.latitude;
            this.longitude = data.longitude;
            this.altitude = data.altitude;
            this.groundSpeed = data.groundSpeed;
            this.heading = data.heading;
            this.recorded = data.recorded || new Date();
            this.createdAt = new Date();
            this.updatedAt = new Date();
            this.dataSource = 'ADS-B';
            
            // Generate checksum for data integrity
            const checksumData = `${this.aircraftId}${this.latitude}${this.longitude}${this.altitude}${this.groundSpeed}${this.heading}${this.recorded.toISOString()}`;
            this.checksum = createHash('sha256').update(checksumData).digest('hex');
        }
    }

    /**
     * Validates position data ranges and requirements
     * @throws {Error} If validation fails
     */
    validate(): void {
        if (this.latitude < -90 || this.latitude > 90) {
            throw new Error('Invalid latitude range');
        }
        if (this.longitude < -180 || this.longitude > 180) {
            throw new Error('Invalid longitude range');
        }
        if (this.heading < 0 || this.heading >= 360) {
            throw new Error('Invalid heading range');
        }
        if (this.altitude < -1000 || this.altitude > 60000) {
            throw new Error('Invalid altitude range');
        }
        if (this.groundSpeed < 0 || this.groundSpeed > 1000) {
            throw new Error('Invalid ground speed range');
        }
    }
}