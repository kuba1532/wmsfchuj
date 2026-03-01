import { useState } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Tooltip } from '@mui/material';
import { Logout, DarkMode, LightMode } from '@mui/icons-material';
import { Outlet, useNavigate } from 'react-router';
import Sidebar, { DRAWER_WIDTH } from '@/components/Sidebar/Sidebar';
import SessionWarning from '@/components/Notifications/SessionWarning';
import { useAuth } from '@/context/AuthContext';
import { useThemeMode } from '@/context/ThemeContext';
import useSessionTimeout from '@/hooks/useSessionTimeout';

const parsePositiveInt = (value: unknown, fallback: number) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
};

const DesktopLayout = () => {
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);

  const timeoutMinutes = parsePositiveInt(import.meta.env.VITE_SESSION_TIMEOUT_MINUTES, 30);
  const warningMinutesRaw = parsePositiveInt(import.meta.env.VITE_SESSION_WARNING_MINUTES, 2);
  const warningMinutes = Math.min(warningMinutesRaw, Math.max(timeoutMinutes - 1, 1));

  const { extendSession } = useSessionTimeout({
    timeoutMinutes,
    warningMinutes,
    onWarning: () => setShowWarning(true),
    onTimeout: () => {
      setShowWarning(false);
      navigate('/login', { replace: true });
    },
  });

  const handleExtend = () => {
    setShowWarning(false);
    extendSession();
  };

  const handleLogout = () => {
    setShowWarning(false);
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            width: `calc(100% - ${DRAWER_WIDTH}px)`,
            ml: `${DRAWER_WIDTH}px`,
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Toolbar sx={{ justifyContent: 'flex-end', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {user?.email} ({user?.role})
            </Typography>
            <Tooltip title={mode === 'light' ? 'Tryb ciemny' : 'Tryb jasny'}>
              <IconButton onClick={toggleTheme} size="small">
                {mode === 'light' ? <DarkMode /> : <LightMode />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Wyloguj">
              <IconButton onClick={handleLogout} size="small">
                <Logout />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            mt: '64px',
            bgcolor: 'background.default',
          }}
        >
          <Outlet />
        </Box>
      </Box>

      <SessionWarning open={showWarning} onExtend={handleExtend} onLogout={handleLogout} />
    </Box>
  );
};

export default DesktopLayout;
