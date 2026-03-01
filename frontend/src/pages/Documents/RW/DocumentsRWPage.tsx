import { useEffect, useMemo, useState } from 'react';
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
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Add, Search, Visibility, Close, Download, Delete, Refresh } from '@mui/icons-material';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
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

// Zakładam, że masz axios client z interceptorem auth w tym miejscu.
// Jeśli masz inną ścieżkę (np. "@/api/axios"), podmień import:
import api from '@/api/client';

/**
 * Jeśli listowanie PZ jest pod innym URL-em, zmień tylko to:
 * - częsty wariant: "/api/v1/documents?type=PZ"
 */
const PZ_LIST_URL = '/api/v1/documents/pz';
const PZ_CREATE_URL = '/api/v1/documents/pz';
const PRODUCTS_LIST_URL = '/api/v1/products';

type ApiProduct = {
  id: number;
  sku: string;
  name: string;
  unit?: string;
};

type ApiPZItem = {
  product_id: number;
  quantity: number;
  // backend czasem zwraca też nazwę – jeśli nie, my ją domapujemy z produktów
  product_name?: string;
  sku?: string;
};

type ApiPZDocument = {
  id: number;
  number: string;
  type?: string;
  status: string;
  supplier: string;
  created_at?: string;
  date?: string; // jeśli backend ma pole date
  items: ApiPZItem[];
};

type PZRow = {
  id: number;
  number: string;
  date: string;
  supplier: string;
  status: DocumentStatus;
  items: { productId: number; productName: string; quantity: number }[];
};

const safeDate = (doc: ApiPZDocument): string => {
  // preferuj "date", jeśli backend ma, inaczej bierz created_at
  const raw = doc.date ?? doc.created_at ?? '';
  if (!raw) return '-';
  // jeśli ISO: "2026-03-01T15:29:11.904Z" → "2026-03-01"
  return raw.includes('T') ? raw.split('T')[0] : raw;
};

