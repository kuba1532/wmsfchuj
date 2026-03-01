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
import { documentPZSchema, type DocumentPZFormData } from '@/utils/validators';
import FormField from '@/components/Form/FormField';
import FormModal from '@/components/Modal/FormModal';
import { generateDocumentPDF } from '@/utils/pdfGenerator';

const MOCK_PRODUCTS = [
  { id: 1, sku: 'SKU-001', name: 'Śruba M8x40' },
  { id: 2, sku: 'SKU-002', name: 'Nakrętka M8' },
  { id: 3, sku: 'SKU-003', name: 'Olej hydrauliczny 5L' },
  { id: 4, sku: 'SKU-004', name: 'Filtr powietrza FP-200' },
  { id: 5, sku: 'SKU-005', name: 'Uszczelka gumowa 50mm' },
  { id: 6, sku: 'SKU-006', name: 'Łożysko kulkowe 6205' },
  { id: 7, sku: 'SKU-007', name: 'Pasek klinowy B-1250' },
  { id: 8, sku: 'SKU-008', name: 'Smar łożyskowy 400g' },
];

interface PZDocument {
  id: number;
  number: string;
  date: string;
  supplier: string;
  items: { productId: number; productName: string; quantity: number }[];
  status: DocumentStatus;
}

const INITIAL_PZ: PZDocument[] = [
  {
    id: 1,
    number: 'PZ/2025/001',
    date: '2025-06-15',
    supplier: 'Hurtownia ABC',
    items: [
      { productId: 1, productName: 'Śruba M8x40', quantity: 500 },
      { productId: 2, productName: 'Nakrętka M8', quantity: 1000 },
    ],
    status: DocumentStatus.COMPLETED,
  },
  {
    id: 2,
    number: 'PZ/2025/002',
    date: '2025-06-16',
    supplier: 'Dostawca XYZ',
    items: [{ productId: 3, productName: 'Olej hydrauliczny 5L', quantity: 50 }],
    status: DocumentStatus.CONFIRMED,
  },
  {
    id: 3,
    number: 'PZ/2025/003',
    date: '2025-06-17',
    supplier: 'Producent 123',
    items: [
      { productId: 4, productName: 'Filtr powietrza FP-200', quantity: 100 },
      { productId: 5, productName: 'Uszczelka gumowa 50mm', quantity: 300 },
    ],
    status: DocumentStatus.IN_PROGRESS,
  },
  {
    id: 4,
    number: 'PZ/2025/004',
    date: '2025-06-17',
    supplier: 'Hurtownia ABC',
    items: [{ productId: 6, productName: 'Łożysko kulkowe 6205', quantity: 200 }],
    status: DocumentStatus.DRAFT,
  },
  {
    id: 5,
    number: 'PZ/2025/005',
    date: '2025-06-18',
    supplier: 'Magazyn Centralny',
    items: [{ productId: 7, productName: 'Pasek klinowy B-1250', quantity: 80 }],
    status: DocumentStatus.DRAFT,
  },
  {
    id: 6,
    number: 'PZ/2025/006',
    date: '2025-06-18',
    supplier: 'Dostawca XYZ',
    items: [{ productId: 8, productName: 'Smar łożyskowy 400g', quantity: 30 }],
    status: DocumentStatus.CANCELLED,
  },
];

const DocumentsPZPage = () => {
  const [search, setSearch] = useState('');
  const [documents, setDocuments] = useState<PZDocument[]>(INITIAL_PZ);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<PZDocument | null>(null);
  const { canCreate } = usePermissions();
  const { showSuccess } = useNotification();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DocumentPZFormData>({
    resolver: zodResolver(documentPZSchema),
    defaultValues: {
      supplier: '',
      items: [{ productId: 0, quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const handleCreate = (data: DocumentPZFormData) => {
    const nextNum = documents.length + 1;
    const newDoc: PZDocument = {
      id: nextNum,
      number: `PZ/2025/${String(nextNum).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      supplier: data.supplier,
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
    reset({ supplier: '', items: [{ productId: 0, quantity: 1 }] });
    showSuccess(`Dokument ${newDoc.number} został utworzony.`);
  };

  const openDetail = (doc: PZDocument) => {
    setSelectedDoc(doc);
    setDetailOpen(true);
  };

  const columns: GridColDef[] = [
    { field: 'number', headerName: 'Numer dokumentu', width: 170 },
    { field: 'date', headerName: 'Data', width: 120 },
    { field: 'supplier', headerName: 'Dostawca', flex: 1, minWidth: 160 },
    {
      field: 'items',
      headerName: 'Pozycje',
      width: 90,
      type: 'number',
      valueGetter: (_value: unknown, row: PZDocument) => row.items.length,
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
      filterable: false,
      renderCell: (params) => (
        <Tooltip title="Podgląd">
          <IconButton size="small" onClick={() => openDetail(params.row)}>
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  const filtered = documents.filter(
    (doc) =>
      doc.number.toLowerCase().includes(search.toLowerCase()) ||
      doc.supplier.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Przyjęcia zewnętrzne (PZ)
        </Typography>
        {canCreate('documents') && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
            Nowe przyjęcie
          </Button>
        )}
      </Box>

      <TextField
        placeholder="Szukaj po numerze lub dostawcy..."
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
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        disableRowSelectionOnClick
        autoHeight
        sx={{ borderRadius: 2 }}
      />

      {/* Modal: Nowe przyjęcie */}
      <FormModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          reset({ supplier: '', items: [{ productId: 0, quantity: 1 }] });
        }}
        onSubmit={handleSubmit(handleCreate)}
        title="Nowe przyjęcie zewnętrzne (PZ)"
        maxWidth="md"
        submitLabel="Utwórz dokument"
      >
        <FormField
          label="Dostawca"
          placeholder="np. Hurtownia ABC"
          error={errors.supplier}
          {...register('supplier')}
        />

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          Pozycje dokumentu
        </Typography>
        {errors.items?.root && (
          <Typography variant="caption" color="error" sx={{ mb: 1, display: 'block' }}>
            {errors.items.root.message}
          </Typography>
        )}

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

      {/* Dialog: Podgląd dokumentu */}
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
                <Typography variant="body1" fontWeight={600}>
                  {selectedDoc.date}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Dostawca
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {selectedDoc.supplier}
                </Typography>
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
                showSuccess(
                  `Zadania rozmieszczania dla ${selectedDoc.number} zostały wygenerowane.`,
                );
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
                type: 'PZ',
                number: selectedDoc.number,
                date: selectedDoc.date,
                header: [
                  { label: 'Data', value: selectedDoc.date },
                  { label: 'Dostawca', value: selectedDoc.supplier },
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

export default DocumentsPZPage;
