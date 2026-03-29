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
  CircularProgress,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { PersonAdd, Search, Lock, LockOpen, Edit } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Role } from '@/constants/roles';
import { useNotification } from '@/context/NotificationContext';
import { userSchema, type UserFormData } from '@/utils/validators';
import FormField from '@/components/Form/FormField';
import FormSelect from '@/components/Form/FormSelect';
import FormModal from '@/components/Modal/FormModal';
import { useUsers, type UserItem } from '@/hooks/useUsers';

const ROLE_COLORS: Record<Role, string> = {
  [Role.ADMIN]: '#D32F2F',
  [Role.MANAGER]: '#1565C0',
  [Role.FOREMAN]: '#FF8F00',
  [Role.WORKER]: '#2E7D32',
};

const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: 'Administrator',
  [Role.MANAGER]: 'Kierownik',
  [Role.FOREMAN]: 'Brygadzista',
  [Role.WORKER]: 'Magazynier',
};

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

const UsersPage = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showError } = useNotification();

  const { users, total, isLoading, createUser, updateUser, toggleActive } = useUsers({
    search: debouncedSearch,
    pageSize: 100,
  });

  const createForm = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { email: '', firstName: '', lastName: '', role: '' },
  });

  const editForm = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    clearTimeout((handleSearchChange as { timer?: ReturnType<typeof setTimeout> }).timer);
    (handleSearchChange as { timer?: ReturnType<typeof setTimeout> }).timer = setTimeout(() => {
      setDebouncedSearch(value);
    }, 400);
  }, []);

  const handleCreate = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      await createUser({
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        role: data.role,
        password: data.password ?? '',
      });
      setCreateOpen(false);
      createForm.reset();
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      showError(detail ?? 'Nie udało się utworzyć konta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (data: UserFormData) => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await updateUser(selectedUser.id, {
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        role: data.role,
        version: selectedUser.version,
      });
      setEditOpen(false);
      setSelectedUser(null);
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      showError(detail ?? 'Nie udało się zaktualizować danych.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (user: UserItem) => {
    try {
      await toggleActive(user);
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      showError(detail ?? 'Nie udało się zmienić statusu konta.');
    }
  };

  const openEdit = (user: UserItem) => {
    setSelectedUser(user);
    editForm.reset({
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
    });
    setEditOpen(true);
  };

  const columns: GridColDef[] = [
    { field: 'login_code', headerName: 'Login', width: 90 },
    { field: 'first_name', headerName: 'Imię', width: 120 },
    { field: 'last_name', headerName: 'Nazwisko', width: 140 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 180 },
    {
      field: 'role',
      headerName: 'Rola',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={ROLE_LABELS[params.value as Role] ?? params.value}
          size="small"
          sx={{
            bgcolor: ROLE_COLORS[params.value as Role] ?? '#999',
            color: 'white',
            fontWeight: 600,
          }}
        />
      ),
    },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <Chip
          icon={params.value ? <LockOpen sx={{ fontSize: 16 }} /> : <Lock sx={{ fontSize: 16 }} />}
          label={params.value ? 'Aktywny' : 'Zablokowany'}
          size="small"
          color={params.value ? 'success' : 'error'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'created_at',
      headerName: 'Data utworzenia',
      width: 160,
      valueFormatter: (value: string) =>
        value ? new Date(value).toLocaleDateString('pl-PL') : '—',
    },
    {
      field: 'actions',
      headerName: 'Akcje',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Edytuj">
            <IconButton size="small" onClick={() => openEdit(params.row)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={params.row.is_active ? 'Zablokuj' : 'Odblokuj'}>
            <IconButton
              size="small"
              color={params.row.is_active ? 'error' : 'success'}
              onClick={() => handleToggleActive(params.row)}
            >
              {params.row.is_active ? <Lock fontSize="small" /> : <LockOpen fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const renderForm = (form: typeof createForm, isCreate = false) => (
    <>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <FormField
          label="Imię"
          error={form.formState.errors.firstName}
          {...form.register('firstName')}
        />
        <FormField
          label="Nazwisko"
          error={form.formState.errors.lastName}
          {...form.register('lastName')}
        />
      </Box>
      <FormField
        label="Adres email"
        placeholder="jan.kowalski@firma.pl"
        error={form.formState.errors.email}
        {...form.register('email')}
      />
      {isCreate && (
        <FormField
          label="Hasło"
          type="password"
          error={form.formState.errors.password}
          {...form.register('password')}
        />
      )}
      <Controller
        name="role"
        control={form.control}
        render={({ field }) => (
          <FormSelect
            label="Rola"
            options={ROLE_OPTIONS}
            error={form.formState.errors.role}
            {...field}
          />
        )}
      />
    </>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Użytkownicy
        </Typography>
        <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setCreateOpen(true)}>
          Utwórz konto
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Łącznie: {total}
      </Typography>

      <TextField
        placeholder="Szukaj po imieniu, nazwisku, emailu lub loginie..."
        size="small"
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        sx={{ mb: 2, width: 420 }}
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

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <DataGrid
          rows={users}
          columns={columns}
          pageSizeOptions={[10, 25]}
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
        title="Utwórz nowe konto"
        submitLabel="Utwórz konto"
        isSubmitting={isSubmitting}
      >
        {renderForm(createForm, true)}
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Login (5-cyfrowy kod) zostanie wygenerowany automatycznie przez system.
        </Typography>
      </FormModal>

      <FormModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelectedUser(null);
        }}
        onSubmit={editForm.handleSubmit(handleEdit)}
        title={`Edytuj: ${selectedUser?.first_name || ''} ${selectedUser?.last_name || ''}`}
        submitLabel="Zapisz zmiany"
        isSubmitting={isSubmitting}
      >
        {renderForm(editForm, false)}
      </FormModal>
    </Box>
  );
};

export default UsersPage;
