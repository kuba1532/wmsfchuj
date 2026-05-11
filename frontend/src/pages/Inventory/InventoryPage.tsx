import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { dataGridLocaleText } from '@/constants/dataGridLocale';
import {
  Add,
  Search,
  Visibility,
  Close,
  CheckCircle,
  Warning,
  Download,
} from '@mui/icons-material';
import {
  DocumentStatus,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
} from '@/constants/documentStatuses';
import { usePermissions } from '@/hooks/usePermissions';
import { useNotification } from '@/context/NotificationContext';
import FormModal from '@/components/Modal/FormModal';
import PageHeader from '@/components/Table/PageHeader';
import { generateInventoryPDF } from '@/utils/pdfGenerator';
import apiClient from '@/api/client';

interface StockRow {
  stock_id: number;
  location_code: string;
  location_id: number;
  product_id: number;
  product_sku: string;
  product_name: string;
  system_quantity: number;
}

interface InventoryDoc {
  id: number;
  number: string;
  status: DocumentStatus;
  created_at: string;
  items: InventoryDocItem[];
}

interface InventoryDocItem {
  id: number;
  location_id: number;
  product_id: number;
  location_code?: string;
  product_sku?: string;
  product_name?: string;
  system_quantity: number;
  actual_quantity: number;
  difference: number;
}

