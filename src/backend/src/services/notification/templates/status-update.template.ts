/**
 * @fileoverview Teams adaptive card template generator for trip status updates
 * @version 1.0.0
 * 
 * Generates WCAG 2.1 compliant adaptive cards for Microsoft Teams notifications
 * with performance optimizations and caching support.
 */

// External imports
import { AdaptiveCard } from 'adaptivecards'; // version: 3.0.0
import NodeCache from 'node-cache'; // version: 5.1.2

// Internal imports
import { ITrip, TripStatus } from '../../../common/interfaces/trip.interface';

// Constants for template configuration
const STATUS_COLORS: Record<TripStatus, string> = {
    [TripStatus.SCHEDULED]: '#6B7280',    // WCAG AA compliant gray
    [TripStatus.IN_POSITION]: '#3B82F6',  // WCAG AA compliant blue
    [TripStatus.BOARDING]: '#10B981',     // WCAG AA compliant green
    [TripStatus.DEPARTED]: '#6366F1',     // WCAG AA compliant indigo
    [TripStatus.ENROUTE]: '#8B5CF6',      // WCAG AA compliant purple
    [TripStatus.ARRIVED]: '#059669'       // WCAG AA compliant emerald
};

const CARD_VERSION = '1.4';
const CACHE_TTL = 300; // 5 minutes cache TTL

// Initialize template cache
const templateCache = new NodeCache({
    stdTTL: CACHE_TTL,
    checkperiod: 60,
    useClones: false
});

/**
 * Formats date and time for accessible display in Teams card
 * @param date Date to format
 * @param timezone Target timezone
 * @returns Formatted date-time string with timezone
 */
const formatDateTime = (date: Date, timezone: string): string => {
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'full',
        timeStyle: 'long',
        timeZone: timezone
    }).format(date);
};

/**
 * Returns WCAG 2.1 compliant color for trip status
 * @param status Current trip status
 * @returns Accessible hex color code
 */
const getStatusColor = (status: TripStatus): string => {
    return STATUS_COLORS[status] || STATUS_COLORS[TripStatus.SCHEDULED];
};

/**
 * Generates an accessible Teams adaptive card for trip status updates
 * @param trip Trip data for the status update
 * @param updatedBy User who updated the status
 * @param useCache Whether to use template caching
 * @returns Teams adaptive card object
 */
export const generateStatusUpdateCard = (
    trip: ITrip,
    updatedBy: string,
    useCache = true
): AdaptiveCard => {
    // Check cache first if enabled
    const cacheKey = `status-template-${trip.id}-${trip.status}`;
    if (useCache) {
        const cached = templateCache.get<AdaptiveCard>(cacheKey);
        if (cached) return cached;
    }

    // Create new adaptive card
    const card = {
        type: 'AdaptiveCard',
        version: CARD_VERSION,
        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        body: [
            {
                type: 'Container',
                items: [
                    {
                        type: 'TextBlock',
                        size: 'Large',
                        weight: 'Bolder',
                        text: `Trip Status Update`,
                        color: getStatusColor(trip.status),
                        role: 'heading',
                        level: 1
                    },
                    {
                        type: 'TextBlock',
                        text: `Status: ${trip.status}`,
                        color: getStatusColor(trip.status),
                        weight: 'Bolder',
                        role: 'status',
                        spacing: 'Medium'
                    },
                    {
                        type: 'FactSet',
                        facts: [
                            {
                                title: 'Trip ID',
                                value: trip.id.toString()
                            },
                            {
                                title: 'Departure',
                                value: formatDateTime(trip.startTime, 'America/New_York')
                            },
                            {
                                title: 'Arrival',
                                value: formatDateTime(trip.endTime, 'America/New_York')
                            },
                            {
                                title: 'Updated By',
                                value: updatedBy
                            },
                            {
                                title: 'Updated At',
                                value: formatDateTime(new Date(), 'America/New_York')
                            }
                        ],
                        role: 'contentinfo'
                    }
                ],
                role: 'region',
                'aria-label': 'Trip Status Information'
            }
        ],
        actions: [
            {
                type: 'Action.OpenUrl',
                title: 'View Trip Details',
                url: `https://jetstream.flyusa.com/trips/${trip.id}`,
                role: 'link',
                'aria-label': 'Open trip details in JetStream'
            }
        ]
    };

    // Add service request updates if present
    if (trip.metadata?.serviceRequests) {
        const serviceUpdates = {
            type: 'Container',
            items: [
                {
                    type: 'TextBlock',
                    text: 'Service Updates',
                    weight: 'Bolder',
                    role: 'heading',
                    level: 2
                },
                ...trip.metadata.serviceRequests.map((service: any) => ({
                    type: 'TextBlock',
                    text: `${service.type}: ${service.status}`,
                    role: 'status'
                }))
            ],
            role: 'region',
            'aria-label': 'Service Request Updates'
        };
        card.body.push(serviceUpdates);
    }

    // Cache the template if caching is enabled
    if (useCache) {
        templateCache.set(cacheKey, card);
    }

    return card as AdaptiveCard;
};