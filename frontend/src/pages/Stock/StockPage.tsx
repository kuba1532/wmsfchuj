import { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Search, SwapHoriz, Close } from '@mui/icons-material';
import { StockStatus, STOCK_STATUS_LABELS, STOCK_STATUS_COLORS } from '@/constants/stockStatuses';
import { usePermissions } from '@/hooks/usePermissions';
import { useNotification } from '@/context/NotificationContext';
import { useStock, type StockItem } from '@/hooks/useStock';
import ScanButton from '@/components/Scanner/ScanButton';
import { useExternalScanner } from '@/hooks/useExternalScanner';

const StockPage = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [quantityInput, setQuantityInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { canChangeStockStatus } = usePermissions();
  const { showError } = useNotification();

  const { stock, total, isLoading, changeStatus } = useStock({ search: debouncedSearch });

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    clearTimeout((handleSearchChange as { timer?: ReturnType<typeof setTimeout> }).timer);
    (handleSearchChange as { timer?: ReturnType<typeof setTimeout> }).timer = setTimeout(() => {
      setDebouncedSearch(value);
    }, 400);
  }, []);

  const handleScan = useCallback((code: string) => {
    setSearch(code);
    setDebouncedSearch(code);
  }, []);

  useExternalScanner({ onScan: handleScan });

  const handleStatusChange = async () => {
    if (!selectedItem) return;
    const currentQty = Number(selectedItem.quantity);
    const parsedQty = Number(quantityInput);
    const qty =
      quantityInput.trim() === '' || !Number.isFinite(parsedQty) ? currentQty : parsedQty;

    if (qty <= 0) {
      showError('Ilość musi być większa od zera.');
      return;
    }
    if (qty > currentQty) {
      showError(`Ilość nie może przekraczać dostępnego stanu (${currentQty}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const newStatus =
        selectedItem.status === StockStatus.AVAILABLE ? StockStatus.BLOCKED : StockStatus.AVAILABLE;
      await changeStatus(selectedItem.id, newStatus, selectedItem.version, qty);
      setStatusDialogOpen(false);
      setSelectedItem(null);
      setQuantityInput('');
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      showError(detail ?? 'Nie udało się zmienić statusu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const blockedCount = stock.filter((s) => s.status === StockStatus.BLOCKED).length;

  const columns: GridColDef[] = [
    {
      field: 'sku',
      headerName: 'Kod SKU',
      width: 130,
      valueGetter: (_: unknown, row: StockItem) => row.product?.sku ?? `#${row.product_id}`,
    },
    {
      field: 'name',
      headerName: 'Produkt',
      flex: 1,
      minWidth: 180,
      valueGetter: (_: unknown, row: StockItem) =>
        row.product?.name ?? `Produkt #${row.product_id}`,
    },
    {
      field: 'location',
      headerName: 'Lokalizacja',
      width: 130,
      valueGetter: (_: unknown, row: StockItem) => row.location?.code ?? `#${row.location_id}`,
    },
    { field: 'quantity', headerName: 'Ilość', width: 100, type: 'number' },
    {
      field: 'status',
      headerName: 'Status',
      width: 160,
      renderCell: (params) => (
        <Chip
          label={STOCK_STATUS_LABELS[params.value as StockStatus]}
          size="small"
          sx={{
            bgcolor: STOCK_STATUS_COLORS[params.value as StockStatus],
            color: 'white',
            fontWeight: 600,
          }}
        />
      ),
    },
    ...(canChangeStockStatus()
      ? [
          {
            field: 'actions' as const,
            headerName: 'Akcje',
            width: 80,
            sortable: false,
            filterable: false,
            renderCell: (params: { row: StockItem }) => (
              <Tooltip title="Zmień status">
                <IconButton
                  size="small"
                  onClick={() => {
                    setSelectedItem(params.row);
                    setQuantityInput(String(params.row.quantity));
                    setStatusDialogOpen(true);
                  }}
                >
                  <SwapHoriz fontSize="small" />
                </IconButton>
              </Tooltip>
            ),
          },
        ]
      : []),
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
        Stany magazynowe
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Łącznie pozycji: {total}
      </Typography>

      {blockedCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {blockedCount} {blockedCount === 1 ? 'pozycja zablokowana' : 'pozycje zablokowane'} –
          towar zablokowany jest pomijany w pickingu.
        </Alert>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <TextField
          placeholder="Szukaj po produkcie, SKU lub lokalizacji..."
          size="small"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          sx={{ width: 400 }}
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
        <ScanButton onScan={handleScan} title="Skanuj SKU lub lokalizację" />
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <DataGrid
          rows={stock}
          columns={columns}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
          autoHeight
          sx={{ borderRadius: 2 }}
        />
      )}

      <Dialog
        open={statusDialogOpen}
        onClose={() => {
          setStatusDialogOpen(false);
          setSelectedItem(null);
          setQuantityInput('');
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Box fontWeight={600}>Zmień status zapasu</Box>
          <IconButton
            size="small"
            onClick={() => {
              setStatusDialogOpen(false);
              setSelectedItem(null);
              setQuantityInput('');
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              {[
                {
                  label: 'Produkt',
                  value: `${selectedItem.product?.sku ?? ''} – ${selectedItem.product?.name ?? `#${selectedItem.product_id}`}`,
                },
                {
                  label: 'Lokalizacja',
                  value: selectedItem.location?.code ?? `#${selectedItem.location_id}`,
                },
                { label: 'Ilość', value: String(selectedItem.quantity) },
              ].map(({ label, value }) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography fontWeight={600}>{value}</Typography>
                </Box>
              ))}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 2,
                  py: 2,
                }}
              >
                <Chip
                  label={STOCK_STATUS_LABELS[selectedItem.status]}
                  sx={{
                    bgcolor: STOCK_STATUS_COLORS[selectedItem.status],
                    color: 'white',
                    fontWeight: 600,
                  }}
                />
                <Typography variant="h6">→</Typography>
                <Chip
                  label={
                    STOCK_STATUS_LABELS[
                      selectedItem.status === StockStatus.AVAILABLE
                        ? StockStatus.BLOCKED
                        : StockStatus.AVAILABLE
                    ]
                  }
                  sx={{
                    bgcolor:
                      STOCK_STATUS_COLORS[
                        selectedItem.status === StockStatus.AVAILABLE
                          ? StockStatus.BLOCKED
                          : StockStatus.AVAILABLE
                      ],
                    color: 'white',
                    fontWeight: 600,
                  }}
                />
              </Box>
              <TextField
                label={
                  selectedItem.status === StockStatus.AVAILABLE
                    ? 'Ilość do zablokowania'
                    : 'Ilość do odblokowania'
                }
                type="number"
                size="small"
                fullWidth
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                helperText={`Dostępne: ${selectedItem.quantity}. Puste pole lub pełna ilość = cała pozycja.`}
                inputProps={{
                  min: 0,
                  max: Number(selectedItem.quantity),
                  step: 'any',
                }}
              />
              {Number(quantityInput) > 0 &&
                Number(quantityInput) < Number(selectedItem.quantity) && (
                  <Alert severity="info">
                    Rekord zostanie rozdzielony: {Number(selectedItem.quantity) - Number(quantityInput)}{' '}
                    {selectedItem.product?.unit ?? ''} zostanie w statusie{' '}
                    <b>{STOCK_STATUS_LABELS[selectedItem.status]}</b>, a {quantityInput}{' '}
                    {selectedItem.product?.unit ?? ''} trafi do statusu{' '}
                    <b>
                      {STOCK_STATUS_LABELS[
                        selectedItem.status === StockStatus.AVAILABLE
                          ? StockStatus.BLOCKED
                          : StockStatus.AVAILABLE
                      ]}
                    </b>
                    .
                  </Alert>
                )}
              {selectedItem.status === StockStatus.AVAILABLE && (
                <Alert severity="warning">
                  Zablokowany towar nie będzie widoczny w procesie kompletacji.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => {
              setStatusDialogOpen(false);
              setSelectedItem(null);
              setQuantityInput('');
            }}
          >
            Anuluj
          </Button>
          <Button
            variant="contained"
            color={selectedItem?.status === StockStatus.AVAILABLE ? 'error' : 'success'}
            onClick={handleStatusChange}
            disabled={isSubmitting}
          >
            {selectedItem?.status === StockStatus.AVAILABLE ? 'Zablokuj' : 'Odblokuj'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StockPage;
