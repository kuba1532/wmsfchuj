import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, Warehouse, Lock } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useAuth } from '@/context/AuthContext';
import { Role } from '@/constants/roles';
import { loginSchema, type LoginFormData } from '@/utils/validators';
import FormField from '@/components/Form/FormField';
import apiClient from '@/api/client';

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: '', password: '' },
    mode: 'onSubmit',
  });

  const onSubmit = async (data: LoginFormData) => {
    console.log('SUBMIT WORKS', data);
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await apiClient.post('/auth/login', {
        login: data.login,
        password: data.password,
      });

      const accessToken: string | undefined = res.data?.access_token;
      const refreshToken: string | undefined = res.data?.refresh_token;
      const user = res.data?.user;

      if (!accessToken || !user) {
        setErrorMsg('Błędna odpowiedź serwera przy logowaniu.');
        return;
      }

      // jeśli Twój AuthContext ma 2 argumenty -> (accessToken, user)
      // jeśli ma 3 argumenty -> (accessToken, refreshToken, user)
      try {
        // @ts-expect-error - wspieramy oba warianty
        login(accessToken, refreshToken, {
          id: String(user.id),
          login: String(user.login_code),
          email: String(user.email),
          role: user.role as Role,
        });
      } catch {
        // @ts-expect-error - wspieramy oba warianty
        login(accessToken, {
          id: String(user.id),
          login: String(user.login_code),
          email: String(user.email),
          role: user.role as Role,
        });
      }

      navigate('/dashboard', { replace: true });
    } catch (e: any) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail;

      if (status === 423) {
        setErrorMsg(detail || 'Konto jest czasowo zablokowane.');
      } else if (status === 401) {
        setErrorMsg(detail || 'Nieprawidłowy login lub hasło.');
      } else {
        setErrorMsg(detail || 'Wystąpił błąd podczas logowania.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Card sx={{ width: 'min(520px, 100%)', borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Warehouse />
            <Typography variant="h5" fontWeight={700}>
              WMS — Logowanie
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ mb: 3, opacity: 0.8 }}>
            Zaloguj się kodem 5-cyfrowym i hasłem.
          </Typography>

          {errorMsg && (
            <Alert icon={<Lock />} severity="error" sx={{ mb: 2 }}>
              {errorMsg}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'grid', gap: 2 }}>
            <FormField
              name="login"
              control={control}
              label="Kod logowania"
              placeholder="np. 00001"
              error={!!errors.login}
              helperText={errors.login?.message}
              InputProps={{ inputMode: 'numeric' }}
            />

            <FormField
              name="password"
              control={control}
              label="Hasło"
              type={showPassword ? 'text' : 'password'}
              error={!!errors.password}
              helperText={errors.password?.message}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((v) => !v)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button type="submit" variant="contained" size="large" disabled={loading}>
              {loading ? 'Logowanie...' : 'Zaloguj'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;
