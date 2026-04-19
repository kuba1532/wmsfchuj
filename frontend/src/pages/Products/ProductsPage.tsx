import { useState, useCallback } from 'react';
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
import { Add, Search, Edit, Visibility, Close } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePermissions } from '@/hooks/usePermissions';
import { useNotification } from '@/context/NotificationContext';
import { productSchema, type ProductFormData } from '@/utils/validators';
import FormField from '@/components/Form/FormField';
import ScanButton from '@/components/Scanner/ScanButton';
import { useExternalScanner } from '@/hooks/useExternalScanner';
import FormModal from '@/components/Modal/FormModal';
import PageHeader from '@/components/Table/PageHeader';
import { useProducts, type ProductItem } from '@/hooks/useProducts';

const ProductsPage = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { canCreate } = usePermissions();
  const { showError } = useNotification();

  const { products, total, isLoading, createProduct, updateProduct } = useProducts({
    search: debouncedSearch,
    pageSize: 100,
  });

  const createForm = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const editForm = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    clearTimeout((handleSearchChange as { timer?: ReturnType<typeof setTimeout> }).timer);
    (handleSearchChange as { timer?: ReturnType<typeof setTimeout> }).timer = setTimeout(() => {
      setDebouncedSearch(value);
    }, 400);
  }, []);

  const handleCreate = async (data: ProductFormData) => {
    setIsSubmitting(true);
    try {
      await createProduct({
        sku: data.sku,
        ean: data.ean || undefined,
        name: data.name,
        unit: data.unit,
      });
      setCreateOpen(false);
      createForm.reset();
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      showError(detail ?? 'Nie udało się dodać produktu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (data: ProductFormData) => {
    if (!selectedProduct) return;
    setIsSubmitting(true);
    try {
      await updateProduct(selectedProduct.id, {
        sku: data.sku,
        ean: data.ean || undefined,
        name: data.name,
        unit: data.unit,
        version: selectedProduct.version,
      });
      setEditOpen(false);
      setSelectedProduct(null);
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      showError(detail ?? 'Nie udało się zaktualizować produktu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (product: ProductItem) => {
    setSelectedProduct(product);
    editForm.reset({
      sku: product.sku,
      ean: product.ean ?? '',
      name: product.name,
      unit: product.unit,
    });
    setEditOpen(true);
  };

  const openDetail = (product: ProductItem) => {
    setSelectedProduct(product);
    setDetailOpen(true);
  };

  const columns: GridColDef[] = [
    { field: 'sku', headerName: 'Kod SKU', width: 130 },
    { field: 'ean', headerName: 'EAN', width: 140 },
    { field: 'name', headerName: 'Nazwa produktu', flex: 1, minWidth: 200 },
    { field: 'unit', headerName: 'Jednostka', width: 100 },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Aktywny' : 'Nieaktywny'}
          size="small"
          color={params.value ? 'success' : 'error'}
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

  const handleScan = useCallback((code: string) => {
    setSearch(code);
    setDebouncedSearch(code);
  }, []);

  useExternalScanner({ onScan: handleScan });

  return (
    <Box>
      <PageHeader
        title="Produkty"
        subtitle={`Łącznie rekordów: ${total}`}
        action={
          canCreate('dictionaries') ? (
            <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
              Dodaj produkt
            </Button>
          ) : null
        }
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <TextField
          placeholder="Szukaj po nazwie lub SKU..."
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
        <ScanButton onScan={handleScan} title="Skanuj SKU produktu" />
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <DataGrid
          rows={products}
          columns={columns}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
          autoHeight
          sx={{ borderRadius: 2 }}
        />
      )}

      <FormModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          createForm.reset();
        }}
        onSubmit={createForm.handleSubmit(handleCreate)}
        title="Dodaj nowy produkt"
        isSubmitting={isSubmitting}
      >
        <FormField
          label="Kod SKU"
          placeholder="np. SKU-009"
          error={createForm.formState.errors.sku}
          {...createForm.register('sku')}
        />
        <FormField
          label="Kod EAN"
          placeholder="np. 5901234123457"
          error={createForm.formState.errors.ean}
          {...createForm.register('ean')}
        />
        <FormField
          label="Nazwa produktu"
          placeholder="np. Zawór kulowy DN25"
          error={createForm.formState.errors.name}
          {...createForm.register('name')}
        />
        <FormField
          label="Jednostka miary"
          placeholder="np. szt, kg, m"
          error={createForm.formState.errors.unit}
          {...createForm.register('unit')}
        />
      </FormModal>

      <FormModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelectedProduct(null);
        }}
        onSubmit={editForm.handleSubmit(handleEdit)}
        title={`Edytuj: ${selectedProduct?.name || ''}`}
        submitLabel="Zapisz zmiany"
        isSubmitting={isSubmitting}
      >
        <FormField
          label="Kod SKU"
          error={editForm.formState.errors.sku}
          {...editForm.register('sku')}
        />
        <FormField
          label="Kod EAN"
          placeholder="np. 5901234123457"
          error={editForm.formState.errors.ean}
          {...editForm.register('ean')}
        />
        <FormField
          label="Nazwa produktu"
          error={editForm.formState.errors.name}
          {...editForm.register('name')}
        />
        <FormField
          label="Jednostka miary"
          error={editForm.formState.errors.unit}
          {...editForm.register('unit')}
        />
      </FormModal>

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
              {[
                { label: 'Kod SKU', value: selectedProduct.sku },
                { label: 'Kod EAN', value: selectedProduct.ean ?? '—' },
                { label: 'Nazwa', value: selectedProduct.name },
                { label: 'Jednostka miary', value: selectedProduct.unit },
                { label: 'Opis', value: selectedProduct.description ?? '—' },
              ].map(({ label, value }) => (
                <Box key={label}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {label}
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {value}
                    </Typography>
                  </Box>
                  <Divider sx={{ mt: 1 }} />
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {canCreate('dictionaries') && selectedProduct && (
            <Button
              variant="contained"
              startIcon={<Edit />}
              onClick={() => {
                setDetailOpen(false);
                openEdit(selectedProduct);
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
