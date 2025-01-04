/**
 * @fileoverview Trip management constants and enumerations
 * @version 1.0.0
 * @package @mui/material v5.x
 */

import { colors } from '@mui/material';

/**
 * Enumeration of all possible trip status values
 * Represents the sequential stages of a trip's lifecycle
 */
export enum TripStatus {
  SCHEDULED = 'SCHEDULED',
  IN_POSITION = 'IN_POSITION',
  BOARDING = 'BOARDING',
  DEPARTED = 'DEPARTED',
  ENROUTE = 'ENROUTE',
  ARRIVED = 'ARRIVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

/**
 * Enumeration of all possible trip milestone types
 * Represents specific events and updates that occur during a trip
 */
export enum MilestoneType {
  AIRCRAFT_POSITION = 'AIRCRAFT_POSITION',
  CREW_READY = 'CREW_READY',
  PASSENGER_ARRIVAL = 'PASSENGER_ARRIVAL',
  BOARDING_START = 'BOARDING_START',
  BOARDING_COMPLETE = 'BOARDING_COMPLETE',
  DEPARTURE = 'DEPARTURE',
  ARRIVAL = 'ARRIVAL',
  SERVICE_REQUEST = 'SERVICE_REQUEST',
  STATUS_UPDATE = 'STATUS_UPDATE'
}

/**
 * Human-readable labels for trip status values
 */
export const TRIP_STATUS_LABELS: Readonly<Record<TripStatus, string>> = {
  [TripStatus.SCHEDULED]: 'Scheduled',
  [TripStatus.IN_POSITION]: 'In Position',
  [TripStatus.BOARDING]: 'Boarding',
  [TripStatus.DEPARTED]: 'Departed',
  [TripStatus.ENROUTE]: 'En Route',
  [TripStatus.ARRIVED]: 'Arrived',
  [TripStatus.COMPLETED]: 'Completed',
  [TripStatus.CANCELLED]: 'Cancelled'
} as const;

/**
 * Material-UI color mappings for trip status values
 * Implements visual hierarchy requirements with clear color coding
 */
export const TRIP_STATUS_COLORS: Readonly<Record<TripStatus, string>> = {
  [TripStatus.SCHEDULED]: colors.blue[700],
  [TripStatus.IN_POSITION]: colors.blue[500],
  [TripStatus.BOARDING]: colors.orange[500],
  [TripStatus.DEPARTED]: colors.green[500],
  [TripStatus.ENROUTE]: colors.cyan[500],
  [TripStatus.ARRIVED]: colors.lightGreen[500],
  [TripStatus.COMPLETED]: colors.green[500],
  [TripStatus.CANCELLED]: colors.red[500]
} as const;

/**
 * Human-readable labels for milestone types
 */
export const MILESTONE_TYPE_LABELS: Readonly<Record<MilestoneType, string>> = {
  [MilestoneType.AIRCRAFT_POSITION]: 'Aircraft Position',
  [MilestoneType.CREW_READY]: 'Crew Ready',
  [MilestoneType.PASSENGER_ARRIVAL]: 'Passenger Arrival',
  [MilestoneType.BOARDING_START]: 'Boarding Started',
  [MilestoneType.BOARDING_COMPLETE]: 'Boarding Completed',
  [MilestoneType.DEPARTURE]: 'Departure',
  [MilestoneType.ARRIVAL]: 'Arrival',
  [MilestoneType.SERVICE_REQUEST]: 'Service Request',
  [MilestoneType.STATUS_UPDATE]: 'Status Update'
} as const;

/**
 * Material icon names for milestone types
 * Used for visual representation in timeline and status displays
 */
export const MILESTONE_ICONS: Readonly<Record<MilestoneType, string>> = {
  [MilestoneType.AIRCRAFT_POSITION]: 'flight',
  [MilestoneType.CREW_READY]: 'people',
  [MilestoneType.PASSENGER_ARRIVAL]: 'person',
  [MilestoneType.BOARDING_START]: 'login',
  [MilestoneType.BOARDING_COMPLETE]: 'check_circle',
  [MilestoneType.DEPARTURE]: 'flight_takeoff',
  [MilestoneType.ARRIVAL]: 'flight_land',
  [MilestoneType.SERVICE_REQUEST]: 'room_service',
  [MilestoneType.STATUS_UPDATE]: 'update'
} as const;

/**
 * Ordered array of trip status values representing the normal progression
 * Used for sorting and determining status transitions
 */
export const TRIP_STATUS_ORDER: readonly TripStatus[] = [
  TripStatus.SCHEDULED,
  TripStatus.IN_POSITION,
  TripStatus.BOARDING,
  TripStatus.DEPARTED,
  TripStatus.ENROUTE,
  TripStatus.ARRIVED,
  TripStatus.COMPLETED,
  TripStatus.CANCELLED
] as const;

/**
 * Standard date format for timeline displays
 * Format: "Jan 1, 2024 13:45"
 */
export const TIMELINE_DATE_FORMAT = 'MMM d, yyyy HH:mm' as const;