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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { PlayArrow, CheckCircle, Cancel, Add } from '@mui/icons-material';
import { useState } from 'react';
import { TaskStatus, TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@/constants/taskStatuses';
import { TASK_TYPE_LABELS } from '@/constants/taskTypes';
import { useNotification } from '@/context/NotificationContext';
import { usePermissions } from '@/hooks/usePermissions';
import useResponsive from '@/hooks/useResponsive';
import PageHeader from '@/components/Table/PageHeader';
import { useTasks, type TaskItem } from '@/hooks/useTasks';
import MobileTaskCard from './MobileTaskCard';
import CreateTaskModal from './CreateTaskModal';
import { getExpectedLocationCodeForComplete, locationCodesMatch } from '@/utils/taskCompleteConfirm';

type FilterValue = 'active' | 'completed' | 'all';

const STATUS_FILTER_MAP: Record<FilterValue, string> = {
  active: '',
  completed: TaskStatus.COMPLETED,
  all: '',
};

const TasksPage = () => {
  const [filter, setFilter] = useState<FilterValue>('active');
  const [createOpen, setCreateOpen] = useState(false);
  const [completeDialogTask, setCompleteDialogTask] = useState<TaskItem | null>(null);
  const [completeCodeInput, setCompleteCodeInput] = useState('');
  const [completeBypass, setCompleteBypass] = useState(false);
  const { showError } = useNotification();
  const { canCreateTask } = usePermissions();
  const { isMobile } = useResponsive();

  const { tasks, isLoading, refresh, startTask, completeTask, cancelTask } = useTasks({
    statusFilter: STATUS_FILTER_MAP[filter],
    omitTerminal: filter === 'active',
  });

  // Filtrowanie aktywnych po stronie klienta (brak dedykowanego filtra API dla "active")
  const filtered = tasks.filter((task) => {
    if (filter === 'active') {
      return task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.CANCELLED;
    }
    return true;
  });

  const completeLocMeta = completeDialogTask
    ? getExpectedLocationCodeForComplete(completeDialogTask)
    : null;

  const handleStart = async (id: number) => {
    try {
      await startTask(id);
    } catch (error) {
      const apiError = (error as { response?: { data?: unknown } })?.response?.data;
      showError(apiError ?? 'Nie udało się rozpocząć zadania.');
    }
  };

  const openCompleteDialog = (task: TaskItem) => {
    setCompleteCodeInput('');
    setCompleteBypass(false);
    setCompleteDialogTask(task);
  };

  const closeCompleteDialog = () => {
    setCompleteDialogTask(null);
    setCompleteCodeInput('');
    setCompleteBypass(false);
  };

  const submitCompleteDialog = async () => {
    if (!completeDialogTask) return;
    const { expected } = getExpectedLocationCodeForComplete(completeDialogTask);
    if (expected) {
      if (!locationCodesMatch(completeCodeInput, expected)) {
        showError(`Kod nie zgadza się z oczekiwanym „${expected}”.`);
        return;
      }
    } else if (!completeBypass) {
      showError('Zaznacz potwierdzenie lub wpisz kod, jeśli jest znany.');
      return;
    }
    try {
      await completeTask(completeDialogTask.id);
      closeCompleteDialog();
    } catch (error) {
      const apiError = (error as { response?: { data?: unknown } })?.response?.data;
      showError(apiError ?? 'Nie udało się zakończyć zadania.');
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await cancelTask(id);
    } catch (error) {
      const apiError = (error as { response?: { data?: unknown } })?.response?.data;
      showError(apiError ?? 'Nie udało się anulować zadania.');
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
        subtitle={`Widok: ${filter === 'active' ? 'aktywne' : filter === 'completed' ? 'zakończone' : 'wszystkie'}. „Rozpocznij” tylko oznacza pracę; „Zakończ” wymaga wpisania kodu lokalizacji (jak skan w aplikacji mobilnej).`}
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
                taskId={task.id}
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
                assignedTo={
                  task.assigned_to_name ??
                  (task.assigned_to_id ? `Użytkownik #${task.assigned_to_id}` : undefined)
                }
                onStart={() => handleStart(task.id)}
                onComplete={() => openCompleteDialog(task)}
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
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.75, lineHeight: 1.3 }}>
                      #{task.id} ·{' '}
                      {TASK_TYPE_LABELS[task.type as keyof typeof TASK_TYPE_LABELS] ?? task.type}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
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
                      {task.assigned_to_name
                        ? ` | Przypisane: ${task.assigned_to_name}`
                        : task.assigned_to_id
                          ? ` | Przypisane: Użytkownik #${task.assigned_to_id}`
                          : ' | Giełda: nieprzypisane'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {(task.status === TaskStatus.ASSIGNED || task.status === TaskStatus.NEW) && (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<PlayArrow />}
                        onClick={() => handleStart(task.id)}
                      >
                        Rozpocznij pracę
                      </Button>
                    )}
                    {task.status === TaskStatus.IN_PROGRESS && (
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<CheckCircle />}
                        onClick={() => openCompleteDialog(task)}
                      >
                        Zakończ (kod miejsca)
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

      <Dialog open={completeDialogTask !== null} onClose={closeCompleteDialog} fullWidth maxWidth="sm">
        <DialogTitle>Potwierdź lokalizację przed zakończeniem</DialogTitle>
        <DialogContent>
          {completeDialogTask && completeLocMeta ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {completeLocMeta.hint}
              </Typography>
              {completeLocMeta.expected ? (
                <>
                  <Typography variant="body2">
                    Oczekiwany kod: <strong>{completeLocMeta.expected}</strong>
                  </Typography>
                  <TextField
                    label="Kod lokalizacji"
                    value={completeCodeInput}
                    onChange={(e) => setCompleteCodeInput(e.target.value)}
                    autoFocus
                    fullWidth
                    margin="dense"
                  />
                </>
              ) : (
                <>
                  <Typography variant="body2" color="warning.main">
                    W odpowiedzi API brak kodu lokalizacji — możesz zakończyć tylko po jawnej zgodzie (np. gdy kody
                    nie są załadowane).
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={completeBypass}
                        onChange={(e) => setCompleteBypass(e.target.checked)}
                      />
                    }
                    label="Rozumiem — kończę bez weryfikacji kodu"
                  />
                </>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCompleteDialog}>Anuluj</Button>
          <Button variant="contained" onClick={() => void submitCompleteDialog()}>
            Zakończ zadanie
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TasksPage;
