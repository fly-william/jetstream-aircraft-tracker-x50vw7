import React, { useState, useCallback } from 'react';
import {
  TextField,
  Select,
  MenuItem,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Box,
  CircularProgress,
  Alert
} from '@mui/material'; // version: 5.x
import { DateTimePicker } from '@mui/x-date-pickers'; // version: 5.x
import { useFormik } from 'formik'; // version: 2.x
import { object, string, date } from 'yup'; // version: 1.x

// Internal imports
import { ServiceRequest, ServiceRequestType } from '../../types/trip.types';
import { createServiceRequest } from '../../services/api/trip.api';
import { ServiceRequestSection } from '../../styles/components/trip.styles';

interface ServiceRequestFormProps {
  tripId: string;
  onRequestCreated: (request: ServiceRequest) => void;
  onCancel: () => void;
}

interface FormValues {
  type: ServiceRequestType;
  scheduledTime: Date;
  notes: string;
  vendorId: string;
}

const ServiceRequestForm: React.FC<ServiceRequestFormProps> = ({
  tripId,
  onRequestCreated,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation schema
  const validationSchema = object().shape({
    type: string().required('Service type is required'),
    scheduledTime: date()
      .required('Scheduled time is required')
      .min(new Date(), 'Scheduled time must be in the future'),
    notes: string()
      .required('Notes are required')
      .min(10, 'Notes must be at least 10 characters'),
    vendorId: string().required('Vendor selection is required')
  });

  // Initialize form with Formik
  const formik = useFormik<FormValues>({
    initialValues: {
      type: ServiceRequestType.CATERING,
      scheduledTime: new Date(Date.now() + 3600000), // Default to 1 hour from now
      notes: '',
      vendorId: ''
    },
    validationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async (values) => {
      try {
        setLoading(true);
        setError(null);

        const response = await createServiceRequest({
          tripId,
          ...values,
          status: 'PENDING',
          details: {},
          statusHistory: ['CREATED']
        });

        onRequestCreated(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create service request');
      } finally {
        setLoading(false);
      }
    }
  });

  const handleCancel = useCallback(() => {
    formik.resetForm();
    onCancel();
  }, [onCancel, formik]);

  return (
    <ServiceRequestSection>
      <form onSubmit={formik.handleSubmit}>
        <Grid container spacing={3}>
          {/* Service Type Selection */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={formik.touched.type && Boolean(formik.errors.type)}>
              <InputLabel id="service-type-label">Service Type</InputLabel>
              <Select
                labelId="service-type-label"
                id="type"
                name="type"
                value={formik.values.type}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                label="Service Type"
              >
                {Object.values(ServiceRequestType).map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.replace('_', ' ')}
                  </MenuItem>
                ))}
              </Select>
              {formik.touched.type && formik.errors.type && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {formik.errors.type}
                </Alert>
              )}
            </FormControl>
          </Grid>

          {/* Scheduled Time Picker */}
          <Grid item xs={12} sm={6}>
            <DateTimePicker
              label="Scheduled Time"
              value={formik.values.scheduledTime}
              onChange={(value) => formik.setFieldValue('scheduledTime', value)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: formik.touched.scheduledTime && Boolean(formik.errors.scheduledTime),
                  helperText: formik.touched.scheduledTime && formik.errors.scheduledTime
                }
              }}
            />
          </Grid>

          {/* Vendor Selection */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={formik.touched.vendorId && Boolean(formik.errors.vendorId)}>
              <InputLabel id="vendor-label">Vendor</InputLabel>
              <Select
                labelId="vendor-label"
                id="vendorId"
                name="vendorId"
                value={formik.values.vendorId}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                label="Vendor"
              >
                <MenuItem value="vendor1">Sky Catering</MenuItem>
                <MenuItem value="vendor2">Elite Cars</MenuItem>
                <MenuItem value="vendor3">Premium Cleaning</MenuItem>
              </Select>
              {formik.touched.vendorId && formik.errors.vendorId && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {formik.errors.vendorId}
                </Alert>
              )}
            </FormControl>
          </Grid>

          {/* Notes Field */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              id="notes"
              name="notes"
              label="Service Notes"
              multiline
              rows={4}
              value={formik.values.notes}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.notes && Boolean(formik.errors.notes)}
              helperText={formik.touched.notes && formik.errors.notes}
            />
          </Grid>

          {/* Error Display */}
          {error && (
            <Grid item xs={12}>
              <Alert severity="error">{error}</Alert>
            </Grid>
          )}

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading || !formik.isValid}
                startIcon={loading && <CircularProgress size={20} />}
              >
                {loading ? 'Creating...' : 'Create Service Request'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </ServiceRequestSection>
  );
};

export default ServiceRequestForm;