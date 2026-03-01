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
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Add, Search, Delete, Visibility, Close, Download } from '@mui/icons-material';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  DocumentStatus,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
} from '@/constants/documentStatuses';
import { usePermissions } from '@/hooks/usePermissions';
import { useNotification } from '@/context/NotificationContext';
import { documentMMSchema, type DocumentMMFormData } from '@/utils/validators';
import FormModal from '@/components/Modal/FormModal';
import { generateDocumentPDF } from '@/utils/pdfGenerator';

const MOCK_PRODUCTS = [
  { id: 1, sku: 'SKU-001', name: 'Śruba M8x40' },
  { id: 2, sku: 'SKU-002', name: 'Nakrętka M8' },
  { id: 3, sku: 'SKU-003', name: 'Olej hydrauliczny 5L' },
  { id: 4, sku: 'SKU-004', name: 'Filtr powietrza FP-200' },
  { id: 5, sku: 'SKU-005', name: 'Uszczelka gumowa 50mm' },
];

const MOCK_LOCATIONS = [
  'R1-A-01',
  'R1-A-02',
  'R1-B-01',
  'R1-B-02',
  'R2-A-03',
  'R2-C-01',
  'R3-B-02',
  'R4-A-01',
  'R4-B-03',
  'BUFOR-01',
];

interface MMDocument {
  id: number;
  number: string;
  date: string;
  fromLocation: string;
  toLocation: string;
  items: { productId: number; productName: string; quantity: number }[];
  status: DocumentStatus;
}

const INITIAL_MM: MMDocument[] = [
  {
    id: 1,
    number: 'MM/2025/001',
    date: '2025-06-14',
    fromLocation: 'R1-A-01',
    toLocation: 'R3-B-02',
    items: [{ productId: 1, productName: 'Śruba M8x40', quantity: 200 }],
    status: DocumentStatus.COMPLETED,
  },
  {
    id: 2,
    number: 'MM/2025/002',
    date: '2025-06-15',
    fromLocation: 'R2-A-03',
    toLocation: 'R4-C-01',
    items: [{ productId: 4, productName: 'Filtr powietrza FP-200', quantity: 50 }],
    status: DocumentStatus.IN_PROGRESS,
  },
  {
    id: 3,
    number: 'MM/2025/003',
    date: '2025-06-16',
    fromLocation: 'R4-B-03',
    toLocation: 'R1-B-01',
    items: [{ productId: 3, productName: 'Olej hydrauliczny 5L', quantity: 30 }],
    status: DocumentStatus.DRAFT,
  },
  {
    id: 4,
    number: 'MM/2025/004',
    date: '2025-06-17',
    fromLocation: 'BUFOR-01',
    toLocation: 'R2-C-01',
    items: [{ productId: 5, productName: 'Uszczelka gumowa 50mm', quantity: 500 }],
    status: DocumentStatus.CONFIRMED,
  },
];

