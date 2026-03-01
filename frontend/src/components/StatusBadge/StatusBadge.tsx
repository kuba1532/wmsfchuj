import { Chip } from '@mui/material';
import {
  DocumentStatus,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
} from '@/constants/documentStatuses';
import { TaskStatus, TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@/constants/taskStatuses';
import { StockStatus, STOCK_STATUS_LABELS, STOCK_STATUS_COLORS } from '@/constants/stockStatuses';

type StatusType = DocumentStatus | TaskStatus | StockStatus;

interface StatusBadgeProps {
  status: StatusType;
  size?: 'small' | 'medium';
}

const getLabel = (status: StatusType): string => {
  if (Object.values(DocumentStatus).includes(status as DocumentStatus)) {
    return DOCUMENT_STATUS_LABELS[status as DocumentStatus];
  }
  if (Object.values(TaskStatus).includes(status as TaskStatus)) {
    return TASK_STATUS_LABELS[status as TaskStatus];
  }
  if (Object.values(StockStatus).includes(status as StockStatus)) {
    return STOCK_STATUS_LABELS[status as StockStatus];
  }
  return status;
};

const getColor = (status: StatusType): string => {
  if (Object.values(DocumentStatus).includes(status as DocumentStatus)) {
    return DOCUMENT_STATUS_COLORS[status as DocumentStatus];
  }
  if (Object.values(TaskStatus).includes(status as TaskStatus)) {
    return TASK_STATUS_COLORS[status as TaskStatus];
  }
  if (Object.values(StockStatus).includes(status as StockStatus)) {
    return STOCK_STATUS_COLORS[status as StockStatus];
  }
  return '#757575';
};

const StatusBadge = ({ status, size = 'small' }: StatusBadgeProps) => {
  return (
    <Chip
      label={getLabel(status)}
      size={size}
      sx={{
        bgcolor: getColor(status),
        color: 'white',
        fontWeight: 600,
      }}
    />
  );
};

export default StatusBadge;
