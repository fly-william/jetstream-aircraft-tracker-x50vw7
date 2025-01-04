import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography
} from '@mui/material'; // @mui/material v5.x
import { styled, useTheme } from '@mui/material/styles'; // @mui/material/styles v5.x
import { FocusTrap } from '@mui/base'; // @mui/base v5.x
import LoadingSpinner from './LoadingSpinner';

// Constants
const DEFAULT_CONFIRM_TEXT = 'Confirm';
const DEFAULT_CANCEL_TEXT = 'Cancel';
const DIALOG_TRANSITION_DURATION = 300;

// Props interface
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string | React.ReactNode;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  confirmButtonText?: string;
  cancelButtonText?: string;
  error?: string;
  critical?: boolean;
}

// Styled components
const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    margin: theme.spacing(2),
    maxWidth: 600,
    borderRadius: theme.shape.borderRadius,
    overflow: 'hidden'
  },
  '& .MuiDialogTitle-root': {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText
  },
  '& .MuiDialogContent-root': {
    padding: theme.spacing(3),
    minHeight: 100,
    position: 'relative'
  },
  '& .MuiDialogActions-root': {
    padding: theme.spacing(2),
    gap: theme.spacing(1),
    borderTop: `1px solid ${theme.palette.divider}`
  },
  '@media (max-width: 600px)': {
    '& .MuiDialog-paper': {
      margin: theme.spacing(1),
      width: 'calc(100% - 32px)'
    }
  },
  '& .error-message': {
    color: theme.palette.error.main,
    marginTop: theme.spacing(1)
  }
}));

// Memoized component
const ConfirmDialog: React.FC<ConfirmDialogProps> = React.memo(({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  loading = false,
  confirmButtonText = DEFAULT_CONFIRM_TEXT,
  cancelButtonText = DEFAULT_CANCEL_TEXT,
  error,
  critical = false
}) => {
  const theme = useTheme();
  const [internalError, setInternalError] = useState<string | undefined>(error);

  // Handle async confirmation
  const handleConfirm = useCallback(async () => {
    try {
      setInternalError(undefined);
      await onConfirm();
    } catch (err) {
      setInternalError(err instanceof Error ? err.message : 'An error occurred');
    }
  }, [onConfirm]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey && !loading) {
      handleConfirm();
    } else if (event.key === 'Escape' && !loading) {
      onCancel();
    }
  }, [handleConfirm, onCancel, loading]);

  return (
    <FocusTrap open={open}>
      <StyledDialog
        open={open}
        onClose={loading ? undefined : onCancel}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        onKeyDown={handleKeyDown}
        TransitionProps={{
          timeout: DIALOG_TRANSITION_DURATION
        }}
      >
        <DialogTitle id="confirm-dialog-title">
          <Typography variant="h6" component="span">
            {title}
          </Typography>
        </DialogTitle>
        
        <DialogContent>
          <Typography
            id="confirm-dialog-description"
            variant="body1"
            color="textPrimary"
            sx={{ mb: internalError ? 2 : 0 }}
          >
            {message}
          </Typography>
          
          {internalError && (
            <Typography
              className="error-message"
              variant="body2"
              role="alert"
            >
              {internalError}
            </Typography>
          )}
          
          {loading && (
            <LoadingSpinner
              size={24}
              color="primary"
              overlay
            />
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={onCancel}
            disabled={loading}
            color="inherit"
            variant="outlined"
            aria-label={cancelButtonText}
          >
            {cancelButtonText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            color={critical ? 'error' : 'primary'}
            variant="contained"
            aria-label={confirmButtonText}
            sx={{
              background: critical ? 
                theme.palette.error.main : 
                'linear-gradient(45deg, #0052CC 30%, #4C9AFF 90%)'
            }}
          >
            {confirmButtonText}
          </Button>
        </DialogActions>
      </StyledDialog>
    </FocusTrap>
  );
});

// Display name for debugging
ConfirmDialog.displayName = 'ConfirmDialog';

export default ConfirmDialog;