import { Box, Card, CardContent, Skeleton } from '@mui/material';

interface CardsSkeletonProps {
  count?: number;
}

const CardsSkeleton = ({ count = 4 }: CardsSkeletonProps) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} sx={{ borderRadius: 2, borderLeft: '4px solid', borderColor: 'divider' }}>
          <CardContent
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Skeleton variant="rounded" width={100} height={24} sx={{ borderRadius: 4 }} />
                <Skeleton variant="rounded" width={80} height={24} sx={{ borderRadius: 4 }} />
              </Box>
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="40%" height={20} />
            </Box>
            <Skeleton variant="rounded" width={120} height={36} sx={{ borderRadius: 2 }} />
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default CardsSkeleton;
