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
import { CheckCircle, PlaylistAddCheck } from '@mui/icons-material';
import { useState } from 'react';

const MOCK_PICKING = [
  {
    id: 1,
    product: 'Olej hydrauliczny 5L',
    sku: 'SKU-003',
    quantity: 10,
    location: 'R3-B-02',
    document: 'RW/2025/005',
    status: 'pending',
  },
  {
    id: 2,
    product: 'Uszczelka gumowa 50mm',
    sku: 'SKU-005',
    quantity: 200,
    location: 'R2-C-01',
    document: 'RW/2025/005',
    status: 'pending',
  },
  {
    id: 3,
    product: 'Łożysko kulkowe 6205',
    sku: 'SKU-006',
    quantity: 50,
    location: 'R4-A-01',
    document: 'RW/2025/006',
    status: 'pending',
  },
];

const STEPS = ['Przejdź do lokalizacji', 'Pobierz towar', 'Potwierdź pobranie'];

const PickingPage = () => {
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
        Kompletacja (Picking)
      </Typography>

      {activeItem && (
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
            {(() => {
              const item = MOCK_PICKING.find((p) => p.id === activeItem);
              return (
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      {item?.product} ({item?.sku})
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ilość: {item?.quantity} | Lokalizacja: {item?.location} | Dok:{' '}
                      {item?.document}
                    </Typography>
                  </Box>
                  <Button variant="contained" color="error" onClick={handleNextStep}>
                    {activeStep < STEPS.length - 1 ? 'Następny krok' : 'Zakończ'}
                  </Button>
                </Box>
              );
            })()}
          </CardContent>
        </Card>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {MOCK_PICKING.map((item) => (
          <Card
            key={item.id}
            sx={{
              borderRadius: 2,
              borderLeft: completed.includes(item.id) ? '4px solid #2E7D32' : '4px solid #D32F2F',
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
                  <Chip label={item.document} size="small" color="primary" variant="outlined" />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Ilość: {item.quantity} | Lokalizacja: {item.location}
                </Typography>
              </Box>
              {completed.includes(item.id) ? (
                <Chip label="Skompletowano" color="success" icon={<CheckCircle />} />
              ) : (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<PlaylistAddCheck />}
                  disabled={activeItem !== null && activeItem !== item.id}
                  onClick={() => handleStart(item.id)}
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