const InventoryPage = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [documents, setDocuments] = useState<InventoryDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<InventoryDoc | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dane do formularza
  const [stockRows, setStockRows] = useState<StockRow[]>([]);
  const [selectedStockIds, setSelectedStockIds] = useState<number[]>([]);
  const [actualQuantities, setActualQuantities] = useState<Record<number, string>>({});
  const [invType, setInvType] = useState<'FULL' | 'PARTIAL'>('FULL');

  const { canApproveInventory, canCountInventory } = usePermissions();
  const { showSuccess, showError } = useNotification();

  const fetchDocuments = useCallback(async (searchVal: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', page_size: '25' });
      if (searchVal) params.append('search', searchVal);
      const res = await apiClient.get(`/inventory?${params.toString()}`);
      setDocuments(res.data.items ?? []);
      setTotal(res.data.total ?? 0);
    } catch {
      showError('Nie udało się pobrać listy inwentaryzacji.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments('');
  }, [fetchDocuments]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      clearTimeout((handleSearchChange as { timer?: ReturnType<typeof setTimeout> }).timer);
      (handleSearchChange as { timer?: ReturnType<typeof setTimeout> }).timer = setTimeout(() => {
        setDebouncedSearch(value);
        fetchDocuments(value);
      }, 400);
    },
    [fetchDocuments],
  );

  // Pobierz stany magazynowe przy otwarciu modalu tworzenia
  useEffect(() => {
    if (!createOpen) return;
    apiClient
      .get('/stock?page=1&page_size=100&status_filter=AVAILABLE')
      .then((res) => {
        const rows: StockRow[] = (res.data.items ?? []).map(
          (s: {
            id: number;
            location?: { code: string; id: number };
            location_id: number;
            product?: { sku: string; name: string };
            product_id: number;
            quantity: number;
          }) => ({
            stock_id: s.id,
            location_code: s.location?.code ?? `#${s.location_id}`,
            location_id: s.location_id,
            product_id: s.product_id,
            product_sku: s.product?.sku ?? `#${s.product_id}`,
            product_name: s.product?.name ?? '',
            system_quantity: s.quantity,
          }),
        );
        setStockRows(rows);
      })
      .catch(() => showError('Nie udało się pobrać stanów magazynowych.'));
  }, [createOpen]);

  const handleToggleStock = (stockId: number) => {
    setSelectedStockIds((prev) =>
      prev.includes(stockId) ? prev.filter((id) => id !== stockId) : [...prev, stockId],
    );
  };

  const handleSelectAll = () => {
    if (selectedStockIds.length === stockRows.length) {
      setSelectedStockIds([]);
    } else {
      setSelectedStockIds(stockRows.map((r) => r.stock_id));
    }
  };

  const handleCreate = async () => {
    if (selectedStockIds.length === 0) {
      showError('Zaznacz przynajmniej jedną pozycję.');
      return;
    }
    setIsSubmitting(true);
    try {
      const items = selectedStockIds.map((stockId) => {
        const row = stockRows.find((r) => r.stock_id === stockId)!;
        const actual = Number(actualQuantities[stockId]);
        return {
          product_id: row.product_id,
          location_id: row.location_id,
          actual_quantity: isNaN(actual) ? row.system_quantity : actual,
        };
      });

      await apiClient.post('/inventory', { type: invType, items });
      showSuccess('Inwentaryzacja została utworzona.');
      setCreateOpen(false);
      setSelectedStockIds([]);
      setActualQuantities({});
      setInvType('FULL');
      fetchDocuments(debouncedSearch);
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      showError(detail ?? 'Nie udało się utworzyć inwentaryzacji.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await apiClient.post(`/inventory/${id}/approve`);
      showSuccess('Inwentaryzacja została zatwierdzona. Korekty zostały zastosowane.');
      setDetailOpen(false);
      setSelectedDoc(null);
      fetchDocuments(debouncedSearch);
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      showError(detail ?? 'Nie udało się zatwierdzić inwentaryzacji.');
    }
  };

  const columns: GridColDef[] = [
    { field: 'number', headerName: 'Numer', width: 150 },
    {
      field: 'created_at',
      headerName: 'Data',
      width: 120,
      valueFormatter: (value: string) =>
        value ? new Date(value).toLocaleDateString('pl-PL') : '—',
    },
    {
      field: 'items',
      headerName: 'Pozycje',
      width: 90,
      type: 'number',
      valueGetter: (_: unknown, row: InventoryDoc) => row.items?.length ?? 0,
    },
    {
      field: 'differences',
      headerName: 'Różnice',
      width: 110,
      valueGetter: (_: unknown, row: InventoryDoc) =>
        row.items?.filter((i) => i.difference !== 0).length ?? 0,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value > 0 ? 'error' : 'success'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Stan dokumentu',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={DOCUMENT_STATUS_LABELS[params.value as DocumentStatus]}
          size="small"
          sx={{
            bgcolor: DOCUMENT_STATUS_COLORS[params.value as DocumentStatus],
            color: 'white',
            fontWeight: 600,
          }}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Akcje',
      width: 80,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title="Podgląd">
          <IconButton
            size="small"
            onClick={() => {
              setSelectedDoc(params.row);
              setDetailOpen(true);
            }}
          >
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  const selectedDocDifferences = selectedDoc?.items?.filter((i) => i.difference !== 0).length ?? 0;

  return (
    <Box>
      <PageHeader
        title="Inwentaryzacja"
        subtitle={`Łącznie dokumentów: ${total}`}
        action={
          canCountInventory() ? (
            <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
              Nowa inwentaryzacja
            </Button>
          ) : null
        }
      />

      <TextField
        placeholder="Szukaj po numerze..."
        size="small"
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        sx={{ mb: 2, width: 350 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          },
        }}
      />

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <DataGrid
          rows={documents}
          columns={columns}
          pageSizeOptions={[10, 25]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
          localeText={dataGridLocaleText}
          autoHeight
          sx={{ borderRadius: 2 }}
        />
      )}

      {/* Modal: Nowa inwentaryzacja */}
      <FormModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setSelectedStockIds([]);
          setActualQuantities({});
        }}
        onSubmit={handleCreate}
        title="Nowa inwentaryzacja"
        maxWidth="md"
        submitLabel="Utwórz inwentaryzację"
        isSubmitting={isSubmitting}
      >
        <TextField
          select
          label="Typ inwentaryzacji"
          size="small"
          fullWidth
          value={invType}
          onChange={(e) => setInvType(e.target.value as 'FULL' | 'PARTIAL')}
          slotProps={{ select: { native: true } }}
          sx={{ mb: 2 }}
        >
          <option value="FULL">Pełna</option>
          <option value="PARTIAL">Wyrywkowa</option>
        </TextField>

        <Alert severity="info" sx={{ mb: 2 }}>
          Zaznacz lokalizacje do sprawdzenia i wprowadź stan faktyczny. Zatwierdzenie różnic wymaga
          uprawnień Kierownika lub Administratora.
        </Alert>

        <Divider sx={{ my: 1 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            Pozycje ({selectedStockIds.length}/{stockRows.length})
          </Typography>
          <Button size="small" onClick={handleSelectAll}>
            {selectedStockIds.length === stockRows.length
              ? 'Odznacz wszystkie'
              : 'Zaznacz wszystkie'}
          </Button>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            maxHeight: 400,
            overflowY: 'auto',
          }}
        >
          {stockRows.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            stockRows.map((row) => {
              const isSelected = selectedStockIds.includes(row.stock_id);
              return (
                <Box
                  key={row.stock_id}
                  onClick={() => handleToggleStock(row.stock_id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 1.5,
                    borderRadius: 2,
                    cursor: 'pointer',
                    border: '2px solid',
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    bgcolor: isSelected ? 'action.selected' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {row.location_code}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.product_sku} – {row.product_name}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right', minWidth: 80 }}>
                    <Typography variant="caption" color="text.secondary">
                      Stan system.
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {row.system_quantity}
                    </Typography>
                  </Box>
                  {isSelected && (
                    <TextField
                      label="Stan faktyczny"
                      type="number"
                      size="small"
                      sx={{ width: 130 }}
                      value={actualQuantities[row.stock_id] ?? ''}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        setActualQuantities({
                          ...actualQuantities,
                          [row.stock_id]: e.target.value,
                        });
                      }}
                      placeholder={String(row.system_quantity)}
                    />
                  )}
                </Box>
              );
            })
          )}
        </Box>
      </FormModal>

      {/* Dialog: Podgląd */}
      <Dialog
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedDoc(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Box fontWeight={600}>{selectedDoc?.number}</Box>
          <IconButton
            size="small"
            onClick={() => {
              setDetailOpen(false);
              setSelectedDoc(null);
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedDoc && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Data
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {new Date(selectedDoc.created_at).toLocaleDateString('pl-PL')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Stan dokumentu
                  </Typography>
                  <Chip
                    label={DOCUMENT_STATUS_LABELS[selectedDoc.status]}
                    size="small"
                    sx={{
                      bgcolor: DOCUMENT_STATUS_COLORS[selectedDoc.status],
                      color: 'white',
                      fontWeight: 600,
                      display: 'block',
                      mt: 0.5,
                    }}
                  />
                </Box>
              </Box>

              {selectedDocDifferences > 0 ? (
                <Alert severity="warning" icon={<Warning />}>
                  Znaleziono {selectedDocDifferences}{' '}
                  {selectedDocDifferences === 1 ? 'różnicę' : 'różnice'} wymagające korekty.
                </Alert>
              ) : (
                <Alert severity="success" icon={<CheckCircle />}>
                  Brak różnic – stany zgodne.
                </Alert>
              )}

              <Divider />
              <Typography variant="subtitle2" fontWeight={600}>
                Porównanie stanów
              </Typography>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '120px 100px 1fr 100px 100px 100px',
                  gap: 1,
                  px: 1.5,
                  py: 1,
                  bgcolor: 'action.hover',
                  borderRadius: 2,
                }}
              >
                {['Lokalizacja', 'SKU', 'Produkt', 'Systemowy', 'Faktyczny', 'Różnica'].map(
                  (h) => (
                    <Typography key={h} variant="caption" fontWeight={700}>
                      {h}
                    </Typography>
                  ),
                )}
              </Box>

              {selectedDoc.items?.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '120px 100px 1fr 100px 100px 100px',
                    gap: 1,
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    bgcolor: item.difference !== 0 ? 'error.main' : 'transparent',
                    color: item.difference !== 0 ? 'white' : 'text.primary',
                  }}
                >
                  <Typography variant="body2" fontWeight={600}>
                    {item.location_code ?? `#${item.location_id}`}
                  </Typography>
                  <Typography variant="body2">
                    {item.product_sku ?? `#${item.product_id}`}
                  </Typography>
                  <Typography variant="body2">{item.product_name ?? '—'}</Typography>
                  <Typography variant="body2" sx={{ textAlign: 'right' }}>
                    {item.system_quantity}
                  </Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right' }}>
                    {item.actual_quantity}
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ textAlign: 'right' }}>
                    {item.difference > 0 ? `+${item.difference}` : item.difference}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {selectedDoc?.status === DocumentStatus.DRAFT && canApproveInventory() && (
            <Button
              variant="contained"
              color="warning"
              startIcon={<CheckCircle />}
              onClick={() => handleApprove(selectedDoc.id)}
            >
              Zatwierdź i zastosuj korekty
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={() => {
              if (!selectedDoc) return;
              generateInventoryPDF(
                selectedDoc.number,
                new Date(selectedDoc.created_at).toLocaleDateString('pl-PL'),
                'Pełna',
                DOCUMENT_STATUS_LABELS[selectedDoc.status],
                selectedDoc.items?.map((i) => ({
                  locationCode: i.location_code ?? `#${i.location_id}`,
                  productName: i.product_name ?? '—',
                  sku: i.product_sku ?? '—',
                  systemQuantity: i.system_quantity,
                  actualQuantity: i.actual_quantity,
                  difference: i.difference,
                })) ?? [],
              );
            }}
          >
            Pobierz PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventoryPage;
