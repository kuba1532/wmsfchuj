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
} from '@mui/material';
import { CheckCircle, MoveDown } from '@mui/icons-material';
import { useState } from 'react';

const MOCK_PUTAWAY = [
  {
    id: 1,
    product: 'Śruba M8x40',
    sku: 'SKU-001',
    quantity: 500,
    from: 'BUFOR-01',
    to: 'R1-A-01',
    status: 'pending',
  },
  {
    id: 2,
    product: 'Nakrętka M8',
    sku: 'SKU-002',
    quantity: 2000,
    from: 'BUFOR-01',
    to: 'R1-B-02',
    status: 'pending',
  },
  {
    id: 3,
    product: 'Pasek klinowy B-1250',
    sku: 'SKU-007',
    quantity: 210,
    from: 'BUFOR-01',
    to: 'R3-A-01',
    status: 'pending',
  },
];

const STEPS = ['Pobierz z bufora', 'Przenieś na lokalizację', 'Potwierdź rozmieszczenie'];

const PutawayPage = () => {
  const [activeItem, setActiveItem] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);

  const handleStart = (id: number) => {
    setActiveItem(id);
    setActiveStep(0);
  };

  const handleNextStep = () => {
    if (activeStep < STEPS.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      setCompleted([...completed, activeItem!]);
      setActiveItem(null);
      setActiveStep(0);
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Rozmieszczanie (Putaway)
      </Typography>

      {activeItem && (
        <Card sx={{ mb: 3, borderRadius: 2, border: '2px solid #1565C0' }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Aktywne rozmieszczanie
            </Typography>
            <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
              {STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            {(() => {
              const item = MOCK_PUTAWAY.find((p) => p.id === activeItem);
              return (
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      {item?.product} ({item?.sku})
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ilość: {item?.quantity} | {item?.from} → {item?.to}
                    </Typography>
                  </Box>
                  <Button variant="contained" onClick={handleNextStep}>
                    {activeStep < STEPS.length - 1 ? 'Następny krok' : 'Zakończ'}
                  </Button>
                </Box>
              );
            })()}
          </CardContent>
        </Card>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {MOCK_PUTAWAY.map((item) => (
          <Card
            key={item.id}
            sx={{
              borderRadius: 2,
              borderLeft: completed.includes(item.id) ? '4px solid #2E7D32' : '4px solid #FF8F00',
              opacity: completed.includes(item.id) ? 0.6 : 1,
            }}
          >
            <CardContent
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body1" fontWeight={600}>
                    {item.product}
                  </Typography>
                  <Chip label={item.sku} size="small" variant="outlined" />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Ilość: {item.quantity} | {item.from} → {item.to}
                </Typography>
              </Box>
              {completed.includes(item.id) ? (
                <Chip label="Rozmieszczono" color="success" icon={<CheckCircle />} />
              ) : (
                <Button
                  variant="contained"
                  startIcon={<MoveDown />}
                  disabled={activeItem !== null && activeItem !== item.id}
                  onClick={() => handleStart(item.id)}
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