const DocumentsMMPage = () => {
  const [search, setSearch] = useState('');
  const [documents, setDocuments] = useState<MMDocument[]>(INITIAL_MM);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<MMDocument | null>(null);
  const { canCreate } = usePermissions();
  const { showSuccess } = useNotification();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DocumentMMFormData>({
    resolver: zodResolver(documentMMSchema),
    defaultValues: {
      fromLocation: '',
      toLocation: '',
      items: [{ productId: 0, quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const handleCreate = (data: DocumentMMFormData) => {
    const nextNum = documents.length + 1;
    const newDoc: MMDocument = {
      id: nextNum,
      number: `MM/2025/${String(nextNum).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      fromLocation: data.fromLocation,
      toLocation: data.toLocation,
      items: data.items.map((item) => {
        const product = MOCK_PRODUCTS.find((p) => p.id === item.productId);
        return {
          productId: item.productId,
          productName: product?.name || 'Nieznany',
          quantity: item.quantity,
        };
      }),
      status: DocumentStatus.DRAFT,
    };
    setDocuments([...documents, newDoc]);
    setCreateOpen(false);
    reset({ fromLocation: '', toLocation: '', items: [{ productId: 0, quantity: 1 }] });
    showSuccess(`Dokument ${newDoc.number} został utworzony.`);
  };

  const columns: GridColDef[] = [
    { field: 'number', headerName: 'Numer dokumentu', width: 170 },
    { field: 'date', headerName: 'Data', width: 120 },
    { field: 'fromLocation', headerName: 'Z lokalizacji', width: 130 },
    { field: 'toLocation', headerName: 'Do lokalizacji', width: 130 },
    {
      field: 'items',
      headerName: 'Pozycje',
      width: 90,
      type: 'number',
      valueGetter: (_value: unknown, row: MMDocument) => row.items.length,
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

  const filtered = documents.filter((doc) =>
    doc.number.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Przesunięcia międzymagazynowe (MM)
        </Typography>
        {canCreate('documents') && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
            Nowe przesunięcie
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

      <FormModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          reset({ fromLocation: '', toLocation: '', items: [{ productId: 0, quantity: 1 }] });
        }}
        onSubmit={handleSubmit(handleCreate)}
        title="Nowe przesunięcie (MM)"
        maxWidth="md"
        submitLabel="Utwórz dokument"
      >
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            select
            label="Z lokalizacji"
            size="small"
            fullWidth
            error={!!errors.fromLocation}
            helperText={errors.fromLocation?.message}
            {...register('fromLocation')}
            slotProps={{ select: { native: true } }}
          >
            <option value="">-- Wybierz --</option>
            {MOCK_LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </TextField>
          <TextField
            select
            label="Do lokalizacji"
            size="small"
            fullWidth
            error={!!errors.toLocation}
            helperText={errors.toLocation?.message}
            {...register('toLocation')}
            slotProps={{ select: { native: true } }}
          >
            <option value="">-- Wybierz --</option>
            {MOCK_LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </TextField>
        </Box>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          Pozycje
        </Typography>

        {fields.map((field, index) => (
          <Box key={field.id} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 1 }}>
            <TextField
              select
              label="Produkt"
              size="small"
              fullWidth
              defaultValue={field.productId || ''}
              error={!!errors.items?.[index]?.productId}
              helperText={errors.items?.[index]?.productId?.message}
              {...register(`items.${index}.productId`, { valueAsNumber: true })}
              slotProps={{ select: { native: true } }}
            >
              <option value="">-- Wybierz --</option>
              {MOCK_PRODUCTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} – {p.name}
                </option>
              ))}
            </TextField>
            <TextField
              label="Ilość"
              type="number"
              size="small"
              sx={{ minWidth: 120 }}
              error={!!errors.items?.[index]?.quantity}
              helperText={errors.items?.[index]?.quantity?.message}
              {...register(`items.${index}.quantity`, { valueAsNumber: true })}
            />
            <IconButton
              color="error"
              onClick={() => remove(index)}
              disabled={fields.length <= 1}
              sx={{ mt: 0.5 }}
            >
              <Delete />
            </IconButton>
          </Box>
        ))}
        <Button
          variant="outlined"
          size="small"
          startIcon={<Add />}
          onClick={() => append({ productId: 0, quantity: 1 })}
          sx={{ mt: 1 }}
        >
          Dodaj pozycję
        </Button>
      </FormModal>

      <Dialog
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedDoc(null);
        }}
        maxWidth="sm"
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Data
                </Typography>
                <Typography fontWeight={600}>{selectedDoc.date}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Z lokalizacji
                </Typography>
                <Typography fontWeight={600}>{selectedDoc.fromLocation}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Do lokalizacji
                </Typography>
                <Typography fontWeight={600}>{selectedDoc.toLocation}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={DOCUMENT_STATUS_LABELS[selectedDoc.status]}
                  size="small"
                  sx={{
                    bgcolor: DOCUMENT_STATUS_COLORS[selectedDoc.status],
                    color: 'white',
                    fontWeight: 600,
                  }}
                />
              </Box>
              <Divider />
              <Typography variant="subtitle2" fontWeight={600}>
                Pozycje
              </Typography>
              {selectedDoc.items.map((item, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    bgcolor: 'action.hover',
                    p: 1.5,
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body2">{item.productName}</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {item.quantity} szt
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {selectedDoc?.status === DocumentStatus.CONFIRMED && (
            <Button
              variant="contained"
              color="success"
              onClick={() => {
                setDocuments(
                  documents.map((d) =>
                    d.id === selectedDoc.id ? { ...d, status: DocumentStatus.IN_PROGRESS } : d,
                  ),
                );
                setDetailOpen(false);
                setSelectedDoc(null);
                showSuccess(`Zadania przesunięcia dla ${selectedDoc.number} zostały wygenerowane.`);
              }}
            >
              Generuj zadania
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={() => {
              if (!selectedDoc) return;
              generateDocumentPDF({
                type: 'MM',
                number: selectedDoc.number,
                date: selectedDoc.date,
                header: [
                  { label: 'Data', value: selectedDoc.date },
                  { label: 'Z lokalizacji', value: selectedDoc.fromLocation },
                  { label: 'Do lokalizacji', value: selectedDoc.toLocation },
                ],
                items: selectedDoc.items.map((i) => ({
                  product: i.productName,
                  quantity: i.quantity,
                })),
                status: DOCUMENT_STATUS_LABELS[selectedDoc.status],
              });
              showSuccess('PDF został wygenerowany.');
            }}
          >
            Pobierz PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentsMMPage;
