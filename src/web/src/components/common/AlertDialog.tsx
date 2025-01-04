import React, { useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography
} from '@mui/material'; // @mui/material v5.x
import { styled, useTheme } from '@mui/material/styles'; // @mui/material/styles v5.x
import { Close, Warning, Error, Info } from '@mui/icons-material'; // @mui/icons-material v5.x
import LoadingSpinner from './LoadingSpinner';

// Constants
const DEFAULT_CLOSE_TEXT = 'Close';
const SEVERITY_ICONS = {
  info: Info,
  warning: Warning,
  error: Error
} as const;

const SEVERITY_COLORS = {
  info: 'primary',
  warning: 'warning',
  error: 'error'
} as const;

const TRANSITION_DURATION = 200;

// Styled components
const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    margin: theme.spacing(2),
    maxWidth: 500,
    borderRadius: theme.shape.borderRadius,
    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none'
    }
  },
  '& .MuiDialogTitle-root': {
    padding: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    color: theme.palette.text.primary,
    position: 'relative'
  },
  '& .MuiDialogContent-root': {
    padding: theme.spacing(3),
    color: theme.palette.text.secondary
  },
  '& .MuiDialogActions-root': {
    padding: theme.spacing(2),
    gap: theme.spacing(1)
  }
}));

const CloseButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  right: theme.spacing(1),
  top: theme.spacing(1),
  color: theme.palette.text.secondary,
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none'
  }
}));

// Props interface
interface AlertDialogProps {
  open: boolean;
  title: string;
  message: string | React.ReactNode;
  severity: keyof typeof SEVERITY_ICONS;
  onClose: () => void;
  loading?: boolean;
  closeButtonText?: string;
  disableBackdropClick?: boolean;
  autoFocus?: boolean;
}

// Main component
const AlertDialog: React.FC<AlertDialogProps> = React.memo(({
  open,
  title,
  message,
  severity = 'info',
  onClose,
  loading = false,
  closeButtonText = DEFAULT_CLOSE_TEXT,
  disableBackdropClick = false,
  autoFocus = true
}) => {
  const theme = useTheme();
  const titleId = useMemo(() => `alert-dialog-title-${Math.random().toString(36).substr(2, 9)}`, []);
  const descriptionId = useMemo(() => `alert-dialog-description-${Math.random().toString(36).substr(2, 9)}`, []);

  const IconComponent = SEVERITY_ICONS[severity];
  const iconColor = theme.palette[SEVERITY_COLORS[severity]].main;

  const handleBackdropClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (disableBackdropClick) {
      event.stopPropagation();
      return;
    }
    onClose();
  }, [disableBackdropClick, onClose]);

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      onClick={handleBackdropClick}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      transitionDuration={TRANSITION_DURATION}
      keepMounted={false}
      disableEscapeKeyDown={disableBackdropClick}
      aria-modal={true}
      role="alertdialog"
    >
      <DialogTitle id={titleId}>
        <IconComponent
          sx={{
            color: iconColor,
            fontSize: 24,
            flexShrink: 0
          }}
          aria-hidden="true"
        />
        <Typography variant="h6" component="span" sx={{ flex: 1 }}>
          {title}
        </Typography>
        <CloseButton
          onClick={onClose}
          aria-label={closeButtonText}
          size="large"
          edge="end"
        >
          <Close fontSize="small" />
        </CloseButton>
      </DialogTitle>

      <DialogContent id={descriptionId}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <LoadingSpinner size={32} color="primary" />
          </Box>
        ) : (
          typeof message === 'string' ? (
            <Typography variant="body1">{message}</Typography>
          ) : (
            message
          )
        )}
      </DialogContent>

      <DialogActions>
        <Button
          onClick={onClose}
          variant="contained"
          color={SEVERITY_COLORS[severity]}
          disabled={loading}
          autoFocus={autoFocus}
          sx={{
            minWidth: 100,
            '&:focus-visible': {
              outline: `2px solid ${theme.palette[SEVERITY_COLORS[severity]].main}`,
              outlineOffset: 2
            }
          }}
        >
          {closeButtonText}
        </Button>
      </DialogActions>
    </StyledDialog>
  );
});

AlertDialog.displayName = 'AlertDialog';

export default AlertDialog;