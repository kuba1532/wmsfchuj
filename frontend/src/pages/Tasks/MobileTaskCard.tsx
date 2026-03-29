import { Card, CardContent, CardActions, Typography, Chip, Box } from '@mui/material';
import { PlayArrow, CheckCircle } from '@mui/icons-material';
import MobileActionButton from '@/components/MobileActionButton/MobileActionButton';
import { TaskStatus, TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@/constants/taskStatuses';
import { TASK_TYPE_LABELS } from '@/constants/taskTypes';

interface MobileTaskCardProps {
  type: string;
  status: TaskStatus;
  product: string;
  from: string;
  to: string;
  quantity: number;
  onStart?: () => void;
  onComplete?: () => void;
}

const MobileTaskCard = ({
  type,
  status,
  product,
  from,
  to,
  quantity,
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
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          <Chip
            label={TASK_TYPE_LABELS[type as keyof typeof TASK_TYPE_LABELS]}
            size="medium"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 600, height: 32 }}
          />
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
        <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5, fontSize: '1.1rem' }}>
          {product}
        </Typography>
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
        {status === TaskStatus.ASSIGNED && onStart && (
          <MobileActionButton
            label="Rozpocznij"
            icon={<PlayArrow />}
            color="primary"
            onClick={onStart}
          />
        )}
        {status === TaskStatus.IN_PROGRESS && onComplete && (
          <MobileActionButton
            label="Zakończ zadanie"
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
