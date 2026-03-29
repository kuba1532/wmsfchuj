import { Box, Card, CardContent, Skeleton, Grid } from '@mui/material';

const DashboardSkeleton = () => {
  return (
    <Box>
      <Skeleton variant="text" width={180} height={40} sx={{ mb: 3 }} />
      <Grid container spacing={3}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
            <Card sx={{ borderRadius: 2, borderLeft: '4px solid', borderColor: 'divider' }}>
              <CardContent
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Box>
                  <Skeleton variant="text" width={100} height={20} />
                  <Skeleton variant="text" width={60} height={44} />
                </Box>
                <Skeleton variant="circular" width={48} height={48} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default DashboardSkeleton;
