import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import { Inventory2, Assignment, CallReceived, Warning } from '@mui/icons-material';
import DashboardSkeleton from '@/components/Table/DashboardSkeleton';
import useLoadingDemo from '@/hooks/useLoadingDemo';

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

const DashboardPage = () => {
  const isLoading = useLoadingDemo(1200);

  // TODO: Zamienić na dane z API
  const stats = {
    products: 1247,
    pendingTasks: 18,
    todayReceived: 5,
    blockedStock: 3,
  };

  if (isLoading) return <DashboardSkeleton />;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Produkty (SKU)"
            value={stats.products}
            icon={<Inventory2 fontSize="inherit" />}
            color="#1565C0"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Zadania do realizacji"
            value={stats.pendingTasks}
            icon={<Assignment fontSize="inherit" />}
            color="#FF8F00"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Przyjęcia dziś"
            value={stats.todayReceived}
            icon={<CallReceived fontSize="inherit" />}
            color="#2E7D32"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Zablokowany towar"
            value={stats.blockedStock}
            icon={<Warning fontSize="inherit" />}
            color="#D32F2F"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
