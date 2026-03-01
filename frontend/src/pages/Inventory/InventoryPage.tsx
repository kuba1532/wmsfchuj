import { useState } from 'react';
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
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
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
import { generateInventoryPDF } from '@/utils/pdfGenerator';

interface InventoryItem {
  locationCode: string;
  productName: string;
  sku: string;
  systemQuantity: number;
  actualQuantity: number;
  difference: number;
}

interface InventoryDocument {
  id: number;
  number: string;
  date: string;
  type: string;
  locations: number;
  differences: number;
  status: DocumentStatus;
  items: InventoryItem[];
  countedBy?: string;
}

const INITIAL_INVENTORY: InventoryDocument[] = [
  {
    id: 1,
    number: 'INW/2025/001',
    date: '2025-06-10',
    type: 'Pełna',
    locations: 3,
    differences: 1,
    status: DocumentStatus.COMPLETED,
    countedBy: 'Jan Kowalski',
    items: [
      {
        locationCode: 'R1-A-01',
        productName: 'Śruba M8x40',
        sku: 'SKU-001',
        systemQuantity: 500,
        actualQuantity: 498,
        difference: -2,
      },
      {
        locationCode: 'R1-B-02',
        productName: 'Nakrętka M8',
        sku: 'SKU-002',
        systemQuantity: 4800,
        actualQuantity: 4800,
        difference: 0,
      },
      {
        locationCode: 'R3-B-02',
        productName: 'Olej hydrauliczny 5L',
        sku: 'SKU-003',
        systemQuantity: 120,
        actualQuantity: 120,
        difference: 0,
      },
    ],
  },
  {
    id: 2,
    number: 'INW/2025/002',
    date: '2025-06-15',
    type: 'Wyrywkowa',
    locations: 2,
    differences: 1,
    status: DocumentStatus.COMPLETED,
    countedBy: 'Anna Nowak',
    items: [
      {
        locationCode: 'R4-A-01',
        productName: 'Łożysko kulkowe 6205',
        sku: 'SKU-006',
        systemQuantity: 890,
        actualQuantity: 885,
        difference: -5,
      },
      {
        locationCode: 'R4-B-03',
        productName: 'Smar łożyskowy 400g',
        sku: 'SKU-008',
        systemQuantity: 50,
        actualQuantity: 50,
        difference: 0,
      },
    ],
  },
  {
    id: 3,
    number: 'INW/2025/003',
    date: '2025-06-17',
    type: 'Wyrywkowa',
    locations: 2,
    differences: 2,
    status: DocumentStatus.IN_PROGRESS,
    countedBy: 'Piotr Zieliński',
    items: [
      {
        locationCode: 'R2-A-03',
        productName: 'Filtr powietrza FP-200',
        sku: 'SKU-004',
        systemQuantity: 340,
        actualQuantity: 335,
        difference: -5,
      },
      {
        locationCode: 'R2-C-01',
        productName: 'Uszczelka gumowa 50mm',
        sku: 'SKU-005',
        systemQuantity: 1500,
        actualQuantity: 1510,
        difference: 10,
      },
    ],
  },
];

const AVAILABLE_LOCATIONS = [
  { code: 'R1-A-01', product: 'Śruba M8x40', sku: 'SKU-001', systemQty: 500 },
  { code: 'R1-A-02', product: 'Śruba M8x40', sku: 'SKU-001', systemQty: 2000 },
  { code: 'R1-B-02', product: 'Nakrętka M8', sku: 'SKU-002', systemQty: 4800 },
  { code: 'R3-B-02', product: 'Olej hydrauliczny 5L', sku: 'SKU-003', systemQty: 120 },
  { code: 'R2-A-03', product: 'Filtr powietrza FP-200', sku: 'SKU-004', systemQty: 340 },
  { code: 'R2-C-01', product: 'Uszczelka gumowa 50mm', sku: 'SKU-005', systemQty: 1500 },
  { code: 'R4-A-01', product: 'Łożysko kulkowe 6205', sku: 'SKU-006', systemQty: 890 },
  { code: 'R4-B-03', product: 'Smar łożyskowy 400g', sku: 'SKU-008', systemQty: 50 },
];

