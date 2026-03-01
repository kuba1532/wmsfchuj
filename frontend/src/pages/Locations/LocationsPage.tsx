import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Tooltip,
  FormControlLabel,
  Checkbox,
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

interface Location {
  id: number;
  code: string;
  type: LocationType;
  row: string;
  rack: string;
  shelf: string;
  occupied: boolean;
  isBuffer: boolean;
}

const TYPE_COLORS: Record<LocationType, string> = {
  [LocationType.BUFFER]: '#FF8F00',
  [LocationType.STORAGE]: '#1565C0',
  [LocationType.PICKING_ZONE]: '#7B1FA2',
};

const LOCATION_TYPE_OPTIONS = Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const INITIAL_LOCATIONS: Location[] = [
  {
    id: 1,
    code: 'BUFOR-01',
    type: LocationType.BUFFER,
    row: '-',
    rack: '-',
    shelf: '-',
    occupied: true,
    isBuffer: true,
  },
  {
    id: 2,
    code: 'R1-A-01',
    type: LocationType.STORAGE,
    row: 'R1',
    rack: 'A',
    shelf: '01',
    occupied: true,
    isBuffer: false,
  },
  {
    id: 3,
    code: 'R1-A-02',
    type: LocationType.STORAGE,
    row: 'R1',
    rack: 'A',
    shelf: '02',
    occupied: true,
    isBuffer: false,
  },
  {
    id: 4,
    code: 'R1-B-01',
    type: LocationType.STORAGE,
    row: 'R1',
    rack: 'B',
    shelf: '01',
    occupied: false,
    isBuffer: false,
  },
  {
    id: 5,
    code: 'R1-B-02',
    type: LocationType.STORAGE,
    row: 'R1',
    rack: 'B',
    shelf: '02',
    occupied: true,
    isBuffer: false,
  },
  {
    id: 6,
    code: 'R2-A-03',
    type: LocationType.STORAGE,
    row: 'R2',
    rack: 'A',
    shelf: '03',
    occupied: true,
    isBuffer: false,
  },
  {
    id: 7,
    code: 'R2-C-01',
    type: LocationType.STORAGE,
    row: 'R2',
    rack: 'C',
    shelf: '01',
    occupied: true,
    isBuffer: false,
  },
  {
    id: 8,
    code: 'R3-B-02',
    type: LocationType.STORAGE,
    row: 'R3',
    rack: 'B',
    shelf: '02',
    occupied: true,
    isBuffer: false,
  },
  {
    id: 9,
    code: 'R4-A-01',
    type: LocationType.STORAGE,
    row: 'R4',
    rack: 'A',
    shelf: '01',
    occupied: true,
    isBuffer: false,
  },
  {
    id: 10,
    code: 'R4-B-03',
    type: LocationType.STORAGE,
    row: 'R4',
    rack: 'B',
    shelf: '03',
    occupied: true,
    isBuffer: false,
  },
];

const LocationsPage = () => {
  const [search, setSearch] = useState('');
  const [locations, setLocations] = useState<Location[]>(INITIAL_LOCATIONS);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isBufferCreate, setIsBufferCreate] = useState(false);
  const [isBufferEdit, setIsBufferEdit] = useState(false);
  const { canCreate } = usePermissions();
  const { showSuccess, showError } = useNotification();

  const createForm = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: { code: '', type: '', row: '', rack: '', shelf: '' },
  });

  const editForm = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
  });

  const handleCreate = (data: LocationFormData) => {
    const duplicate = locations.find((l) => l.code === data.code);
    if (duplicate) {
      showError(`Lokalizacja "${data.code}" już istnieje!`);
      return;
    }
    const newLocation: Location = {
      id: Math.max(...locations.map((l) => l.id)) + 1,
      code: data.code,
      type: data.type as LocationType,
      row: data.row || '-',
      rack: data.rack || '-',
      shelf: data.shelf || '-',
      occupied: false,
      isBuffer: isBufferCreate,
    };
    setLocations([...locations, newLocation]);
    setCreateOpen(false);
    setIsBufferCreate(false);
    createForm.reset();
    showSuccess(
      `Lokalizacja "${data.code}" została dodana.${isBufferCreate ? ' (Strefa przyjęć)' : ''}`,
    );
  };

  const handleEdit = (data: LocationFormData) => {
    if (!selectedLocation) return;
    const duplicate = locations.find((l) => l.code === data.code && l.id !== selectedLocation.id);
    if (duplicate) {
      showError(`Lokalizacja "${data.code}" już istnieje!`);
      return;
    }
    setLocations(
      locations.map((l) =>
        l.id === selectedLocation.id
          ? {
              ...l,
              code: data.code,
              type: data.type as LocationType,
              row: data.row || '-',
              rack: data.rack || '-',
              shelf: data.shelf || '-',
              isBuffer: isBufferEdit,
            }
          : l,
      ),
    );
    setEditOpen(false);
    setSelectedLocation(null);
    showSuccess(`Lokalizacja "${data.code}" została zaktualizowana.`);
  };

  const openEdit = (location: Location) => {
    setSelectedLocation(location);
    setIsBufferEdit(location.isBuffer);
    editForm.reset({
      code: location.code,
      type: location.type,
      row: location.row === '-' ? '' : location.row,
      rack: location.rack === '-' ? '' : location.rack,
      shelf: location.shelf === '-' ? '' : location.shelf,
    });
    setEditOpen(true);
  };

  const columns: GridColDef[] = [
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
    {
      field: 'isBuffer',
      headerName: 'Strefa przyjęć',
      width: 120,
      renderCell: (params) =>
        params.value ? <Chip label="Bufor" size="small" color="warning" /> : null,
    },
    { field: 'row', headerName: 'Rząd', width: 80 },
    { field: 'rack', headerName: 'Regał', width: 80 },
    { field: 'shelf', headerName: 'Półka', width: 80 },
    {
      field: 'occupied',
      headerName: 'Zajęta',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Tak' : 'Nie'}
          size="small"
          color={params.value ? 'warning' : 'success'}
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

  const filtered = locations.filter((loc) => loc.code.toLowerCase().includes(search.toLowerCase()));

  const bufferCount = locations.filter((l) => l.isBuffer).length;

  const renderForm = (
    form: typeof createForm,
    isBuffer: boolean,
    setIsBuffer: (v: boolean) => void,
  ) => (
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
      <FormControlLabel
        control={
          <Checkbox
            checked={isBuffer}
            onChange={(e) => setIsBuffer(e.target.checked)}
            color="warning"
          />
        }
        label="Strefa przyjęć (buforowa) – punkt startowy dla rozmieszczania"
      />
    </>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h5" fontWeight={700}>
          Lokalizacje magazynowe
        </Typography>
        {canCreate('dictionaries') && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
            Dodaj lokalizację
          </Button>
        )}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Stref przyjęć (buforowych): {bufferCount}
      </Typography>

      <TextField
        placeholder="Szukaj po kodzie lokalizacji..."
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

      <FormModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setIsBufferCreate(false);
          createForm.reset();
        }}
        onSubmit={createForm.handleSubmit(handleCreate)}
        title="Dodaj nową lokalizację"
      >
        {renderForm(createForm, isBufferCreate, setIsBufferCreate)}
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
      >
        {renderForm(editForm, isBufferEdit, setIsBufferEdit)}
      </FormModal>
    </Box>
  );
};

export default LocationsPage;
