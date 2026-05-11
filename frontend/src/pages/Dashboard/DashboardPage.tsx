import { useEffect, useState } from 'react';
import { Grid, Card, CardContent, Typography, Box, CircularProgress } from '@mui/material';
import { Inventory2, Assignment, CallReceived, Warning } from '@mui/icons-material';
import apiClient from '@/api/client';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

const StatCard = ({ title, value, icon, color }: StatCardProps) => (
  <Card sx={{ borderRadius: 2, borderLeft: `4px solid ${color}` }}>
    <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h4" fontWeight={700}>
          {value}
        </Typography>
      </Box>
      <Box sx={{ color, opacity: 0.7, fontSize: 48 }}>{icon}</Box>
    </CardContent>
  </Card>
);

interface DashboardStats {
  products: number;
  pendingTasks: number;
  todayDocuments: number;
  blockedStock: number;
}

const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const [productsRes, tasksRes, docsRes, stockRes] = await Promise.all([
          apiClient.get('/products?page=1&page_size=1'),
          apiClient.get('/tasks?page=1&page_size=1&status_filter=NEW'),
          apiClient.get('/documents?page=1&page_size=1'),
          apiClient.get('/stock?page=1&page_size=1&status_filter=BLOCKED'),
        ]);

        setStats({
          products: productsRes.data.total ?? 0,
          pendingTasks: tasksRes.data.total ?? 0,
          todayDocuments: docsRes.data.total ?? 0,
          blockedStock: stockRes.data.total ?? 0,
        });
      } catch {
        // Nie blokujemy dashboardu przy błędzie — pokazujemy 0
        setStats({ products: 0, pendingTasks: 0, todayDocuments: 0, blockedStock: 0 });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Pulpit
      </Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Produkty (SKU)"
            value={stats?.products ?? 0}
            icon={<Inventory2 fontSize="inherit" />}
            color="#1565C0"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Nowe zadania"
            value={stats?.pendingTasks ?? 0}
            icon={<Assignment fontSize="inherit" />}
            color="#FF8F00"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Dokumenty łącznie"
            value={stats?.todayDocuments ?? 0}
            icon={<CallReceived fontSize="inherit" />}
            color="#2E7D32"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Zablokowany towar"
            value={stats?.blockedStock ?? 0}
            icon={<Warning fontSize="inherit" />}
            color="#D32F2F"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
