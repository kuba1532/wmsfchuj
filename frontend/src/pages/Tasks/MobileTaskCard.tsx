import { Card, CardContent, CardActions, Typography, Chip, Box } from '@mui/material';
import { PlayArrow, CheckCircle } from '@mui/icons-material';
import MobileActionButton from '@/components/MobileActionButton/MobileActionButton';
import { TaskStatus, TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@/constants/taskStatuses';
import { TASK_TYPE_LABELS } from '@/constants/taskTypes';

interface MobileTaskCardProps {
  taskId: number;
  type: string;
  status: TaskStatus;
  product: string;
  from: string;
  to: string;
  quantity: number;
  assignedTo?: string;
  onStart?: () => void;
  onComplete?: () => void;
}

const MobileTaskCard = ({
  taskId,
  type,
  status,
  product,
  from,
  to,
  quantity,
  assignedTo,
  onStart,
  onComplete,
}: MobileTaskCardProps) => {
  return (
    <Card
      sx={{
        borderRadius: 3,
        borderLeft: `5px solid ${TASK_STATUS_COLORS[status]}`,
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1, lineHeight: 1.3 }}>
          #{taskId} · {TASK_TYPE_LABELS[type as keyof typeof TASK_TYPE_LABELS] ?? type}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          <Chip
            label={TASK_STATUS_LABELS[status]}
            size="medium"
            sx={{
              bgcolor: TASK_STATUS_COLORS[status],
              color: 'white',
              fontWeight: 600,
              height: 32,
            }}
          />
        </Box>
        <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>
          {product}
        </Typography>
        {assignedTo ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Przypisane: {assignedTo}
          </Typography>
        ) : null}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1,
            bgcolor: 'action.hover',
            borderRadius: 2,
            p: 1.5,
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              Skąd
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {from}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Dokąd
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {to}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Ilość
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {quantity}
            </Typography>
          </Box>
        </Box>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
        {(status === TaskStatus.ASSIGNED || status === TaskStatus.NEW) && onStart && (
          <MobileActionButton
            label="Rozpocznij pracę"
            icon={<PlayArrow />}
            color="primary"
            onClick={onStart}
          />
        )}
        {status === TaskStatus.IN_PROGRESS && onComplete && (
          <MobileActionButton
            label="Potwierdź (kod miejsca)"
            icon={<CheckCircle />}
            color="success"
            onClick={onComplete}
          />
        )}
      </CardActions>
    </Card>
  );
};

export default MobileTaskCard;
