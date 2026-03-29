import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Box,
} from '@mui/material';
import {
  Dashboard,
  People,
  Settings,
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
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router';
import { usePermissions } from '@/hooks/usePermissions';
import type { PermissionArea } from '@/constants/permissions';

const DRAWER_WIDTH = 260;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  area?: PermissionArea;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <Dashboard /> },

  // Słowniki
  { label: 'Produkty', path: '/products', icon: <Inventory2 />, area: 'dictionaries' },
  { label: 'Lokalizacje', path: '/locations', icon: <LocationOn />, area: 'dictionaries' },

  // Stany
  { label: 'Stany magazynowe', path: '/stock', icon: <Warehouse />, area: 'movements' },
  { label: 'Rejestr ruchów', path: '/ledger', icon: <MenuBook />, area: 'movements' },

  // Dokumenty
  { label: 'Przyjęcia (PZ)', path: '/documents/pz', icon: <CallReceived />, area: 'documents' },
  { label: 'Przesunięcia (MM)', path: '/documents/mm', icon: <SwapHoriz />, area: 'documents' },
  { label: 'Wydania (RW)', path: '/documents/rw', icon: <CallMade />, area: 'documents' },

  // Operacje
  { label: 'Rozmieszczanie', path: '/putaway', icon: <MoveDown />, area: 'movements' },
  { label: 'Kompletacja', path: '/picking', icon: <PlaylistAddCheck />, area: 'movements' },
  { label: 'Inwentaryzacja', path: '/inventory', icon: <Assignment />, area: 'inventory' },

  // Zadania
  { label: 'Zadania', path: '/tasks', icon: <Assignment />, area: 'tasks' },

  // Raporty
  { label: 'Raporty', path: '/reports', icon: <BarChart />, area: 'reports' },
  { label: 'Dziennik zdarzeń', path: '/audit-log', icon: <History />, area: 'reports' },

  // Admin
  { label: 'Użytkownicy', path: '/users', icon: <People />, area: 'users' },
  { label: 'Ustawienia', path: '/settings', icon: <Settings />, adminOnly: true },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { canRead, isAdmin } = usePermissions();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return isAdmin();
    if (item.area) return canRead(item.area);
    return true;
  });

  // Grupowanie: Dashboard, Słowniki, Stany, Dokumenty, Operacje, Zadania, Raporty, Admin
  const groups = [
    { items: visibleItems.filter((i) => i.path === '/dashboard') },
    { items: visibleItems.filter((i) => ['/products', '/locations'].includes(i.path)) },
    { items: visibleItems.filter((i) => ['/stock', '/ledger'].includes(i.path)) },
    {
      items: visibleItems.filter((i) =>
        ['/documents/pz', '/documents/mm', '/documents/rw'].includes(i.path),
      ),
    },
    {
      items: visibleItems.filter((i) => ['/putaway', '/picking', '/inventory'].includes(i.path)),
    },
    { items: visibleItems.filter((i) => i.path === '/tasks') },
    { items: visibleItems.filter((i) => ['/reports', '/audit-log'].includes(i.path)) },
    { items: visibleItems.filter((i) => ['/users', '/settings'].includes(i.path)) },
  ].filter((group) => group.items.length > 0);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          bgcolor: '#1E293B',
          color: '#E2E8F0',
        },
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 20,
          color: '#FFFFFF',
          letterSpacing: 1,
        }}
      >
        WMS System
      </Toolbar>
      <Divider sx={{ borderColor: '#334155' }} />
      <Box sx={{ overflow: 'auto' }}>
        {groups.map((group, groupIndex) => (
          <Box key={groupIndex}>
            <List disablePadding>
              {group.items.map((item) => (
                <ListItemButton
                  key={item.path}
                  selected={location.pathname === item.path}
                  onClick={() => navigate(item.path)}
                  sx={{
                    py: 1.2,
                    '&.Mui-selected': {
                      bgcolor: '#334155',
                      borderRight: '3px solid #3B82F6',
                      '&:hover': { bgcolor: '#3B4A5E' },
                    },
                    '&:hover': { bgcolor: '#2D3A4A' },
                  }}
                >
                  <ListItemIcon sx={{ color: '#94A3B8', minWidth: 40 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14 }} />
                </ListItemButton>
              ))}
            </List>
            {groupIndex < groups.length - 1 && <Divider sx={{ borderColor: '#334155', my: 0.5 }} />}
          </Box>
        ))}
      </Box>
    </Drawer>
  );
};

export { DRAWER_WIDTH };
export default Sidebar;
