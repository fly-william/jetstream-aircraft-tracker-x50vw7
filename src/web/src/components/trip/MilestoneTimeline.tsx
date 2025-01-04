import React, { useMemo } from 'react';
import { Timeline, TimelineItem, TimelineSeparator, TimelineConnector, TimelineContent, TimelineDot } from '@mui/lab'; // @mui/lab v5.x
import { Typography, Box, IconButton, Tooltip, CircularProgress, Skeleton } from '@mui/material'; // @mui/material v5.x
import { format, formatInTimeZone } from 'date-fns-tz'; // date-fns-tz v2.x
import { TimelineContainer } from '../../styles/components/trip.styles';
import { Milestone, MilestoneType } from '../../types/trip.types';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import FlightLandIcon from '@mui/icons-material/FlightLand';
import GroupIcon from '@mui/icons-material/Group';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import UpdateIcon from '@mui/icons-material/Update';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';

// Enhanced interface for component props
interface MilestoneTimelineProps {
  milestones: Milestone[];
  onMilestoneClick?: (milestone: Milestone) => void;
  loading?: boolean;
  interactive?: boolean;
  timeZone?: string;
  showDetails?: boolean;
  filter?: (milestone: Milestone) => boolean;
}

// Function to get appropriate icon based on milestone type
const getMilestoneIcon = (type: MilestoneType, status: string): React.ReactNode => {
  const iconProps = {
    fontSize: 'small',
    color: status === 'completed' ? 'success' : status === 'pending' ? 'action' : 'primary'
  };

  switch (type) {
    case MilestoneType.DEPARTURE:
      return <FlightTakeoffIcon {...iconProps} />;
    case MilestoneType.ARRIVAL:
      return <FlightLandIcon {...iconProps} />;
    case MilestoneType.PASSENGER_ARRIVAL:
    case MilestoneType.BOARDING_START:
    case MilestoneType.BOARDING_COMPLETE:
      return <GroupIcon {...iconProps} />;
    case MilestoneType.SERVICE_REQUEST:
      return <LocalShippingIcon {...iconProps} />;
    case MilestoneType.STATUS_UPDATE:
      return <UpdateIcon {...iconProps} />;
    default:
      return <PendingIcon {...iconProps} />;
  }
};

// Function to format milestone time with timezone support
const formatMilestoneTime = (timestamp: Date, timeZone: string = 'UTC'): string => {
  try {
    return formatInTimeZone(timestamp, timeZone, 'HH:mm zzz');
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return format(timestamp, 'HH:mm');
  }
};

// Main timeline component
export const MilestoneTimeline: React.FC<MilestoneTimelineProps> = ({
  milestones,
  onMilestoneClick,
  loading = false,
  interactive = true,
  timeZone = 'UTC',
  showDetails = true,
  filter
}) => {
  // Filter and sort milestones
  const filteredMilestones = useMemo(() => {
    let filtered = [...milestones];
    if (filter) {
      filtered = filtered.filter(filter);
    }
    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [milestones, filter]);

  // Handle milestone click with error boundary
  const handleMilestoneClick = (milestone: Milestone, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!interactive || !onMilestoneClick) return;
    
    try {
      onMilestoneClick(milestone);
    } catch (error) {
      console.error('Error handling milestone click:', error);
    }
  };

  // Render milestone content with loading state
  const renderMilestoneContent = (milestone: Milestone, isLoading: boolean) => {
    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Skeleton variant="text" width={120} />
          <Skeleton variant="text" width={200} />
        </Box>
      );
    }

    const formattedTime = formatMilestoneTime(milestone.timestamp, timeZone);
    const status = milestone.details?.status || 'pending';

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          cursor: interactive ? 'pointer' : 'default'
        }}
        onClick={(e) => handleMilestoneClick(milestone, e)}
      >
        <Typography
          variant="caption"
          color="textSecondary"
          sx={{ fontWeight: 500 }}
        >
          {formattedTime}
        </Typography>
        <Typography variant="body2" color="textPrimary">
          {milestone.details?.description || milestone.type}
        </Typography>
        {showDetails && milestone.details?.notes && (
          <Typography
            variant="caption"
            color="textSecondary"
            sx={{ mt: 0.5 }}
          >
            {milestone.details.notes}
          </Typography>
        )}
      </Box>
    );
  };

  // Loading state for entire timeline
  if (loading && !milestones.length) {
    return (
      <TimelineContainer>
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress size={24} />
        </Box>
      </TimelineContainer>
    );
  }

  return (
    <TimelineContainer>
      <Timeline sx={{ p: { xs: 0, sm: 1, md: 2 } }}>
        {filteredMilestones.map((milestone, index) => (
          <TimelineItem
            key={milestone.id}
            sx={{
              '&:before': {
                flex: 0,
                padding: 0
              }
            }}
          >
            <TimelineSeparator>
              <Tooltip
                title={milestone.type}
                placement="left"
                arrow
              >
                <TimelineDot
                  sx={{
                    p: 1,
                    backgroundColor: milestone.details?.status === 'completed' ? 'success.main' : 'primary.main'
                  }}
                >
                  {getMilestoneIcon(milestone.type, milestone.details?.status)}
                </TimelineDot>
              </Tooltip>
              {index < filteredMilestones.length - 1 && (
                <TimelineConnector sx={{ minHeight: 30 }} />
              )}
            </TimelineSeparator>
            <TimelineContent sx={{ py: '12px', px: 2 }}>
              {renderMilestoneContent(milestone, loading)}
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    </TimelineContainer>
  );
};

export default MilestoneTimeline;