const DocumentsPZPage = () => {
  const [search, setSearch] = useState('');
  const [documents, setDocuments] = useState<PZRow[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<PZRow | null>(null);

  const { canCreate } = usePermissions();
  const { showSuccess, showError } = useNotification();

  const productsById = useMemo(() => {
    const m = new Map<number, ApiProduct>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const mapApiDocToRow = (doc: ApiPZDocument): PZRow => {
    const status = (doc.status as DocumentStatus) ?? DocumentStatus.DRAFT;

    return {
      id: doc.id,
      number: doc.number,
      date: safeDate(doc),
      supplier: doc.supplier,
      status,
      items: (doc.items ?? []).map((it) => {
        const p = productsById.get(it.product_id);
        return {
          productId: it.product_id,
          productName: it.product_name ?? p?.name ?? `Produkt #${it.product_id}`,
          quantity: it.quantity,
        };
      }),
    };
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsRes, docsRes] = await Promise.all([
        api.get<ApiProduct[]>(PRODUCTS_LIST_URL),
        api.get<ApiPZDocument[]>(PZ_LIST_URL),
      ]);

      const prod = productsRes.data ?? [];
      setProducts(prod);

      // mapowanie dokumentów po ustawieniu produktów
      const docs = docsRes.data ?? [];
      // tymczasowo mapuj po prod mapie z response
      const map = new Map<number, ApiProduct>();
      prod.forEach((p) => map.set(p.id, p));

      const mapped: PZRow[] = docs.map((d) => {
        const status = (d.status as DocumentStatus) ?? DocumentStatus.DRAFT;
        return {
          id: d.id,
          number: d.number,
          date: safeDate(d),
          supplier: d.supplier,
          status,
          items: (d.items ?? []).map((it) => {
            const p = map.get(it.product_id);
            return {
              productId: it.product_id,
              productName: it.product_name ?? p?.name ?? `Produkt #${it.product_id}`,
              quantity: it.quantity,
            };
          }),
        };
      });

      setDocuments(mapped);
    } catch (e: any) {
      showError(
        e?.response?.data?.detail?.toString?.() ||
          e?.message ||
          'Nie udało się pobrać danych (produkty/dokumenty PZ).',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = useForm<DocumentPZFormData>({
    resolver: zodResolver(documentPZSchema),
    defaultValues: {
      supplier: '',
      items: [{ productId: 0, quantity: 1 }],
    },
    mode: 'onSubmit',
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const closeCreate = () => {
    setCreateOpen(false);
    reset({ supplier: '', items: [{ productId: 0, quantity: 1 }] });
  };

  const handleCreate = async (data: DocumentPZFormData) => {
    try {
      // Swagger oczekuje: supplier, items[{product_id, quantity}]
      const payload = {
        supplier: data.supplier,
        items: data.items.map((i) => ({
          product_id: i.productId,
          quantity: i.quantity,
        })),
      };

      const res = await api.post<ApiPZDocument>(PZ_CREATE_URL, payload);

      showSuccess(`Dokument ${res.data.number} został utworzony.`);
      closeCreate();

      // Najpewniejsze: odśwież listę z backendu (żeby tabela = DB)
      await loadData();
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail?.toString?.() ||
        e?.response?.data?.message?.toString?.() ||
        e?.message ||
        'Nie udało się utworzyć dokumentu PZ.';
      showError(msg);
    }
  };

  const openDetail = (doc: PZRow) => {
    setSelectedDoc(doc);
    setDetailOpen(true);
  };

  const columns: GridColDef[] = [
    { field: 'number', headerName: 'Numer dokumentu', width: 170 },
    { field: 'date', headerName: 'Data', width: 120 },
    { field: 'supplier', headerName: 'Dostawca', flex: 1, minWidth: 160 },
    {
      field: 'itemsCount',
      headerName: 'Pozycje',
      width: 90,
      type: 'number',
      valueGetter: (_value: unknown, row: PZRow) => row.items.length,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => {
        const st = params.value as DocumentStatus;
        return (
          <Chip
            label={DOCUMENT_STATUS_LABELS[st] ?? st}
            size="small"
            sx={{
              bgcolor: DOCUMENT_STATUS_COLORS[st] ?? 'grey.700',
              color: 'white',
              fontWeight: 600,
            }}
          />
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Akcje',
      width: 90,
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

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return documents;
    return documents.filter(
      (doc) => doc.number.toLowerCase().includes(s) || doc.supplier.toLowerCase().includes(s),
    );
  }, [documents, search]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Przyjęcia zewnętrzne (PZ)
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={loadData} disabled={loading}>
            Odśwież
          </Button>

          {canCreate('documents') && (
            <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
              Nowe przyjęcie
            </Button>
          )}
        </Box>
      </Box>

      <TextField
        placeholder="Szukaj po numerze lub dostawcy..."
        size="small"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2, width: 380 }}
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
        loading={loading}
        sx={{ borderRadius: 2 }}
      />

      {/* Modal: Nowe przyjęcie */}
      <FormModal
        open={createOpen}
        onClose={closeCreate}
        onSubmit={handleSubmit(handleCreate)}
        title="Nowe przyjęcie zewnętrzne (PZ)"
        maxWidth="md"
        submitLabel={isSubmitting ? 'Zapisywanie...' : 'Utwórz dokument'}
        submitDisabled={isSubmitting}
      >
        {loading && products.length === 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              Ładowanie produktów...
            </Typography>
          </Box>
        ) : null}

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
            {/* Controller -> zawsze dostaje control, więc nie ma "control is null" */}
            <Controller
              control={control}
              name={`items.${index}.productId`}
              render={({ field: rhfField }) => (
                <TextField
                  select
                  label="Produkt"
                  size="small"
                  fullWidth
                  value={rhfField.value ?? 0}
                  onChange={(e) => rhfField.onChange(Number(e.target.value))}
                  error={!!errors.items?.[index]?.productId}
                  helperText={errors.items?.[index]?.productId?.message}
                >
                  <MenuItem value={0} disabled>
                    -- Wybierz --
                  </MenuItem>
                  {products.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.sku} – {p.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <TextField
              label="Ilość"
              type="number"
              size="small"
              sx={{ minWidth: 140 }}
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
                  label={DOCUMENT_STATUS_LABELS[selectedDoc.status] ?? selectedDoc.status}
                  size="small"
                  sx={{
                    bgcolor: DOCUMENT_STATUS_COLORS[selectedDoc.status] ?? 'grey.700',
                    color: 'white',
                    fontWeight: 600,
                  }}
                />
              </Box>

              <Divider />

              <Typography variant="subtitle2" fontWeight={600}>
                Pozycje
              </Typography>

              {selectedDoc.items.map((item, i) => {
                const p = productsById.get(item.productId);
                const unit = p?.unit ?? 'szt';
                return (
                  <Box
                    key={`${item.productId}-${i}`}
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
                      {item.quantity} {unit}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
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
                status: DOCUMENT_STATUS_LABELS[selectedDoc.status] ?? selectedDoc.status,
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
