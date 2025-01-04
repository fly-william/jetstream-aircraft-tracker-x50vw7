/**
 * @fileoverview Teams adaptive card template generator for trip milestone updates
 * @version 1.0.0
 * 
 * Generates optimized Microsoft Teams adaptive cards for trip-related notifications
 * with rich formatting and interactive elements while maintaining sub-5-second latency.
 */

// External imports
import { AdaptiveCard } from 'adaptivecards'; // version: 3.0.0

// Internal imports
import { 
    ITrip, 
    IMilestone, 
    MilestoneType 
} from '../../../common/interfaces/trip.interface';

/**
 * Color mapping for different milestone types with WCAG 2.1 compliant contrast ratios
 */
const MILESTONE_COLORS = {
    [MilestoneType.STATUS_UPDATE]: '#6366F1',    // Indigo
    [MilestoneType.SERVICE_UPDATE]: '#10B981',   // Emerald
    [MilestoneType.CREW_UPDATE]: '#3B82F6',      // Blue
    [MilestoneType.PASSENGER_UPDATE]: '#8B5CF6',  // Purple
    [MilestoneType.POSITION_UPDATE]: '#059669',   // Green
    [MilestoneType.SCHEDULE_UPDATE]: '#6B7280'    // Gray
} as const;

/**
 * Teams adaptive card version
 */
const CARD_VERSION = '1.4';

/**
 * Generates an optimized Teams adaptive card for trip milestone updates
 * 
 * @param trip - Trip object containing current status and metadata
 * @param milestone - Milestone object with update details
 * @param updatedBy - Name of the user who created the update
 * @returns Formatted Teams adaptive card object
 */
export function generateTripUpdateCard(
    trip: ITrip,
    milestone: IMilestone,
    updatedBy: string
): AdaptiveCard {
    const card = {
        type: 'AdaptiveCard',
        version: CARD_VERSION,
        body: [
            // Header section with trip info
            {
                type: 'Container',
                style: 'emphasis',
                items: [
                    {
                        type: 'ColumnSet',
                        columns: [
                            {
                                type: 'Column',
                                width: 'stretch',
                                items: [
                                    {
                                        type: 'TextBlock',
                                        text: `Trip Update: ${trip.id}`,
                                        weight: 'bolder',
                                        size: 'large'
                                    },
                                    {
                                        type: 'TextBlock',
                                        text: `Current Status: ${trip.status}`,
                                        isSubtle: true
                                    }
                                ]
                            },
                            {
                                type: 'Column',
                                width: 'auto',
                                items: [
                                    {
                                        type: 'TextBlock',
                                        text: formatTimestamp(milestone.timestamp),
                                        horizontalAlignment: 'right',
                                        isSubtle: true
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            // Milestone details section
            {
                type: 'Container',
                spacing: 'medium',
                style: 'default',
                items: [
                    {
                        type: 'ColumnSet',
                        columns: [
                            {
                                type: 'Column',
                                width: 'auto',
                                items: [
                                    {
                                        type: 'TextBlock',
                                        text: getMilestoneIcon(milestone.type),
                                        size: 'large',
                                        color: getMilestoneColor(milestone.type)
                                    }
                                ]
                            },
                            {
                                type: 'Column',
                                width: 'stretch',
                                items: [
                                    {
                                        type: 'TextBlock',
                                        text: formatMilestoneDetails(milestone),
                                        wrap: true
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            // Footer with metadata
            {
                type: 'Container',
                spacing: 'small',
                items: [
                    {
                        type: 'TextBlock',
                        text: `Updated by: ${updatedBy}`,
                        size: 'small',
                        isSubtle: true
                    }
                ]
            }
        ],
        // Interactive actions based on milestone type
        actions: generateCardActions(milestone)
    };

    return new AdaptiveCard(card);
}

/**
 * Returns appropriate color code for milestone type
 */
function getMilestoneColor(type: MilestoneType): string {
    return MILESTONE_COLORS[type] || MILESTONE_COLORS[MilestoneType.STATUS_UPDATE];
}

/**
 * Returns appropriate icon for milestone type
 */
function getMilestoneIcon(type: MilestoneType): string {
    const icons = {
        [MilestoneType.STATUS_UPDATE]: '🔄',
        [MilestoneType.SERVICE_UPDATE]: '🛠️',
        [MilestoneType.CREW_UPDATE]: '👥',
        [MilestoneType.PASSENGER_UPDATE]: '👤',
        [MilestoneType.POSITION_UPDATE]: '📍',
        [MilestoneType.SCHEDULE_UPDATE]: '📅'
    };
    return icons[type] || '📝';
}

/**
 * Formats milestone details into human-readable content
 */
function formatMilestoneDetails(milestone: IMilestone): string {
    const { type, details } = milestone;
    
    switch (type) {
        case MilestoneType.STATUS_UPDATE:
            return `Status updated to: ${details.newStatus}`;
        case MilestoneType.SERVICE_UPDATE:
            return `Service ${details.service}: ${details.status}`;
        case MilestoneType.CREW_UPDATE:
            return `Crew update: ${details.message}`;
        case MilestoneType.PASSENGER_UPDATE:
            return `Passenger update: ${details.message}`;
        case MilestoneType.POSITION_UPDATE:
            return `Position: ${details.location}`;
        case MilestoneType.SCHEDULE_UPDATE:
            return `Schedule update: ${details.message}`;
        default:
            return 'Update received';
    }
}

/**
 * Formats timestamp with timezone consideration
 */
function formatTimestamp(timestamp: Date): string {
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'UTC'
    }).format(timestamp);
}

/**
 * Generates appropriate interactive actions based on milestone type
 */
function generateCardActions(milestone: IMilestone): any[] {
    const baseActions = [
        {
            type: 'Action.OpenUrl',
            title: 'View Details',
            url: `https://jetstream.flyusa.com/trips/${milestone.tripId}`
        }
    ];

    if (milestone.type === MilestoneType.SERVICE_UPDATE) {
        baseActions.push({
            type: 'Action.Submit',
            title: 'Acknowledge',
            data: {
                actionType: 'acknowledge',
                milestoneId: milestone.id
            }
        });
    }

    return baseActions;
}