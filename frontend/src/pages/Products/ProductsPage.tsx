import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  CircularProgress,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Add, Search, Edit, Visibility, Close, Refresh } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { usePermissions } from '@/hooks/usePermissions';
import { useNotification } from '@/context/NotificationContext';
import { productSchema, type ProductFormData } from '@/utils/validators';
import FormField from '@/components/Form/FormField';
import FormModal from '@/components/Modal/FormModal';
import apiClient from '@/api/client';

interface Product {
  id: number;
  sku: string;
  name: string;
  unit: string;
  stock?: number;
}

type ProductsListResponse = {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

const MAX_PAGE_SIZE_BACKEND = 100;

function toErrorMessage(err: any): string {
  const detail = err?.response?.data?.detail;

  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail)) {
    const msgs = detail
      .map((d) => (typeof d?.msg === 'string' ? d.msg : null))
      .filter(Boolean) as string[];
    if (msgs.length) return msgs.join(', ');
  }

  return err?.message || 'Wystąpił błąd.';
}

const ProductsPage = () => {
  const { canCreate } = usePermissions();
  const { showSuccess, showError } = useNotification();

  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<Product[]>([]);
  const [rowCount, setRowCount] = useState(0);

  const [page, setPage] = useState(0); // DataGrid: 0-based
  const [pageSize, setPageSize] = useState(10);

  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // ✅ ważne: defaultValues, żeby FormField/Controller nie dostał undefined
  const createForm = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: { sku: '', name: '', unit: '' },
  });

  const editForm = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: { sku: '', name: '', unit: '' },
  });

  // opcjonalnie: DEV StrictMode
  const didInitialFetch = useRef(false);

  const effectivePageSize = useMemo(
    () => Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE_BACKEND),
    [pageSize],
  );

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<ProductsListResponse>('/products', {
        params: {
          page: page + 1, // backend: 1-based
          page_size: effectivePageSize, // <= 100
          search: search.trim() || undefined,
        },
      });

      const data = res.data;
      setRows(
        (data.items || []).map((p) => ({
          ...p,
          stock: typeof p.stock === 'number' ? p.stock : 0,
        })),
      );
      setRowCount(data.total ?? 0);
    } catch (e: any) {
      showError(toErrorMessage(e));
      setRows([]);
      setRowCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!didInitialFetch.current) {
      didInitialFetch.current = true;
      fetchProducts();
      return;
    }
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, effectivePageSize, search]);

  const handleCreate = async (data: ProductFormData) => {
    try {
      await apiClient.post('/products', {
        sku: data.sku,
        name: data.name,
        unit: data.unit,
      });

      showSuccess(`Produkt "${data.name}" został dodany.`);
      setCreateOpen(false);
      createForm.reset({ sku: '', name: '', unit: '' });

      setPage(0);
      fetchProducts();
    } catch (e: any) {
      showError(toErrorMessage(e));
    }
  };

  const handleEdit = async (data: ProductFormData) => {
    if (!selectedProduct) return;

    try {
      await apiClient.patch(`/products/${selectedProduct.id}`, {
        sku: data.sku,
        name: data.name,
        unit: data.unit,
      });

      showSuccess(`Produkt "${data.name}" został zaktualizowany.`);
      setEditOpen(false);
      setSelectedProduct(null);

      fetchProducts();
    } catch (e: any) {
      showError(toErrorMessage(e));
    }
  };

  const openEdit = (product: Product) => {
    setSelectedProduct(product);
    editForm.reset({ sku: product.sku, name: product.name, unit: product.unit });
    setEditOpen(true);
  };

  const openDetail = (product: Product) => {
    setSelectedProduct(product);
    setDetailOpen(true);
  };

  const columns: GridColDef[] = [
    { field: 'sku', headerName: 'Kod SKU', width: 130 },
    { field: 'name', headerName: 'Nazwa produktu', flex: 1, minWidth: 220 },
    { field: 'unit', headerName: 'Jednostka', width: 110 },
    {
      field: 'stock',
      headerName: 'Stan łączny',
      width: 130,
      type: 'number',
      renderCell: (params) => (
        <Chip
          label={params.value ?? 0}
          size="small"
          color={(params.value ?? 0) > 0 ? 'success' : 'error'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Akcje',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Podgląd">
            <IconButton size="small" onClick={() => openDetail(params.row)}>
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>

          {canCreate('dictionaries') && (
            <Tooltip title="Edytuj">
              <IconButton size="small" onClick={() => openEdit(params.row)}>
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Produkty
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={18} /> : <Refresh />}
            onClick={fetchProducts}
            disabled={loading}
          >
            Odśwież
          </Button>

          {canCreate('dictionaries') && (
            <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
              Dodaj produkt
            </Button>
          )}
        </Box>
      </Box>

      <TextField
        placeholder="Szukaj po nazwie lub SKU..."
        size="small"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(0);
        }}
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
        rows={rows}
        columns={columns}
        loading={loading}
        rowCount={rowCount}
        paginationMode="server"
        paginationModel={{ page, pageSize: effectivePageSize }}
        onPaginationModelChange={(model) => {
          setPage(model.page);
          setPageSize(model.pageSize);
        }}
        pageSizeOptions={[10, 25, 50, 100]}
        disableRowSelectionOnClick
        autoHeight
        sx={{ borderRadius: 2 }}
      />

      {/* ✅ Modal: Dodaj produkt (POPRAWIONE: name + control) */}
      <FormModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          createForm.reset({ sku: '', name: '', unit: '' });
        }}
        onSubmit={createForm.handleSubmit(handleCreate)}
        title="Dodaj nowy produkt"
        submitLabel="Dodaj"
      >
        <FormField
          name="sku"
          control={createForm.control}
          label="Kod SKU"
          placeholder="np. SKU-009"
          error={!!createForm.formState.errors.sku}
          helperText={createForm.formState.errors.sku?.message}
        />

        <FormField
          name="name"
          control={createForm.control}
          label="Nazwa produktu"
          placeholder="np. Zawór kulowy DN25"
          error={!!createForm.formState.errors.name}
          helperText={createForm.formState.errors.name?.message}
        />

        <FormField
          name="unit"
          control={createForm.control}
          label="Jednostka miary"
          placeholder="np. szt, kg, m"
          error={!!createForm.formState.errors.unit}
          helperText={createForm.formState.errors.unit?.message}
        />
      </FormModal>

      {/* ✅ Modal: Edytuj produkt (POPRAWIONE: name + control) */}
      <FormModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelectedProduct(null);
        }}
        onSubmit={editForm.handleSubmit(handleEdit)}
        title={`Edytuj: ${selectedProduct?.name || ''}`}
        submitLabel="Zapisz"
      >
        <FormField
          name="sku"
          control={editForm.control}
          label="Kod SKU"
          error={!!editForm.formState.errors.sku}
          helperText={editForm.formState.errors.sku?.message}
        />

        <FormField
          name="name"
          control={editForm.control}
          label="Nazwa produktu"
          error={!!editForm.formState.errors.name}
          helperText={editForm.formState.errors.name?.message}
        />

        <FormField
          name="unit"
          control={editForm.control}
          label="Jednostka miary"
          error={!!editForm.formState.errors.unit}
          helperText={editForm.formState.errors.unit?.message}
        />
      </FormModal>

      {/* Dialog: Podgląd szczegółów */}
      <Dialog
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedProduct(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Box fontWeight={600}>Szczegóły produktu</Box>
          <IconButton
            size="small"
            onClick={() => {
              setDetailOpen(false);
              setSelectedProduct(null);
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          {selectedProduct && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Kod SKU
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {selectedProduct.sku}
                </Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Nazwa
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {selectedProduct.name}
                </Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Jednostka miary
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {selectedProduct.unit}
                </Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Stan łączny
                </Typography>
                <Chip
                  label={selectedProduct.stock ?? 0}
                  color={(selectedProduct.stock ?? 0) > 0 ? 'success' : 'error'}
                  variant="outlined"
                />
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          {canCreate('dictionaries') && (
            <Button
              variant="contained"
              startIcon={<Edit />}
              onClick={() => {
                setDetailOpen(false);
                if (selectedProduct) openEdit(selectedProduct);
              }}
            >
              Edytuj
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductsPage;
