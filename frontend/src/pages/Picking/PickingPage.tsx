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
import { CheckCircle, PlaylistAddCheck } from '@mui/icons-material';
import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useNotification } from '@/context/NotificationContext';

const STEPS = ['Przejdź do lokalizacji', 'Pobierz towar', 'Potwierdź pobranie'];

const PickingPage = () => {
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const { showError } = useNotification();

  const { tasks, isLoading, startTask, completeTask } = useTasks({});

  const pickingTasks = tasks.filter(
    (t) => t.type === 'PICKING' && t.status !== 'CANCELLED',
  );

  const handleStart = async (id: number) => {
    try {
      await startTask(id);
      setActiveTaskId(id);
      setActiveStep(0);
    } catch {
      showError('Nie udało się rozpocząć zadania.');
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
      } catch {
        showError('Nie udało się zakończyć zadania.');
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

  const activeTask = pickingTasks.find((t) => t.id === activeTaskId);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Kompletacja (Picking)
      </Typography>

      {pickingTasks.length === 0 && !activeTaskId && (
        <Typography color="text.secondary">Brak zadań kompletacji do realizacji.</Typography>
      )}

      {activeTaskId && activeTask && (
        <Card sx={{ mb: 3, borderRadius: 2, border: '2px solid #D32F2F' }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Aktywna kompletacja
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
                  Ilość: {activeTask.quantity} | Z:{' '}
                  {activeTask.from_location?.code ??
                    (activeTask.from_location_id ? `#${activeTask.from_location_id}` : '—')}
                  {' → Do: '}
                  {activeTask.to_location?.code ??
                    (activeTask.to_location_id ? `#${activeTask.to_location_id}` : '—')}
                </Typography>
              </Box>
              <Button variant="contained" color="error" onClick={handleNextStep}>
                {activeStep < STEPS.length - 1 ? 'Następny krok' : 'Zakończ'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {pickingTasks.map((task) => (
          <Card
            key={task.id}
            sx={{
              borderRadius: 2,
              borderLeft: task.status === 'COMPLETED' ? '4px solid #2E7D32' : '4px solid #D32F2F',
              opacity: task.status === 'COMPLETED' ? 0.6 : 1,
            }}
          >
            <CardContent
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
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
                <Chip label="Skompletowano" color="success" icon={<CheckCircle />} />
              ) : (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<PlaylistAddCheck />}
                  disabled={activeTaskId !== null && activeTaskId !== task.id}
                  onClick={() => handleStart(task.id)}
                >
                  Kompletuj
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default PickingPage;
