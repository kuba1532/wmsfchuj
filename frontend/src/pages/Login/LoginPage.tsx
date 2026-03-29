import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Login as LoginIcon } from '@mui/icons-material';
import { useAuth } from '@/context/AuthContext';
import { Role } from '@/constants/roles';
import apiClient from '@/api/client';

const LoginPage = () => {
  const [loginCode, setLoginCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!/^\d{5}$/.test(loginCode)) {
      setError('Login musi składać się z 5 cyfr.');
      return;
    }

    if (password.length < 1) {
      setError('Podaj hasło.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/login', {
        login: loginCode,
        password,
      });

      const { access_token: accessToken, refresh_token: refreshToken, user } = response.data;

      login(accessToken, refreshToken, {
        id: user.id,
        login: String(user.login_code),
        email: String(user.email),
        first_name: String(user.first_name ?? ''),
        last_name: String(user.last_name ?? ''),
        role: user.role as Role,
      });

      navigate('/dashboard');
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? 'Nieprawidłowy login lub hasło.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#F1F5F9',
      }}
    >
      <Card sx={{ width: 400, borderRadius: 3, boxShadow: 6 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h4" fontWeight={800} color="primary">
              WMS
            </Typography>
            <Typography variant="body2" color="text.secondary">
              System Zarządzania Magazynem
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <TextField
              label="Login (5-cyfrowy kod)"
              value={loginCode}
              onChange={(e) => setLoginCode(e.target.value)}
              placeholder="np. 00001"
              inputProps={{ maxLength: 5 }}
              size="small"
              fullWidth
              autoFocus
            />

            <TextField
              label="Hasło"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              size="small"
              fullWidth
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={18} /> : <LoginIcon />}
              sx={{ mt: 1, fontWeight: 600 }}
            >
              {isLoading ? 'Logowanie...' : 'Zaloguj się'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;
