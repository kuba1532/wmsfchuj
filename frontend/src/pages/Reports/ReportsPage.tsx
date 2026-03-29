import { Box, Typography, Card, CardContent, Button, Grid, Alert } from '@mui/material';
import { BarChart, Download, Inventory2, SwapHoriz, Assignment } from '@mui/icons-material';
import { useNotification } from '@/context/NotificationContext';
import { utils, writeFile } from 'xlsx';

const MOCK_STOCK_DATA = [
  {
    SKU: 'SKU-001',
    Produkt: 'Śruba M8x40',
    Lokalizacja: 'R1-A-01',
    Ilość: 500,
    Status: 'Dostępny',
  },
  {
    SKU: 'SKU-001',
    Produkt: 'Śruba M8x40',
    Lokalizacja: 'R1-A-02',
    Ilość: 2000,
    Status: 'Dostępny',
  },
  {
    SKU: 'SKU-002',
    Produkt: 'Nakrętka M8',
    Lokalizacja: 'R1-B-02',
    Ilość: 4800,
    Status: 'Dostępny',
  },
  {
    SKU: 'SKU-003',
    Produkt: 'Olej hydrauliczny 5L',
    Lokalizacja: 'R3-B-02',
    Ilość: 120,
    Status: 'Dostępny',
  },
  {
    SKU: 'SKU-004',
    Produkt: 'Filtr powietrza FP-200',
    Lokalizacja: 'R2-A-03',
    Ilość: 340,
    Status: 'Zablokowany',
  },
];

const MOCK_MOVEMENTS_DATA = [
  {
    Data: '2025-06-18 14:32',
    Typ: 'Przyjęcie',
    Dokument: 'PZ/2025/005',
    Produkt: 'Śruba M8x40',
    Ilość: 500,
    Z: '-',
    Do: 'BUFOR-01',
    Użytkownik: 'Jan Kowalski',
  },
  {
    Data: '2025-06-18 14:45',
    Typ: 'Rozmieszczenie',
    Dokument: 'PZ/2025/005',
    Produkt: 'Śruba M8x40',
    Ilość: 500,
    Z: 'BUFOR-01',
    Do: 'R1-A-01',
    Użytkownik: 'Jan Kowalski',
  },
  {
    Data: '2025-06-18 15:10',
    Typ: 'Przesunięcie',
    Dokument: 'MM/2025/012',
    Produkt: 'Filtr powietrza FP-200',
    Ilość: 50,
    Z: 'R2-A-03',
    Do: 'R4-C-01',
    Użytkownik: 'Anna Nowak',
  },
];

const MOCK_TASKS_DATA = [
  { Magazynier: 'Jan Kowalski', Typ: 'Rozmieszczanie', Wykonane: 12, Średni_czas_min: 4.5 },
  { Magazynier: 'Jan Kowalski', Typ: 'Kompletacja', Wykonane: 8, Średni_czas_min: 6.2 },
  { Magazynier: 'Anna Nowak', Typ: 'Rozmieszczanie', Wykonane: 15, Średni_czas_min: 3.8 },
  { Magazynier: 'Anna Nowak', Typ: 'Kompletacja', Wykonane: 10, Średni_czas_min: 5.1 },
];

const MOCK_DOCUMENTS_DATA = [
  { Miesiąc: '2025-06', Typ: 'PZ', Ilość_dokumentów: 6, Suma_pozycji: 31 },
  { Miesiąc: '2025-06', Typ: 'RW', Ilość_dokumentów: 5, Suma_pozycji: 16 },
  { Miesiąc: '2025-06', Typ: 'MM', Ilość_dokumentów: 4, Suma_pozycji: 11 },
];

interface ReportConfig {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  data: Record<string, unknown>[];
  filename: string;
}

const ReportsPage = () => {
  const { showSuccess } = useNotification();

  const reports: ReportConfig[] = [
    {
      title: 'Stany magazynowe',
      description: 'Zestawienie aktualnych stanów z podziałem na lokalizacje i statusy',
      icon: <Inventory2 sx={{ fontSize: 40 }} />,
      color: '#1565C0',
      data: MOCK_STOCK_DATA,
      filename: 'stany_magazynowe',
    },
    {
      title: 'Historia ruchów',
      description: 'Raport ruchów magazynowych za wybrany okres z filtrowaniem',
      icon: <SwapHoriz sx={{ fontSize: 40 }} />,
      color: '#FF8F00',
      data: MOCK_MOVEMENTS_DATA,
      filename: 'historia_ruchow',
    },
    {
      title: 'Realizacja zadań',
      description: 'Statystyki realizacji zadań per magazynier i typ operacji',
      icon: <Assignment sx={{ fontSize: 40 }} />,
      color: '#2E7D32',
      data: MOCK_TASKS_DATA,
      filename: 'realizacja_zadan',
    },
    {
      title: 'Analiza przyjęć/wydań',
      description: 'Podsumowanie dokumentów PZ/RW za wybrany okres',
      icon: <BarChart sx={{ fontSize: 40 }} />,
      color: '#7B1FA2',
      data: MOCK_DOCUMENTS_DATA,
      filename: 'analiza_dokumentow',
    },
  ];

  const exportCSV = (data: Record<string, unknown>[], filename: string) => {
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Raport');
    writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.csv`, { bookType: 'csv' });
    showSuccess(`Raport "${filename}" został wyeksportowany do CSV.`);
  };

  const exportXLSX = (data: Record<string, unknown>[], filename: string) => {
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Raport');
    writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccess(`Raport "${filename}" został wyeksportowany do XLSX.`);
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Raporty
      </Typography>

      <Grid container spacing={3}>
        {reports.map((report) => (
          <Grid size={{ xs: 12, sm: 6 }} key={report.title}>
            <Card sx={{ borderRadius: 2, borderTop: `4px solid ${report.color}`, height: '100%' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box sx={{ color: report.color }}>{report.icon}</Box>
                  <Typography variant="h6" fontWeight={600}>
                    {report.title}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                  {report.description}
                </Typography>
                <Alert severity="info" sx={{ mb: 2, py: 0 }}>
                  <Typography variant="caption">{report.data.length} rekordów</Typography>
                </Alert>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Download />}
                    onClick={() => exportCSV(report.data, report.filename)}
                  >
                    CSV
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Download />}
                    onClick={() => exportXLSX(report.data, report.filename)}
                  >
                    XLSX
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ReportsPage;
