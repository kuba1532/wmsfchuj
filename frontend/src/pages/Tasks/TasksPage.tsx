import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
} from '@mui/material';
import { PlayArrow, CheckCircle, Cancel, Add } from '@mui/icons-material';
import { useState } from 'react';
import { TaskStatus, TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@/constants/taskStatuses';
import { TASK_TYPE_LABELS } from '@/constants/taskTypes';
import { useNotification } from '@/context/NotificationContext';
import { usePermissions } from '@/hooks/usePermissions';
import useResponsive from '@/hooks/useResponsive';
import PageHeader from '@/components/Table/PageHeader';
import { useTasks } from '@/hooks/useTasks';
import MobileTaskCard from './MobileTaskCard';
import CreateTaskModal from './CreateTaskModal';

type FilterValue = 'active' | 'completed' | 'all';

const STATUS_FILTER_MAP: Record<FilterValue, string> = {
  active: '',
  completed: TaskStatus.COMPLETED,
  all: '',
};

const TasksPage = () => {
  const [filter, setFilter] = useState<FilterValue>('active');
  const [createOpen, setCreateOpen] = useState(false);
  const { showError } = useNotification();
  const { canCreateTask } = usePermissions();
  const { isMobile } = useResponsive();

  const { tasks, isLoading, refresh, startTask, completeTask, cancelTask } = useTasks({
    statusFilter: STATUS_FILTER_MAP[filter],
  });

  // Filtrowanie aktywnych po stronie klienta (brak dedykowanego filtra API dla "active")
  const filtered = tasks.filter((task) => {
    if (filter === 'active') {
      return task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.CANCELLED;
    }
    return true;
  });

  const handleStart = async (id: number) => {
    try {
      await startTask(id);
    } catch {
      showError('Nie udało się rozpocząć zadania.');
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await completeTask(id);
    } catch {
      showError('Nie udało się zakończyć zadania.');
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await cancelTask(id);
    } catch {
      showError('Nie udało się anulować zadania.');
    }
  };

  const handleCreateSuccess = () => {
    setCreateOpen(false);
    refresh();
  };

  return (
    <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
      <PageHeader
        title="Zadania"
        subtitle={`Widok: ${filter === 'active' ? 'aktywne' : filter === 'completed' ? 'zakończone' : 'wszystkie'}`}
        action={
          canCreateTask() ? (
            <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
              Utwórz zadanie
            </Button>
          ) : null
        }
      />

      <ToggleButtonGroup
        value={filter}
        exclusive
        onChange={(_, val: FilterValue | null) => val && setFilter(val)}
        size={isMobile ? 'large' : 'small'}
        sx={{
          mb: 2,
          width: isMobile ? '100%' : 'auto',
          '& .MuiToggleButton-root': {
            flex: isMobile ? 1 : 'none',
            minHeight: isMobile ? 48 : 'auto',
            fontWeight: 600,
          },
        }}
      >
        <ToggleButton value="active">Aktywne</ToggleButton>
        <ToggleButton value="completed">Zakończone</ToggleButton>
        <ToggleButton value="all">Wszystkie</ToggleButton>
      </ToggleButtonGroup>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary">Brak zadań do wyświetlenia.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtered.map((task) =>
            isMobile ? (
              <MobileTaskCard
                key={task.id}
                type={task.type}
                status={task.status as TaskStatus}
                product={
                  task.product?.name ??
                  (task.product_id ? `Produkt #${task.product_id}` : '—')
                }
                from={
                  task.from_location?.code ??
                  (task.from_location_id ? `Lok. #${task.from_location_id}` : '—')
                }
                to={
                  task.to_location?.code ??
                  (task.to_location_id ? `Lok. #${task.to_location_id}` : '—')
                }
                quantity={task.quantity}
                onStart={() => handleStart(task.id)}
                onComplete={() => handleComplete(task.id)}
              />
            ) : (
              <Card
                key={task.id}
                sx={{
                  borderRadius: 2,
                  borderLeft: `4px solid ${TASK_STATUS_COLORS[task.status as TaskStatus] ?? '#ccc'}`,
                }}
              >
                <CardContent
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                      <Chip
                        label={
                          TASK_TYPE_LABELS[task.type as keyof typeof TASK_TYPE_LABELS] ?? task.type
                        }
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      <Chip
                        label={TASK_STATUS_LABELS[task.status as TaskStatus] ?? task.status}
                        size="small"
                        sx={{
                          bgcolor: TASK_STATUS_COLORS[task.status as TaskStatus] ?? '#ccc',
                          color: 'white',
                        }}
                      />
                    </Box>
                    <Typography variant="body1" fontWeight={600}>
                      {task.product?.name ??
                        (task.product_id ? `Produkt #${task.product_id}` : '—')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {task.from_location?.code ??
                        (task.from_location_id ? `Lok. #${task.from_location_id}` : '—')}
                      {' → '}
                      {task.to_location?.code ??
                        (task.to_location_id ? `Lok. #${task.to_location_id}` : '—')}
                      {' | Ilość: '}
                      {task.quantity}
                      {task.assigned_to_name ? ` | Przypisane: ${task.assigned_to_name}` : ''}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {task.status === TaskStatus.ASSIGNED && (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<PlayArrow />}
                        onClick={() => handleStart(task.id)}
                      >
                        Rozpocznij
                      </Button>
                    )}
                    {task.status === TaskStatus.IN_PROGRESS && (
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<CheckCircle />}
                        onClick={() => handleComplete(task.id)}
                      >
                        Zakończ
                      </Button>
                    )}
                    {canCreateTask() &&
                      task.status !== TaskStatus.COMPLETED &&
                      task.status !== TaskStatus.CANCELLED && (
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<Cancel />}
                          onClick={() => handleCancel(task.id)}
                        >
                          Anuluj
                        </Button>
                      )}
                  </Box>
                </CardContent>
              </Card>
            ),
          )}
        </Box>
      )}

      <CreateTaskModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </Box>
  );
};

export default TasksPage;
