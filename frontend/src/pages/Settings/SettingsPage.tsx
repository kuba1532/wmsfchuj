import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Divider,
  Switch,
  FormControlLabel,
  Alert,
} from '@mui/material';
import { Save } from '@mui/icons-material';

const SettingsPage = () => {
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [maxLoginAttempts, setMaxLoginAttempts] = useState('5');
  const [lockoutDuration, setLockoutDuration] = useState('5');
  const [minPasswordLength, setMinPasswordLength] = useState('8');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Ustawienia systemu
      </Typography>

      {saved && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Ustawienia zostały zapisane.
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 600 }}>
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Bezpieczeństwo
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Czas wygasania sesji (minuty)"
                type="number"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                size="small"
                helperText="MF19 – automatyczne wylogowanie po okresie nieaktywności"
              />
              <TextField
                label="Maksymalna liczba prób logowania"
                type="number"
                value={maxLoginAttempts}
                onChange={(e) => setMaxLoginAttempts(e.target.value)}
                size="small"
                helperText="MF17 – po przekroczeniu konto zostaje zablokowane"
              />
              <TextField
                label="Czas blokady konta (minuty)"
                type="number"
                value={lockoutDuration}
                onChange={(e) => setLockoutDuration(e.target.value)}
                size="small"
                helperText="MF17 – czas automatycznej blokady po nieudanych próbach"
              />
              <TextField
                label="Minimalna długość hasła"
                type="number"
                value={minPasswordLength}
                onChange={(e) => setMinPasswordLength(e.target.value)}
                size="small"
                helperText="N01a – minimum 8 znaków, co najmniej 1 litera i 1 cyfra"
              />
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Powiadomienia
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                />
              }
              label="Wysyłaj powiadomienia email przy tworzeniu konta (MF15)"
            />
          </CardContent>
        </Card>

        <Divider />

        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSave}
          sx={{ alignSelf: 'flex-start' }}
        >
          Zapisz ustawienia
        </Button>
      </Box>
    </Box>
  );
};

export default SettingsPage;
