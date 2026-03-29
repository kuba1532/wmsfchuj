import { Box, Skeleton } from '@mui/material';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

const TableSkeleton = ({ rows = 6, columns = 4 }: TableSkeletonProps) => {
  return (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: 2,
          px: 2,
          py: 1.5,
          bgcolor: 'action.hover',
        }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" width="70%" height={24} />
        ))}
      </Box>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <Box
          key={rowIndex}
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: 2,
            px: 2,
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              variant="text"
              width={colIndex === 0 ? '50%' : '80%'}
              height={20}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
};

export default TableSkeleton;
