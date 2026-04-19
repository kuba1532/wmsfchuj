import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Alert,
  CircularProgress,
} from '@mui/material';
import { BarChart, Download, Inventory2, SwapHoriz, Assignment } from '@mui/icons-material';
import apiClient from '@/api/client';
import { useNotification } from '@/context/NotificationContext';
import { utils, writeFile } from 'xlsx';

interface StockRow {
  id: number;
  quantity: number;
  status: string;
  product_id: number;
  location_id: number;
  product?: { sku?: string; name?: string };
  location?: { code?: string };
}

interface LedgerRow {
  id: number;
  movement_type: string;
  product_id: number;
  from_location_id?: number | null;
  to_location_id?: number | null;
  quantity: number;
  document_number?: string | null;
  user_id: number;
  created_at: string;
}

interface TaskRow {
  id: number;
  type: string;
  status: string;
  product_id?: number | null;
  quantity: number;
  assigned_to_id?: number | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
}

interface DocumentRow {
  id: number;
  number: string;
  type: string;
  status: string;
  created_at: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

interface ReportConfig {
  title: string;
  description: string;
  icon: ReactNode;
  color: string;
  data: Record<string, unknown>[];
  filename: string;
  loading?: boolean;
}

const formatDate = (value: string) =>
  value ? new Date(value).toLocaleString('pl-PL') : '—';

const fetchAllPages = async <T,>(path: string, extraParams?: Record<string, string>) => {
  const pageSize = 100;
  let page = 1;
  let pages = 1;
  const items: T[] = [];

  do {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
      ...extraParams,
    });
    const response = await apiClient.get<PaginatedResponse<T>>(`${path}?${params.toString()}`);
    const data = response.data;
    items.push(...(data.items ?? []));
    pages = data.pages ?? 1;
    page += 1;
  } while (page <= pages);

  return items;
};

const ReportsPage = () => {
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [stockRows, setStockRows] = useState<StockRow[]>([]);
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([]);
  const [taskRows, setTaskRows] = useState<TaskRow[]>([]);
  const [documentRows, setDocumentRows] = useState<DocumentRow[]>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const [stock, ledger, tasks, documents] = await Promise.all([
          fetchAllPages<StockRow>('/stock'),
          fetchAllPages<LedgerRow>('/ledger'),
          fetchAllPages<TaskRow>('/tasks'),
          fetchAllPages<DocumentRow>('/documents'),
        ]);

        if (!active) return;
        setStockRows(stock);
        setLedgerRows(ledger);
        setTaskRows(tasks);
        setDocumentRows(documents);
      } catch {
        if (!active) return;
        showError('Nie udało się pobrać danych raportowych.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [showError]);

  const stockReportData = useMemo(
    () =>
      stockRows.map((row) => ({
        SKU: row.product?.sku ?? `#${row.product_id}`,
        Produkt: row.product?.name ?? `Produkt #${row.product_id}`,
        Lokalizacja: row.location?.code ?? `#${row.location_id}`,
        Ilość: row.quantity,
        Status: row.status,
      })),
    [stockRows],
  );

  const ledgerReportData = useMemo(
    () =>
      ledgerRows.map((row) => ({
        Data: formatDate(row.created_at),
        Typ: row.movement_type,
        Dokument: row.document_number ?? '—',
        Produkt_ID: row.product_id,
        Ilość: row.quantity,
        Z_lokalizacji: row.from_location_id ?? '—',
        Do_lokalizacji: row.to_location_id ?? '—',
        Użytkownik_ID: row.user_id,
      })),
    [ledgerRows],
  );

  const taskReportData = useMemo(() => {
    const grouped = new Map<string, { Typ: string; Status: string; Liczba_zadań: number }>();
    for (const row of taskRows) {
      const key = `${row.type}::${row.status}`;
      const current = grouped.get(key);
      if (current) {
        current.Liczba_zadań += 1;
      } else {
        grouped.set(key, {
          Typ: row.type,
          Status: row.status,
          Liczba_zadań: 1,
        });
      }
    }
    return Array.from(grouped.values()).sort((a, b) =>
      `${a.Typ}-${a.Status}`.localeCompare(`${b.Typ}-${b.Status}`, 'pl'),
    );
  }, [taskRows]);

  const documentReportData = useMemo(() => {
    const grouped = new Map<string, { Typ: string; Status: string; Liczba_dokumentów: number }>();
    for (const row of documentRows) {
      const key = `${row.type}::${row.status}`;
      const current = grouped.get(key);
      if (current) {
        current.Liczba_dokumentów += 1;
      } else {
        grouped.set(key, {
          Typ: row.type,
          Status: row.status,
          Liczba_dokumentów: 1,
        });
      }
    }
    return Array.from(grouped.values()).sort((a, b) =>
      `${a.Typ}-${a.Status}`.localeCompare(`${b.Typ}-${b.Status}`, 'pl'),
    );
  }, [documentRows]);

  const reports: ReportConfig[] = [
    {
      title: 'Stany magazynowe',
      description: 'Zestawienie aktualnych stanów z podziałem na lokalizacje i statusy',
      icon: <Inventory2 sx={{ fontSize: 40 }} />,
      color: '#1565C0',
      data: stockReportData,
      filename: 'stany_magazynowe',
      loading,
    },
    {
      title: 'Historia ruchów',
      description: 'Raport ruchów magazynowych z rzeczywistego rejestru operacji',
      icon: <SwapHoriz sx={{ fontSize: 40 }} />,
      color: '#FF8F00',
      data: ledgerReportData,
      filename: 'historia_ruchow',
      loading,
    },
    {
      title: 'Realizacja zadań',
      description: 'Zestawienie liczby zadań według typu i statusu',
      icon: <Assignment sx={{ fontSize: 40 }} />,
      color: '#2E7D32',
      data: taskReportData,
      filename: 'realizacja_zadan',
      loading,
    },
    {
      title: 'Analiza przyjęć/wydań',
      description: 'Podsumowanie dokumentów według typu i statusu',
      icon: <BarChart sx={{ fontSize: 40 }} />,
      color: '#7B1FA2',
      data: documentReportData,
      filename: 'analiza_dokumentow',
      loading,
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
                  <Typography variant="caption">
                    {report.loading ? 'Ładowanie danych...' : `${report.data.length} rekordów`}
                  </Typography>
                </Alert>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Download />}
                    disabled={report.loading || report.data.length === 0}
                    onClick={() => exportCSV(report.data, report.filename)}
                  >
                    CSV
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Download />}
                    disabled={report.loading || report.data.length === 0}
                    onClick={() => exportXLSX(report.data, report.filename)}
                  >
                    XLSX
                  </Button>
                </Box>
                {report.loading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={22} />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ReportsPage;
