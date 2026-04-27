import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Alert, Box, Button, Card, CardContent, CircularProgress, TextField, Typography } from '@mui/material';
import apiClient from '@/api/client';
import { setPasswordFromLinkSchema, type SetPasswordFromLinkFormData } from '@/utils/validators';

const SetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const token = searchParams.get('token') ?? '';

  const form = useForm<SetPasswordFromLinkFormData>({
    resolver: zodResolver(setPasswordFromLinkSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (data: SetPasswordFromLinkFormData) => {
    setServerError('');
    if (!token) {
      setServerError('Brak tokenu aktywacyjnego w linku.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/set-password', { token, new_password: data.newPassword });
      navigate('/login');
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setServerError(detail ?? 'Nie udało się ustawić hasła.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F1F5F9' }}>
      <Card sx={{ width: 430, borderRadius: 3, boxShadow: 6 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
            Ustaw hasło konta
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Po zapisaniu hasła wrócisz do ekranu logowania.
          </Typography>

          {(serverError || !token) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {serverError || 'Nieprawidłowy link aktywacyjny.'}
            </Alert>
          )}

          <Box component="form" onSubmit={form.handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nowe hasło"
              type="password"
              error={!!form.formState.errors.newPassword}
              helperText={form.formState.errors.newPassword?.message}
              {...form.register('newPassword')}
            />
            <TextField
              label="Potwierdź nowe hasło"
              type="password"
              error={!!form.formState.errors.confirmPassword}
              helperText={form.formState.errors.confirmPassword?.message}
              {...form.register('confirmPassword')}
            />
            <Button type="submit" variant="contained" disabled={isSubmitting || !token} startIcon={isSubmitting ? <CircularProgress size={18} /> : undefined}>
              {isSubmitting ? 'Zapisywanie...' : 'Ustaw hasło'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SetPasswordPage;
