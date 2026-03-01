import { useState } from 'react';
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
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Search, SwapHoriz, Close } from '@mui/icons-material';
import { StockStatus, STOCK_STATUS_LABELS, STOCK_STATUS_COLORS } from '@/constants/stockStatuses';
import { usePermissions } from '@/hooks/usePermissions';
import { useNotification } from '@/context/NotificationContext';

interface StockItem {
  id: number;
  sku: string;
  name: string;
  location: string;
  quantity: number;
  status: StockStatus;
}

const INITIAL_STOCK: StockItem[] = [
  {
    id: 1,
    sku: 'SKU-001',
    name: 'Śruba M8x40',
    location: 'R1-A-01',
    quantity: 500,
    status: StockStatus.AVAILABLE,
  },
  {
    id: 2,
    sku: 'SKU-001',
    name: 'Śruba M8x40',
    location: 'R1-A-02',
    quantity: 2000,
    status: StockStatus.AVAILABLE,
  },
  {
    id: 3,
    sku: 'SKU-002',
    name: 'Nakrętka M8',
    location: 'R1-B-02',
    quantity: 4800,
    status: StockStatus.AVAILABLE,
  },
  {
    id: 4,
    sku: 'SKU-003',
    name: 'Olej hydrauliczny 5L',
    location: 'R3-B-02',
    quantity: 120,
    status: StockStatus.AVAILABLE,
  },
  {
    id: 5,
    sku: 'SKU-004',
    name: 'Filtr powietrza FP-200',
    location: 'R2-A-03',
    quantity: 340,
    status: StockStatus.BLOCKED,
  },
  {
    id: 6,
    sku: 'SKU-005',
    name: 'Uszczelka gumowa 50mm',
    location: 'R2-C-01',
    quantity: 1500,
    status: StockStatus.AVAILABLE,
  },
  {
    id: 7,
    sku: 'SKU-006',
    name: 'Łożysko kulkowe 6205',
    location: 'R4-A-01',
    quantity: 890,
    status: StockStatus.AVAILABLE,
  },
  {
    id: 8,
    sku: 'SKU-007',
    name: 'Pasek klinowy B-1250',
    location: 'BUFOR-01',
    quantity: 210,
    status: StockStatus.AVAILABLE,
  },
  {
    id: 9,
    sku: 'SKU-008',
    name: 'Smar łożyskowy 400g',
    location: 'R4-B-03',
    quantity: 50,
    status: StockStatus.BLOCKED,
  },
  {
    id: 10,
    sku: 'SKU-008',
    name: 'Smar łożyskowy 400g',
    location: 'R4-B-04',
    quantity: 45,
    status: StockStatus.AVAILABLE,
  },
];

const StockPage = () => {
  const [search, setSearch] = useState('');
  const [stock, setStock] = useState<StockItem[]>(INITIAL_STOCK);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const { canChangeStockStatus } = usePermissions();
  const { showSuccess } = useNotification();

  const handleStatusChange = () => {
    if (!selectedItem) return;
    const newStatus =
      selectedItem.status === StockStatus.AVAILABLE ? StockStatus.BLOCKED : StockStatus.AVAILABLE;
    setStock(stock.map((s) => (s.id === selectedItem.id ? { ...s, status: newStatus } : s)));
    setStatusDialogOpen(false);
    setSelectedItem(null);
    showSuccess(
      `Status zapasu ${selectedItem.sku} na ${selectedItem.location} zmieniony na "${STOCK_STATUS_LABELS[newStatus]}".`,
    );
  };

  const columns: GridColDef[] = [
    { field: 'sku', headerName: 'Kod SKU', width: 130 },
    { field: 'name', headerName: 'Produkt', flex: 1, minWidth: 180 },
    { field: 'location', headerName: 'Lokalizacja', width: 130 },
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

  const filtered = stock.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.sku.toLowerCase().includes(search.toLowerCase()) ||
      s.location.toLowerCase().includes(search.toLowerCase()),
  );

  const blockedCount = stock.filter((s) => s.status === StockStatus.BLOCKED).length;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
        Stany magazynowe
      </Typography>
      {blockedCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {blockedCount} {blockedCount === 1 ? 'pozycja zablokowana' : 'pozycje zablokowane'} –
          towar zablokowany jest pomijany w pickingu.
        </Alert>
      )}

      <TextField
        placeholder="Szukaj po produkcie, SKU lub lokalizacji..."
        size="small"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2, width: 400 }}
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

      <DataGrid
        rows={filtered}
        columns={columns}
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        disableRowSelectionOnClick
        autoHeight
        sx={{ borderRadius: 2 }}
      />

      {/* Dialog: Zmiana statusu */}
      <Dialog
        open={statusDialogOpen}
        onClose={() => {
          setStatusDialogOpen(false);
          setSelectedItem(null);
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
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Produkt
                </Typography>
                <Typography fontWeight={600}>
                  {selectedItem.sku} – {selectedItem.name}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Lokalizacja
                </Typography>
                <Typography fontWeight={600}>{selectedItem.location}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Ilość
                </Typography>
                <Typography fontWeight={600}>{selectedItem.quantity}</Typography>
              </Box>
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
              {selectedItem.status === StockStatus.AVAILABLE && (
                <Alert severity="warning">
                  Zablokowany towar nie będzie widoczny w procesie kompletacji (picking).
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
            }}
          >
            Anuluj
          </Button>
          <Button
            variant="contained"
            color={selectedItem?.status === StockStatus.AVAILABLE ? 'error' : 'success'}
            onClick={handleStatusChange}
          >
            {selectedItem?.status === StockStatus.AVAILABLE ? 'Zablokuj' : 'Odblokuj'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StockPage;
