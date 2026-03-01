import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { PlayArrow, CheckCircle, Add } from '@mui/icons-material';
import { useState } from 'react';
import { TaskStatus, TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@/constants/taskStatuses';
import { TASK_TYPE_LABELS } from '@/constants/taskTypes';
import { useNotification } from '@/context/NotificationContext';
import { usePermissions } from '@/hooks/usePermissions';
import useResponsive from '@/hooks/useResponsive';
import MobileTaskCard from './MobileTaskCard';
import CreateTaskModal from './CreateTaskModal';
import type { TaskFormData } from '@/utils/validators';

interface Task {
  id: number;
  type: string;
  status: TaskStatus;
  product: string;
  from: string;
  to: string;
  quantity: number;
  assignedTo: string;
}

const PRODUCT_MAP: Record<number, string> = {
  1: 'Śruba M8x40',
  2: 'Nakrętka M8',
  3: 'Olej hydrauliczny 5L',
  4: 'Filtr powietrza FP-200',
  5: 'Uszczelka gumowa 50mm',
};

const INITIAL_TASKS: Task[] = [
  {
    id: 1,
    type: 'PUTAWAY',
    status: TaskStatus.ASSIGNED,
    product: 'Śruba M8x40',
    from: 'BUFOR-01',
    to: 'R1-A-01',
    quantity: 500,
    assignedTo: 'Jan Kowalski',
  },
  {
    id: 2,
    type: 'PICKING',
    status: TaskStatus.IN_PROGRESS,
    product: 'Olej hydrauliczny 5L',
    from: 'R3-B-02',
    to: 'WYDANIE',
    quantity: 10,
    assignedTo: 'Jan Kowalski',
  },
  {
    id: 3,
    type: 'MOVE',
    status: TaskStatus.NEW,
    product: 'Filtr powietrza FP-200',
    from: 'R2-A-03',
    to: 'R4-C-01',
    quantity: 50,
    assignedTo: 'Jan Kowalski',
  },
  {
    id: 4,
    type: 'INVENTORY',
    status: TaskStatus.ASSIGNED,
    product: 'Lokalizacja R1-A-01',
    from: 'R1-A-01',
    to: '-',
    quantity: 0,
    assignedTo: 'Jan Kowalski',
  },
  {
    id: 5,
    type: 'PUTAWAY',
    status: TaskStatus.COMPLETED,
    product: 'Nakrętka M8',
    from: 'BUFOR-01',
    to: 'R1-B-02',
    quantity: 1000,
    assignedTo: 'Jan Kowalski',
  },
];

const TasksPage = () => {
  const [filter, setFilter] = useState<string>('active');
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [createOpen, setCreateOpen] = useState(false);
  const { showSuccess } = useNotification();
  const { canCreateTask } = usePermissions();
  const { isMobile } = useResponsive();

  const filtered = tasks.filter((task) => {
    if (filter === 'active')
      return task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.CANCELLED;
    if (filter === 'completed') return task.status === TaskStatus.COMPLETED;
    return true;
  });

  const handleStart = (id: number) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, status: TaskStatus.IN_PROGRESS } : t)));
    showSuccess('Zadanie rozpoczęte');
  };

  const handleComplete = (id: number) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, status: TaskStatus.COMPLETED } : t)));
    showSuccess('Zadanie zakończone');
  };

  const handleCreateTask = (data: TaskFormData) => {
    const newTask: Task = {
      id: Math.max(...tasks.map((t) => t.id)) + 1,
      type: data.type,
      status: TaskStatus.ASSIGNED,
      product: PRODUCT_MAP[data.productId] || 'Nieznany produkt',
      from: data.fromLocation,
      to: data.toLocation || '-',
      quantity: data.quantity,
      assignedTo: data.assignedTo,
    };
    setTasks([...tasks, newTask]);
    setCreateOpen(false);
    showSuccess(
      `Zadanie "${TASK_TYPE_LABELS[data.type as keyof typeof TASK_TYPE_LABELS]}" przypisane do ${data.assignedTo}.`,
    );
  };

  return (
    <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700} sx={{ fontSize: isMobile ? '1.3rem' : '1.4rem' }}>
          Zadania
        </Typography>
        {canCreateTask() && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
            Utwórz zadanie
          </Button>
        )}
      </Box>

      <ToggleButtonGroup
        value={filter}
        exclusive
        onChange={(_, val) => val && setFilter(val)}
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

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filtered.map((task) =>
          isMobile ? (
            <MobileTaskCard
              key={task.id}
              type={task.type}
              status={task.status}
              product={task.product}
              from={task.from}
              to={task.to}
              quantity={task.quantity}
              onStart={() => handleStart(task.id)}
              onComplete={() => handleComplete(task.id)}
            />
          ) : (
            <Card
              key={task.id}
              sx={{ borderRadius: 2, borderLeft: `4px solid ${TASK_STATUS_COLORS[task.status]}` }}
            >
              <CardContent
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                    <Chip
                      label={TASK_TYPE_LABELS[task.type as keyof typeof TASK_TYPE_LABELS]}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={TASK_STATUS_LABELS[task.status]}
                      size="small"
                      sx={{ bgcolor: TASK_STATUS_COLORS[task.status], color: 'white' }}
                    />
                  </Box>
                  <Typography variant="body1" fontWeight={600}>
                    {task.product}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {task.from} → {task.to} | Ilość: {task.quantity} | Przypisane: {task.assignedTo}
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
                </Box>
              </CardContent>
            </Card>
          ),
        )}
      </Box>

      <CreateTaskModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreateTask}
      />
    </Box>
  );
};

export default TasksPage;
