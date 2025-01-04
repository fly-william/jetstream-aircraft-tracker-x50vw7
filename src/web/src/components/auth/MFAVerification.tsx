/**
 * @fileoverview Enhanced MFA verification component with Azure AD B2C integration
 * @version 1.0.0
 * 
 * Implements secure multi-factor authentication verification with comprehensive
 * security controls, accessibility features, and audit logging.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { AuditLogger } from '@azure/audit-logger';

import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertDialog from '../common/AlertDialog';

// Constants for MFA verification
const CODE_LENGTH = 6;
const CODE_PATTERN = '^[0-9]{6}$';
const MAX_ATTEMPTS = 3;
const ATTEMPT_TIMEOUT = 300000; // 5 minutes

// Configure security audit logger
const auditLogger = new AuditLogger({
  service: 'mfa-verification',
  version: '1.0.0'
});

// Styled components with accessibility enhancements
const VerificationContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(3),
  padding: theme.spacing(4),
  maxWidth: 400,
  margin: '0 auto',
  position: 'relative',
  '& > *': {
    width: '100%'
  }
}));

const CodeInput = styled(TextField)(({ theme }) => ({
  '& input': {
    textAlign: 'center',
    letterSpacing: '0.5em',
    fontSize: '1.5rem'
  },
  '& .MuiOutlinedInput-root': {
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
      borderWidth: 2
    }
  }
}));

// Component props interface
interface MFAVerificationProps {
  onSuccess: () => void;
  onCancel: () => void;
  sessionId: string;
}

// Error interface
interface VerificationError {
  code: string;
  message: string;
  retry: boolean;
}

/**
 * Enhanced MFA verification component with security features
 */
const MFAVerification: React.FC<MFAVerificationProps> = React.memo(({
  onSuccess,
  onCancel,
  sessionId
}) => {
  // State management
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<VerificationError | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null);

  const { verifyMFA } = useAuth();

  // Initialize device fingerprint on mount
  useEffect(() => {
    const initializeFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        setDeviceFingerprint(result.visitorId);
        
        auditLogger.info('Device fingerprint generated', {
          sessionId,
          fingerprintId: result.visitorId
        });
      } catch (error) {
        auditLogger.error('Failed to generate device fingerprint', {
          sessionId,
          error
        });
      }
    };

    initializeFingerprint();
  }, [sessionId]);

  // Handle code input changes
  const handleCodeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH);
    setVerificationCode(value);
    setError(null);
  }, []);

  // Handle verification submission
  const handleVerification = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();

    if (attempts >= MAX_ATTEMPTS) {
      setError({
        code: 'MAX_ATTEMPTS_EXCEEDED',
        message: 'Maximum verification attempts exceeded. Please try again later.',
        retry: false
      });
      return;
    }

    if (!verificationCode.match(CODE_PATTERN)) {
      setError({
        code: 'INVALID_CODE_FORMAT',
        message: 'Please enter a valid 6-digit verification code.',
        retry: true
      });
      return;
    }

    setLoading(true);

    try {
      auditLogger.info('MFA verification attempt', {
        sessionId,
        attemptNumber: attempts + 1,
        deviceFingerprint
      });

      const verified = await verifyMFA(verificationCode);

      if (verified) {
        auditLogger.info('MFA verification successful', {
          sessionId,
          deviceFingerprint
        });
        onSuccess();
      } else {
        throw new Error('Verification failed');
      }
    } catch (error) {
      setAttempts(prev => prev + 1);
      
      auditLogger.error('MFA verification failed', {
        sessionId,
        deviceFingerprint,
        error,
        remainingAttempts: MAX_ATTEMPTS - (attempts + 1)
      });

      setError({
        code: 'VERIFICATION_FAILED',
        message: `Verification failed. ${MAX_ATTEMPTS - (attempts + 1)} attempts remaining.`,
        retry: attempts + 1 < MAX_ATTEMPTS
      });
    } finally {
      setLoading(false);
    }
  }, [verificationCode, attempts, deviceFingerprint, sessionId, verifyMFA, onSuccess]);

  return (
    <VerificationContainer
      component="form"
      onSubmit={handleVerification}
      role="form"
      aria-labelledby="mfa-title"
    >
      <Typography
        id="mfa-title"
        variant="h5"
        component="h2"
        align="center"
        gutterBottom
      >
        Two-Factor Authentication
      </Typography>

      <Typography variant="body1" align="center" color="textSecondary">
        Please enter the verification code sent to your device
      </Typography>

      <CodeInput
        value={verificationCode}
        onChange={handleCodeChange}
        placeholder="000000"
        inputProps={{
          pattern: CODE_PATTERN,
          inputMode: 'numeric',
          'aria-label': 'Verification code',
          maxLength: CODE_LENGTH,
          autoComplete: 'one-time-code'
        }}
        disabled={loading}
        error={!!error}
        helperText={error?.message}
        autoFocus
      />

      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          disabled={loading}
          sx={{ flex: 1 }}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading || verificationCode.length !== CODE_LENGTH}
          sx={{ flex: 1 }}
        >
          {loading ? (
            <LoadingSpinner size={24} color="inherit" />
          ) : (
            'Verify'
          )}
        </Button>
      </Box>

      <AlertDialog
        open={!!error && !error.retry}
        title="Verification Error"
        message={error?.message || ''}
        severity="error"
        onClose={onCancel}
        disableBackdropClick
      />
    </VerificationContainer>
  );
});

MFAVerification.displayName = 'MFAVerification';

export default MFAVerification;