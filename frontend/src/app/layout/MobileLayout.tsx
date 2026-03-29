import { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from '@mui/material';
import {
  Menu,
  Close,
  Logout,
  DarkMode,
  LightMode,
  Dashboard,
  Inventory2,
  LocationOn,
  Warehouse,
  MenuBook,
  CallReceived,
  SwapHoriz,
  CallMade,
  MoveDown,
  PlaylistAddCheck,
  Assignment,
  BarChart,
  History,
  People,
  Settings,
  Home,
  ListAlt,
} from '@mui/icons-material';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { useThemeMode } from '@/context/ThemeContext';
import { usePermissions } from '@/hooks/usePermissions';
import useSessionTimeout from '@/hooks/useSessionTimeout';
import SessionWarning from '@/components/Notifications/SessionWarning';
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary';
import type { PermissionArea } from '@/constants/permissions';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  area?: PermissionArea;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <Dashboard /> },
  { label: 'Produkty', path: '/products', icon: <Inventory2 />, area: 'dictionaries' },
  { label: 'Lokalizacje', path: '/locations', icon: <LocationOn />, area: 'dictionaries' },
  { label: 'Stany magazynowe', path: '/stock', icon: <Warehouse />, area: 'movements' },
  { label: 'Rejestr ruchów', path: '/ledger', icon: <MenuBook />, area: 'movements' },
  { label: 'Przyjęcia (PZ)', path: '/documents/pz', icon: <CallReceived />, area: 'documents' },
  { label: 'Przesunięcia (MM)', path: '/documents/mm', icon: <SwapHoriz />, area: 'documents' },
  { label: 'Wydania (RW)', path: '/documents/rw', icon: <CallMade />, area: 'documents' },
  { label: 'Rozmieszczanie', path: '/putaway', icon: <MoveDown />, area: 'movements' },
  { label: 'Kompletacja', path: '/picking', icon: <PlaylistAddCheck />, area: 'movements' },
  { label: 'Inwentaryzacja', path: '/inventory', icon: <Assignment />, area: 'inventory' },
  { label: 'Zadania', path: '/tasks', icon: <Assignment />, area: 'tasks' },
  { label: 'Raporty', path: '/reports', icon: <BarChart />, area: 'reports' },
  { label: 'Dziennik zdarzeń', path: '/audit-log', icon: <History />, area: 'reports' },
  { label: 'Użytkownicy', path: '/users', icon: <People />, area: 'users' },
  { label: 'Ustawienia', path: '/settings', icon: <Settings />, adminOnly: true },
];

const parsePositiveInt = (value: unknown, fallback: number) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
};

type BottomNavValue = 'start' | 'tasks' | 'ops' | 'more' | -1;

const MobileLayout = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const { canRead, isAdmin } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();

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

  const handleNavigate = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const handleLogout = () => {
    setDrawerOpen(false);
    setShowWarning(false);
    logout();
    navigate('/login', { replace: true });
  };

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return isAdmin();
    if (item.area) return canRead(item.area);
    return true;
  });

  const bottomNavValue = (): BottomNavValue => {
    if (location.pathname === '/dashboard') return 'start';
    if (location.pathname === '/tasks') return 'tasks';
    if (location.pathname === '/picking' || location.pathname === '/putaway') return 'ops';
    return -1;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>
      {/* Top Bar */}
      <AppBar position="fixed" elevation={0} sx={{ bgcolor: '#1E293B', zIndex: 1300 }}>
        <Toolbar sx={{ minHeight: 56, px: 1 }}>
          <IconButton
            color="inherit"
            onClick={() => setDrawerOpen(true)}
            sx={{ minWidth: 48, minHeight: 48 }}
          >
            <Menu />
          </IconButton>

          <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1, ml: 0.5 }}>
            WMS
          </Typography>

          <IconButton color="inherit" onClick={toggleTheme} sx={{ minWidth: 48, minHeight: 48 }}>
            {mode === 'light' ? <DarkMode /> : <LightMode />}
          </IconButton>

          <IconButton color="inherit" onClick={handleLogout} sx={{ minWidth: 48, minHeight: 48 }}>
            <Logout />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Side Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: '85vw',
            maxWidth: 320,
            bgcolor: '#1E293B',
            color: '#E2E8F0',
          },
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: 2, minHeight: 56 }}>
          <Typography variant="h6" fontWeight={700} color="#FFFFFF">
            WMS System
          </Typography>
          <IconButton
            onClick={() => setDrawerOpen(false)}
            sx={{ color: '#94A3B8', minWidth: 48, minHeight: 48 }}
          >
            <Close />
          </IconButton>
        </Toolbar>

        <Divider sx={{ borderColor: '#334155' }} />

        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" color="#94A3B8">
            {user?.email}
          </Typography>
          <Typography variant="caption" color="#64748B">
            {user?.role}
          </Typography>
        </Box>

        <Divider sx={{ borderColor: '#334155' }} />

        <List sx={{ px: 1, overflowY: 'auto', flex: 1 }}>
          {visibleItems.map((item) => (
            <ListItemButton
              key={item.path}
              selected={location.pathname === item.path}
              onClick={() => handleNavigate(item.path)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                minHeight: 52,
                '&.Mui-selected': {
                  bgcolor: '#334155',
                  '&:hover': { bgcolor: '#3B4A5E' },
                },
                '&:hover': { bgcolor: '#2D3A4A' },
              }}
            >
              <ListItemIcon sx={{ color: '#94A3B8', minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontSize: 15, fontWeight: 500 }}
              />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: '56px',
          mb: '72px',
          px: 2,
          py: 2,
          bgcolor: 'background.default',
          overflowX: 'hidden',
          overflowY: 'auto',
          width: '100vw',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </Box>

      {/* Bottom Navigation – quick access */}
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1300,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
        elevation={8}
      >
        <BottomNavigation
          value={bottomNavValue()}
          onChange={(_, newValue: BottomNavValue) => {
            if (newValue === 'more') {
              setDrawerOpen(true);
              return;
            }

            const paths: Record<string, string> = {
              start: '/dashboard',
              tasks: '/tasks',
              ops: '/picking',
            };

            const target = paths[String(newValue)];
            if (target) navigate(target);
          }}
          sx={{
            height: 72,
            '& .MuiBottomNavigationAction-root': {
              minWidth: 0,
              py: 1,
              '& .MuiSvgIcon-root': { fontSize: 28 },
              '& .MuiBottomNavigationAction-label': { fontSize: '0.75rem', mt: 0.5 },
            },
          }}
        >
          <BottomNavigationAction value="start" label="Start" icon={<Home />} />
          <BottomNavigationAction value="tasks" label="Zadania" icon={<ListAlt />} />
          <BottomNavigationAction value="ops" label="Operacje" icon={<PlaylistAddCheck />} />
          <BottomNavigationAction value="more" label="Więcej" icon={<Menu />} />
        </BottomNavigation>
      </Paper>

      <SessionWarning
        open={showWarning}
        onExtend={() => {
          setShowWarning(false);
          extendSession();
        }}
        onLogout={handleLogout}
      />
    </Box>
  );
};

export default MobileLayout;
