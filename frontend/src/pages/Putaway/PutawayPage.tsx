import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
} from '@mui/material';
import { CheckCircle, MoveDown } from '@mui/icons-material';
import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useNotification } from '@/context/NotificationContext';

const STEPS = ['Pobierz z bufora', 'Przenieś na lokalizację', 'Potwierdź rozmieszczenie'];

const PutawayPage = () => {
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const { showError } = useNotification();

  const { tasks, isLoading, startTask, completeTask } = useTasks({ omitTerminal: true });

  const putawayTasks = tasks.filter(
    (t) => t.type === 'PUTAWAY' && t.status !== 'CANCELLED',
  );

  const handleStart = async (id: number) => {
    try {
      await startTask(id);
      setActiveTaskId(id);
      setActiveStep(0);
    } catch (error) {
      const apiError = (error as { response?: { data?: unknown } })?.response?.data;
      showError(apiError ?? 'Nie udało się rozpocząć zadania.');
    }
  };

  const handleNextStep = async () => {
    if (activeStep < STEPS.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      try {
        await completeTask(activeTaskId!);
        setActiveTaskId(null);
        setActiveStep(0);
      } catch (error) {
        const apiError = (error as { response?: { data?: unknown } })?.response?.data;
        showError(apiError ?? 'Nie udało się zakończyć zadania.');
      }
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const activeTask = putawayTasks.find((t) => t.id === activeTaskId);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Odłożenie po przyjęciu
      </Typography>

      {putawayTasks.length === 0 && !activeTaskId && (
        <Typography color="text.secondary">Brak zadań rozmieszczania do realizacji.</Typography>
      )}

      {activeTaskId && activeTask && (
        <Card sx={{ mb: 3, borderRadius: 2, border: '2px solid #1565C0' }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Aktywne rozmieszczanie #{activeTask.id}
            </Typography>
            <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
              {STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body1" fontWeight={600}>
                  {activeTask.product?.name ?? `Produkt #${activeTask.product_id}`} (
                  {activeTask.product?.sku ?? ''})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ilość: {activeTask.quantity} |{' '}
                  {activeTask.from_location?.code ??
                    (activeTask.from_location_id ? `#${activeTask.from_location_id}` : '—')}
                  {' → '}
                  {activeTask.to_location?.code ??
                    (activeTask.to_location_id ? `#${activeTask.to_location_id}` : '—')}
                </Typography>
              </Box>
              <Button variant="contained" onClick={handleNextStep}>
                {activeStep < STEPS.length - 1 ? 'Następny krok' : 'Zakończ'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {putawayTasks.map((task) => (
          <Card
            key={task.id}
            sx={{
              borderRadius: 2,
              borderLeft: task.status === 'COMPLETED' ? '4px solid #2E7D32' : '4px solid #FF8F00',
              opacity: task.status === 'COMPLETED' ? 0.6 : 1,
            }}
          >
            <CardContent
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    #{task.id}
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {task.product?.name ?? `Produkt #${task.product_id}`}
                  </Typography>
                  <Chip label={task.product?.sku ?? ''} size="small" variant="outlined" />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Ilość: {task.quantity} |{' '}
                  {task.from_location?.code ??
                    (task.from_location_id ? `#${task.from_location_id}` : '—')}
                  {' → '}
                  {task.to_location?.code ??
                    (task.to_location_id ? `#${task.to_location_id}` : '—')}
                </Typography>
              </Box>
              {task.status === 'COMPLETED' ? (
                <Chip label="Rozmieszczono" color="success" icon={<CheckCircle />} />
              ) : (
                <Button
                  variant="contained"
                  startIcon={<MoveDown />}
                  disabled={activeTaskId !== null && activeTaskId !== task.id}
                  onClick={() => handleStart(task.id)}
                >
                  Rozpocznij
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default PutawayPage;
