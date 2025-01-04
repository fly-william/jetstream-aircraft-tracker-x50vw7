/**
 * @fileoverview Enhanced secure login form component with OAuth2 Azure AD B2C integration
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  IconButton,
  InputAdornment,
  Box,
  FormControlLabel,
  Checkbox,
  LinearProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useForm, Controller } from 'react-hook-form'; // v7.x
import * as yup from 'yup'; // v1.x
import { Visibility, VisibilityOff } from '@mui/icons-material';

import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertDialog from '../common/AlertDialog';

// Enhanced validation schema with security requirements
const validationSchema = yup.object().shape({
  username: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email must not exceed 255 characters'),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
  rememberMe: yup.boolean()
});

// Aviation-themed styled components
const StyledCard = styled(Card)(({ theme }) => ({
  maxWidth: 400,
  margin: '0 auto',
  marginTop: theme.spacing(8),
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[3],
  borderRadius: theme.shape.borderRadius * 2,
  transition: 'box-shadow 0.3s ease-in-out',
  '&:hover': {
    boxShadow: theme.shadows[6]
  }
}));

const PasswordStrengthIndicator = styled(LinearProgress)(({ theme }) => ({
  marginTop: theme.spacing(1),
  height: 4,
  borderRadius: 2
}));

// Props interface
interface LoginFormProps {
  onSuccess?: () => void;
  rememberMe?: boolean;
}

// Form data interface
interface LoginFormData {
  username: string;
  password: string;
  rememberMe: boolean;
}

// Password strength calculation
const calculatePasswordStrength = (password: string): number => {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (/[A-Z]/.test(password)) strength += 25;
  if (/[a-z]/.test(password)) strength += 25;
  if (/[0-9@$!%*?&]/.test(password)) strength += 25;
  return strength;
};

const LoginForm: React.FC<LoginFormProps> = React.memo(({ onSuccess, rememberMe = false }) => {
  const { login, loading, error, resetError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showError, setShowError] = useState(false);

  const { control, handleSubmit, watch, formState: { errors } } = useForm<LoginFormData>({
    defaultValues: {
      username: '',
      password: '',
      rememberMe
    },
    mode: 'onChange'
  });

  // Watch password for strength indicator
  const password = watch('password');
  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(password || ''));
  }, [password]);

  const onSubmit = useCallback(async (data: LoginFormData) => {
    try {
      await login({
        username: data.username,
        password: data.password,
        deviceId: crypto.randomUUID()
      });
      onSuccess?.();
    } catch (err) {
      setShowError(true);
    }
  }, [login, onSuccess]);

  const handlePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const handleErrorClose = useCallback(() => {
    setShowError(false);
    resetError();
  }, [resetError]);

  return (
    <>
      <StyledCard>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom align="center">
            Welcome to JetStream
          </Typography>
          
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Box sx={{ mb: 3 }}>
              <Controller
                name="username"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Email"
                    type="email"
                    fullWidth
                    error={!!errors.username}
                    helperText={errors.username?.message}
                    disabled={loading}
                    autoComplete="username"
                    autoFocus
                    InputProps={{
                      'aria-describedby': 'username-error'
                    }}
                  />
                )}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Controller
                name="password"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    fullWidth
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    disabled={loading}
                    autoComplete="current-password"
                    InputProps={{
                      'aria-describedby': 'password-error',
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            onClick={handlePasswordVisibility}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                )}
              />
              <PasswordStrengthIndicator
                variant="determinate"
                value={passwordStrength}
                color={passwordStrength < 50 ? 'error' : passwordStrength < 75 ? 'warning' : 'success'}
                aria-label={`Password strength: ${passwordStrength}%`}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Controller
                name="rememberMe"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        {...field}
                        color="primary"
                        disabled={loading}
                      />
                    }
                    label="Remember me"
                  />
                )}
              />
            </Box>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ height: 48 }}
            >
              {loading ? <LoadingSpinner size={24} /> : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </StyledCard>

      <AlertDialog
        open={showError}
        title="Authentication Error"
        message={error || 'An error occurred during sign in. Please try again.'}
        severity="error"
        onClose={handleErrorClose}
        closeButtonText="Close"
      />
    </>
  );
});

LoginForm.displayName = 'LoginForm';

export default LoginForm;