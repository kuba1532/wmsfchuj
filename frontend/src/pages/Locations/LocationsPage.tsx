import { useState, useCallback } from 'react';
import {
  Box,
  Button,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Add, Search, Edit } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LocationType, LOCATION_TYPE_LABELS } from '@/constants/locationTypes';
import { usePermissions } from '@/hooks/usePermissions';
import { useNotification } from '@/context/NotificationContext';
import { locationSchema, type LocationFormData } from '@/utils/validators';
import FormField from '@/components/Form/FormField';
import FormSelect from '@/components/Form/FormSelect';
import FormModal from '@/components/Modal/FormModal';
import ScanButton from '@/components/Scanner/ScanButton';
import PageHeader from '@/components/Table/PageHeader';
import { dataGridLocaleText } from '@/constants/dataGridLocale';
import { useExternalScanner } from '@/hooks/useExternalScanner';
import { useLocations, type LocationItem } from '@/hooks/useLocations';

const TYPE_COLORS: Record<LocationType, string> = {
  [LocationType.BUFFER]: '#FF8F00',
  [LocationType.STORAGE]: '#1565C0',
  [LocationType.PICKING_ZONE]: '#7B1FA2',
};

const LOCATION_TYPE_OPTIONS = Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const LocationsPage = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { canCreate } = usePermissions();
  const { showError } = useNotification();

  const { locations, total, isLoading, createLocation, updateLocation } = useLocations({
    search: debouncedSearch,
    pageSize: 100,
  });

  const createForm = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: { code: '', type: '', row: '', rack: '', shelf: '' },
  });

  const editForm = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
  });

  // Debounce wyszukiwania — nie wysyłamy requestu przy każdym znaku
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    clearTimeout((handleSearchChange as { timer?: ReturnType<typeof setTimeout> }).timer);
    (handleSearchChange as { timer?: ReturnType<typeof setTimeout> }).timer = setTimeout(() => {
      setDebouncedSearch(value);
    }, 400);
  }, []);

  const handleCreate = async (data: LocationFormData) => {
    setIsSubmitting(true);
    try {
      await createLocation({
        code: data.code,
        type: data.type,
        row: data.row || undefined,
        rack: data.rack || undefined,
        shelf: data.shelf || undefined,
      });
      setCreateOpen(false);
      createForm.reset();
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      showError(detail ?? 'Nie udało się dodać lokalizacji.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (data: LocationFormData) => {
    if (!selectedLocation) return;
    setIsSubmitting(true);
    try {
      await updateLocation(selectedLocation.id, {
        code: data.code,
        type: data.type,
        row: data.row || undefined,
        rack: data.rack || undefined,
        shelf: data.shelf || undefined,
        version: selectedLocation.version,
      });
      setEditOpen(false);
      setSelectedLocation(null);
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      showError(detail ?? 'Nie udało się zaktualizować lokalizacji.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (location: LocationItem) => {
    setSelectedLocation(location);
    editForm.reset({
      code: location.code,
      type: location.type,
      row: location.row ?? '',
      rack: location.rack ?? '',
      shelf: location.shelf ?? '',
    });
    setEditOpen(true);
  };

  const bufferCount = locations.filter((l) => l.type === LocationType.BUFFER).length;

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 80 },
    { field: 'code', headerName: 'Kod lokalizacji', width: 150 },
    {
      field: 'type',
      headerName: 'Typ',
      width: 160,
      renderCell: (params) => (
        <Chip
          label={LOCATION_TYPE_LABELS[params.value as LocationType]}
          size="small"
          sx={{
            bgcolor: TYPE_COLORS[params.value as LocationType],
            color: 'white',
            fontWeight: 600,
          }}
        />
      ),
    },
    { field: 'row', headerName: 'Rząd', width: 80 },
    { field: 'rack', headerName: 'Regał', width: 80 },
    { field: 'shelf', headerName: 'Półka', width: 80 },
    {
      field: 'is_active',
      headerName: 'Aktywność',
      width: 110,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Aktywna' : 'Nieaktywna'}
          size="small"
          color={params.value ? 'success' : 'error'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Akcje',
      width: 70,
      sortable: false,
      filterable: false,
      renderCell: (params) =>
        canCreate('dictionaries') ? (
          <Tooltip title="Edytuj">
            <IconButton size="small" onClick={() => openEdit(params.row)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null,
    },
  ];

  const renderForm = (form: typeof createForm) => (
    <>
      <FormField
        label="Kod lokalizacji"
        placeholder="np. R5-A-01"
        error={form.formState.errors.code}
        {...form.register('code')}
      />
      <Controller
        name="type"
        control={form.control}
        render={({ field }) => (
          <FormSelect
            label="Typ lokalizacji"
            options={LOCATION_TYPE_OPTIONS}
            error={form.formState.errors.type}
            {...field}
          />
        )}
      />
      <Box sx={{ display: 'flex', gap: 2 }}>
        <FormField
          label="Rząd"
          placeholder="np. R5"
          error={form.formState.errors.row}
          {...form.register('row')}
        />
        <FormField
          label="Regał"
          placeholder="np. A"
          error={form.formState.errors.rack}
          {...form.register('rack')}
        />
        <FormField
          label="Półka"
          placeholder="np. 01"
          error={form.formState.errors.shelf}
          {...form.register('shelf')}
        />
      </Box>
    </>
  );

  const handleScan = useCallback((code: string) => {
    setSearch(code);
    setDebouncedSearch(code);
  }, []);

  useExternalScanner({ onScan: handleScan });

  return (
    <Box>
      <PageHeader
        title="Lokalizacje magazynowe"
        subtitle={`Łącznie rekordów: ${total} | Stref przyjęć (BUFFER): ${bufferCount}`}
        action={
          canCreate('dictionaries') ? (
            <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
              Dodaj lokalizację
            </Button>
          ) : null
        }
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <TextField
          placeholder="Szukaj po kodzie lokalizacji..."
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
        <ScanButton onScan={handleScan} title="Skanuj kod lokalizacji" />
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <DataGrid
          rows={locations}
          columns={columns}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
          localeText={dataGridLocaleText}
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
        title="Dodaj nową lokalizację"
        isSubmitting={isSubmitting}
      >
        {renderForm(createForm)}
      </FormModal>

      <FormModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelectedLocation(null);
        }}
        onSubmit={editForm.handleSubmit(handleEdit)}
        title={`Edytuj: ${selectedLocation?.code || ''}`}
        submitLabel="Zapisz zmiany"
        isSubmitting={isSubmitting}
      >
        {renderForm(editForm)}
      </FormModal>
    </Box>
  );
};

export default LocationsPage;
