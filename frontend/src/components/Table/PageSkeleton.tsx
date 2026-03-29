import { Box, Skeleton } from '@mui/material';
import TableSkeleton from './TableSkeleton';

interface PageSkeletonProps {
  rows?: number;
  columns?: number;
  hasSearch?: boolean;
  hasButton?: boolean;
}

const PageSkeleton = ({
  rows = 6,
  columns = 4,
  hasSearch = true,
  hasButton = true,
}: PageSkeletonProps) => {
  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Skeleton variant="text" width={200} height={40} />
        {hasButton && (
          <Skeleton variant="rounded" width={160} height={40} sx={{ borderRadius: 2 }} />
        )}
      </Box>

      {/* Search */}
      {hasSearch && (
        <Skeleton variant="rounded" width={350} height={40} sx={{ mb: 2, borderRadius: 2 }} />
      )}

      {/* Table */}
      <TableSkeleton rows={rows} columns={columns} />
    </Box>
  );
};

export default PageSkeleton;
