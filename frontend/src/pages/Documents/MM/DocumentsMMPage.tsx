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
  CircularProgress,
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
import ScanButton from '@/components/Scanner/ScanButton';
import PageHeader from '@/components/Table/PageHeader';
import { useExternalScanner } from '@/hooks/useExternalScanner';
import { generateDocumentPDF } from '@/utils/pdfGenerator';
import { useDocuments, type DocumentItem } from '@/hooks/useDocuments';
import apiClient from '@/api/client';

interface ProductOption {
  id: number;
  sku: string;
  name: string;
}
interface LocationOption {
  id: number;
  code: string;
}

const DocumentsMMPage = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { canCreate } = usePermissions();
  const { showError } = useNotification();

  const { documents, total, isLoading, createMM, confirmDocument, generateTasks } = useDocuments({
    docType: 'MM',
    search: debouncedSearch,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DocumentMMFormData>({
    resolver: zodResolver(documentMMSchema),
    defaultValues: { fromLocation: '', toLocation: '', items: [{ productId: 0, quantity: 1 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (!createOpen) return;
    Promise.all([
      apiClient.get('/products?page=1&page_size=100'),
      apiClient.get('/locations?page=1&page_size=100'),
    ])
      .then(([pRes, lRes]) => {
        setProducts(pRes.data.items ?? []);
        setLocations(lRes.data.items ?? []);
      })
      .catch(() => showError('Nie udało się pobrać słowników.'));
  }, [createOpen]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    clearTimeout((handleSearchChange as { timer?: ReturnType<typeof setTimeout> }).timer);
    (handleSearchChange as { timer?: ReturnType<typeof setTimeout> }).timer = setTimeout(() => {
      setDebouncedSearch(value);
    }, 400);
  }, []);

  const handleCreate = async (data: DocumentMMFormData) => {
    setIsSubmitting(true);
    try {
      const fromLoc = locations.find((l) => l.code === data.fromLocation);
      const toLoc = locations.find((l) => l.code === data.toLocation);
      if (!fromLoc || !toLoc) {
        showError('Nieprawidłowa lokalizacja.');
        return;
      }
      await createMM({
        from_location_id: fromLoc.id,
        to_location_id: toLoc.id,
        items: data.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
      });
      setCreateOpen(false);
      reset({ fromLocation: '', toLocation: '', items: [{ productId: 0, quantity: 1 }] });
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      showError(detail ?? 'Nie udało się utworzyć dokumentu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async (id: number) => {
    try {
      await confirmDocument(id);
      setDetailOpen(false);
      setSelectedDoc(null);
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      showError(detail ?? 'Nie udało się zatwierdzić dokumentu.');
    }
  };

  const handleGenerateTasks = async (id: number) => {
    try {
      await generateTasks(id);
      setDetailOpen(false);
      setSelectedDoc(null);
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      showError(detail ?? 'Nie udało się wygenerować zadań.');
    }
  };

  const columns: GridColDef[] = [
    { field: 'number', headerName: 'Numer dokumentu', width: 170 },
    {
      field: 'created_at',
      headerName: 'Data',
      width: 120,
      valueFormatter: (value: string) =>
        value ? new Date(value).toLocaleDateString('pl-PL') : '—',
    },
    {
      field: 'from_location_code',
      headerName: 'Z lokalizacji',
      width: 150,
      valueGetter: (_value, row) =>
        row.from_location_code
          ? `${row.from_location_code}${row.from_location_id ? ` (#${row.from_location_id})` : ''}`
          : row.from_location_id
            ? `#${row.from_location_id}`
            : '—',
    },
    {
      field: 'to_location_code',
      headerName: 'Do lokalizacji',
      width: 150,
      valueGetter: (_value, row) =>
        row.to_location_code
          ? `${row.to_location_code}${row.to_location_id ? ` (#${row.to_location_id})` : ''}`
          : row.to_location_id
            ? `#${row.to_location_id}`
            : '—',
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

  const handleScan = useCallback((code: string) => {
    setSearch(code);
    setDebouncedSearch(code);
  }, []);

  useExternalScanner({ onScan: handleScan });

  return (
    <Box>
      <PageHeader
        title="Przesunięcia międzymagazynowe (MM)"
        subtitle={`Łącznie dokumentów: ${total}`}
        action={
          canCreate('documents') ? (
            <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
              Nowe przesunięcie
            </Button>
          ) : null
        }
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <TextField
          placeholder="Szukaj po numerze..."
          size="small"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          sx={{ width: 350 }}
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
        <ScanButton onScan={handleScan} title="Skanuj kod dokumentu" />
      </Box>

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
          autoHeight
          sx={{ borderRadius: 2 }}
        />
      )}

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
        isSubmitting={isSubmitting}
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
            {locations.map((l) => (
              <option key={l.id} value={l.code}>
                {l.code}
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
            {locations.map((l) => (
              <option key={l.id} value={l.code}>
                {l.code}
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
              {products.map((p) => (
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
              {[
                {
                  label: 'Data',
                  value: new Date(selectedDoc.created_at).toLocaleDateString('pl-PL'),
                },
                {
                  label: 'Z lokalizacji',
                  value:
                    selectedDoc.from_location_code ?? `#${selectedDoc.from_location_id ?? '—'}`,
                },
                {
                  label: 'Do lokalizacji',
                  value: selectedDoc.to_location_code ?? `#${selectedDoc.to_location_id ?? '—'}`,
                },
              ].map(({ label, value }) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography fontWeight={600}>{String(value)}</Typography>
                </Box>
              ))}
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
                Pozycje dokumentu ({selectedDoc.items?.length ?? 0})
              </Typography>
              {(selectedDoc.items ?? []).length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Brak pozycji.
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '120px 1fr 100px',
                    gap: 1,
                    px: 1.5,
                    py: 1,
                    bgcolor: 'action.hover',
                    borderRadius: 2,
                  }}
                >
                  {['SKU', 'Produkt', 'Ilość'].map((h) => (
                    <Typography key={h} variant="caption" fontWeight={700}>
                      {h}
                    </Typography>
                  ))}
                </Box>
              )}
              {selectedDoc.items?.map((it) => (
                <Box
                  key={it.id}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '120px 1fr 100px',
                    gap: 1,
                    px: 1.5,
                    py: 0.5,
                  }}
                >
                  <Typography variant="body2" fontWeight={600}>
                    {it.product?.sku ?? `#${it.product_id}`}
                  </Typography>
                  <Typography variant="body2">{it.product?.name ?? '—'}</Typography>
                  <Typography variant="body2" sx={{ textAlign: 'right' }}>
                    {it.quantity} {it.product?.unit ?? ''}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {selectedDoc?.status === DocumentStatus.DRAFT && (
            <Button
              variant="contained"
              color="warning"
              onClick={() => handleConfirm(selectedDoc.id)}
            >
              Zatwierdź
            </Button>
          )}
          {selectedDoc?.status === DocumentStatus.CONFIRMED && (
            <Button
              variant="contained"
              color="success"
              onClick={() => handleGenerateTasks(selectedDoc.id)}
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
                date: new Date(selectedDoc.created_at).toLocaleDateString('pl-PL'),
                header: [
                  {
                    label: 'Data',
                    value: new Date(selectedDoc.created_at).toLocaleDateString('pl-PL'),
                  },
                  {
                    label: 'Z lokalizacji',
                    value:
                      selectedDoc.from_location_code ??
                      `#${selectedDoc.from_location_id ?? '—'}`,
                  },
                  {
                    label: 'Do lokalizacji',
                    value:
                      selectedDoc.to_location_code ??
                      `#${selectedDoc.to_location_id ?? '—'}`,
                  },
                ],
                items:
                  selectedDoc.items?.map((it) => ({
                    sku: it.product?.sku ?? `#${it.product_id}`,
                    product: it.product?.name ?? '—',
                    quantity: it.quantity,
                  })) ?? [],
                status: DOCUMENT_STATUS_LABELS[selectedDoc.status],
              });
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