const InventoryPage = () => {
  const [search, setSearch] = useState('');
  const [documents, setDocuments] = useState<InventoryDocument[]>(INITIAL_INVENTORY);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<InventoryDocument | null>(null);
  const { canApproveInventory, canCountInventory } = usePermissions();
  const { showSuccess } = useNotification();

  const [newType, setNewType] = useState('Pełna');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [actualQuantities, setActualQuantities] = useState<Record<string, string>>({});

  const handleToggleLocation = (code: string) => {
    setSelectedLocations((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const handleSelectAll = () => {
    if (selectedLocations.length === AVAILABLE_LOCATIONS.length) {
      setSelectedLocations([]);
    } else {
      setSelectedLocations(AVAILABLE_LOCATIONS.map((l) => l.code));
    }
  };

  const handleCreate = () => {
    if (selectedLocations.length === 0) return;

    const items: InventoryItem[] = selectedLocations.map((code) => {
      const loc = AVAILABLE_LOCATIONS.find((l) => l.code === code)!;
      const actual = Number(actualQuantities[code]) || loc.systemQty;
      return {
        locationCode: code,
        productName: loc.product,
        sku: loc.sku,
        systemQuantity: loc.systemQty,
        actualQuantity: actual,
        difference: actual - loc.systemQty,
      };
    });

    const differences = items.filter((i) => i.difference !== 0).length;
    const nextNum = documents.length + 1;

    const newDoc: InventoryDocument = {
      id: nextNum,
      number: `INW/2025/${String(nextNum).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      type: newType,
      locations: items.length,
      differences,
      status: DocumentStatus.DRAFT,
      items,
      countedBy: 'Bieżący użytkownik',
    };

    setDocuments([...documents, newDoc]);
    setCreateOpen(false);
    setSelectedLocations([]);
    setActualQuantities({});
    setNewType('Pełna');
    showSuccess(
      `Inwentaryzacja ${newDoc.number} została utworzona. Znaleziono ${differences} różnic.`,
    );
  };

  const columns: GridColDef[] = [
    { field: 'number', headerName: 'Numer', width: 150 },
    { field: 'date', headerName: 'Data', width: 120 },
    {
      field: 'type',
      headerName: 'Typ',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'Pełna' ? 'primary' : 'secondary'}
          variant="outlined"
        />
      ),
    },
    { field: 'countedBy', headerName: 'Liczył', width: 140 },
    { field: 'locations', headerName: 'Lokalizacje', width: 110, type: 'number' },
    {
      field: 'differences',
      headerName: 'Różnice',
      width: 110,
      type: 'number',
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
      headerName: 'Status',
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

  const filtered = documents.filter((inv) =>
    inv.number.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Inwentaryzacja
        </Typography>
        {canCountInventory() && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
            Nowa inwentaryzacja
          </Button>
        )}
      </Box>

      <TextField
        placeholder="Szukaj po numerze..."
        size="small"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
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

      <DataGrid
        rows={filtered}
        columns={columns}
        pageSizeOptions={[10, 25]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        disableRowSelectionOnClick
        autoHeight
        sx={{ borderRadius: 2 }}
      />

      {/* Modal: Nowa inwentaryzacja */}
      <FormModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setSelectedLocations([]);
          setActualQuantities({});
        }}
        onSubmit={handleCreate}
        title="Nowa inwentaryzacja"
        maxWidth="md"
        submitLabel="Utwórz inwentaryzację"
      >
        <TextField
          select
          label="Typ inwentaryzacji"
          size="small"
          fullWidth
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          slotProps={{ select: { native: true } }}
          sx={{ mb: 2 }}
        >
          <option value="Pełna">Pełna</option>
          <option value="Wyrywkowa">Wyrywkowa</option>
        </TextField>

        <Alert severity="info" sx={{ mb: 2 }}>
          Magazynier lub Brygadzista wprowadza stan faktyczny. Zatwierdzenie różnic wymaga uprawnień
          Kierownika lub Administratora.
        </Alert>

        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            Lokalizacje do inwentaryzacji ({selectedLocations.length}/{AVAILABLE_LOCATIONS.length})
          </Typography>
          <Button size="small" onClick={handleSelectAll}>
            {selectedLocations.length === AVAILABLE_LOCATIONS.length
              ? 'Odznacz wszystkie'
              : 'Zaznacz wszystkie'}
          </Button>
        </Box>

        {selectedLocations.length === 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Zaznacz lokalizacje do inwentaryzacji
          </Alert>
        )}

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            maxHeight: 400,
            overflowY: 'auto',
          }}
        >
          {AVAILABLE_LOCATIONS.map((loc) => {
            const isSelected = selectedLocations.includes(loc.code);
            return (
              <Box
                key={loc.code}
                onClick={() => handleToggleLocation(loc.code)}
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
                    {loc.code}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {loc.sku} – {loc.product}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right', minWidth: 80 }}>
                  <Typography variant="caption" color="text.secondary">
                    Stan system.
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {loc.systemQty}
                  </Typography>
                </Box>
                {isSelected && (
                  <TextField
                    label="Stan faktyczny"
                    type="number"
                    size="small"
                    sx={{ width: 130 }}
                    value={actualQuantities[loc.code] || ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      setActualQuantities({ ...actualQuantities, [loc.code]: e.target.value });
                    }}
                    placeholder={String(loc.systemQty)}
                  />
                )}
              </Box>
            );
          })}
        </Box>
      </FormModal>

      {/* Dialog: Podgląd z porównaniem stanów */}
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
                    {selectedDoc.date}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Typ
                  </Typography>
                  <Chip
                    label={selectedDoc.type}
                    size="small"
                    color={selectedDoc.type === 'Pełna' ? 'primary' : 'secondary'}
                    variant="outlined"
                  />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Liczył
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {selectedDoc.countedBy || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Status
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

              {selectedDoc.differences > 0 && (
                <Alert severity="warning" icon={<Warning />}>
                  Znaleziono {selectedDoc.differences}{' '}
                  {selectedDoc.differences === 1 ? 'różnicę' : 'różnice'} wymagające korekty.
                </Alert>
              )}
              {selectedDoc.differences === 0 && (
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
                  gridTemplateColumns: '120px 1fr 100px 100px 100px',
                  gap: 1,
                  px: 1.5,
                  py: 1,
                  bgcolor: 'action.hover',
                  borderRadius: 2,
                }}
              >
                <Typography variant="caption" fontWeight={700}>
                  Lokalizacja
                </Typography>
                <Typography variant="caption" fontWeight={700}>
                  Produkt
                </Typography>
                <Typography variant="caption" fontWeight={700} sx={{ textAlign: 'right' }}>
                  Systemowy
                </Typography>
                <Typography variant="caption" fontWeight={700} sx={{ textAlign: 'right' }}>
                  Faktyczny
                </Typography>
                <Typography variant="caption" fontWeight={700} sx={{ textAlign: 'right' }}>
                  Różnica
                </Typography>
              </Box>

              {selectedDoc.items.map((item, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '120px 1fr 100px 100px 100px',
                    gap: 1,
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    bgcolor: item.difference !== 0 ? 'error.main' : 'transparent',
                    color: item.difference !== 0 ? 'white' : 'text.primary',
                    opacity: item.difference !== 0 ? 0.9 : 1,
                  }}
                >
                  <Typography variant="body2" fontWeight={600}>
                    {item.locationCode}
                  </Typography>
                  <Typography variant="body2">
                    {item.sku} – {item.productName}
                  </Typography>
                  <Typography variant="body2" sx={{ textAlign: 'right' }}>
                    {item.systemQuantity}
                  </Typography>
                  <Typography variant="body2" sx={{ textAlign: 'right' }} fontWeight={600}>
                    {item.actualQuantity}
                  </Typography>
                  <Typography variant="body2" sx={{ textAlign: 'right' }} fontWeight={700}>
                    {item.difference > 0 ? `+${item.difference}` : item.difference}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => {
              if (!selectedDoc) return;
              generateInventoryPDF(
                selectedDoc.number,
                selectedDoc.date,
                selectedDoc.type,
                DOCUMENT_STATUS_LABELS[selectedDoc.status],
                selectedDoc.items,
              );
              showSuccess('PDF inwentaryzacji został wygenerowany.');
            }}
          >
            Pobierz PDF
          </Button>
          {selectedDoc?.status === DocumentStatus.DRAFT && canApproveInventory() && (
            <Button
              variant="contained"
              color="warning"
              onClick={() => {
                setDocuments(
                  documents.map((d) =>
                    d.id === selectedDoc.id ? { ...d, status: DocumentStatus.CONFIRMED } : d,
                  ),
                );
                setDetailOpen(false);
                setSelectedDoc(null);
                showSuccess(`Inwentaryzacja ${selectedDoc.number} została zatwierdzona.`);
              }}
            >
              Zatwierdź inwentaryzację
            </Button>
          )}
          {selectedDoc?.status === DocumentStatus.DRAFT && !canApproveInventory() && (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Zatwierdzenie wymaga uprawnień Kierownika lub Administratora.
            </Typography>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventoryPage;
