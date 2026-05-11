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
  Alert,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { PersonAdd, Search, Lock, LockOpen, Edit } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Role, ROLE_LABELS } from '@/constants/roles';
import { useNotification } from '@/context/NotificationContext';
import {
  userCreateSchema,
  userEditSchema,
  type UserCreateFormData,
  type UserEditFormData,
} from '@/utils/validators';
import FormField from '@/components/Form/FormField';
import FormSelect from '@/components/Form/FormSelect';
import FormModal from '@/components/Modal/FormModal';
import PageHeader from '@/components/Table/PageHeader';
import { useUsers, type UserItem } from '@/hooks/useUsers';
import { dataGridLocaleText } from '@/constants/dataGridLocale';

const ROLE_COLORS: Record<Role, string> = {
  [Role.ADMIN]: '#D32F2F',
  [Role.MANAGER]: '#1565C0',
  [Role.FOREMAN]: '#FF8F00',
  [Role.WORKER]: '#2E7D32',
};

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

const UsersPage = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSetupLink, setLastSetupLink] = useState<string>('');
  const { showError } = useNotification();

  const { users, total, isLoading, createUser, updateUser, toggleActive } = useUsers({
    search: debouncedSearch,
    pageSize: 100,
  });

  const createForm = useForm<UserCreateFormData>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: { email: '', firstName: '', lastName: '', role: '' },
  });

  const editForm = useForm<UserEditFormData>({
    resolver: zodResolver(userEditSchema),
  });

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    clearTimeout((handleSearchChange as { timer?: ReturnType<typeof setTimeout> }).timer);
    (handleSearchChange as { timer?: ReturnType<typeof setTimeout> }).timer = setTimeout(() => {
      setDebouncedSearch(value);
    }, 400);
  }, []);

  const handleCreate = async (data: UserCreateFormData) => {
    setIsSubmitting(true);
    try {
      const result = await createUser({
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        role: data.role,
      });
      setLastSetupLink(result.setup_password_url);
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

  const handleEdit = async (data: UserEditFormData) => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await updateUser(selectedUser.id, {
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
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
    });
    setEditOpen(true);
  };

  const columns: GridColDef[] = [
    { field: 'login_code', headerName: 'Kod logowania', width: 110 },
    { field: 'first_name', headerName: 'Imię', width: 120 },
    { field: 'last_name', headerName: 'Nazwisko', width: 140 },
    { field: 'email', headerName: 'E-mail', flex: 1, minWidth: 180 },
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
      headerName: 'Konto',
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

  const renderCreateForm = () => (
    <>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <FormField
          label="Imię"
          error={createForm.formState.errors.firstName}
          {...createForm.register('firstName')}
        />
        <FormField
          label="Nazwisko"
          error={createForm.formState.errors.lastName}
          {...createForm.register('lastName')}
        />
      </Box>
      <FormField
        label="Adres email"
        placeholder="jan.kowalski@firma.pl"
        error={createForm.formState.errors.email}
        {...createForm.register('email')}
      />
      <Controller
        name="role"
        control={createForm.control}
        render={({ field }) => (
          <FormSelect
            label="Rola"
            options={ROLE_OPTIONS}
            error={createForm.formState.errors.role}
            {...field}
          />
        )}
      />
    </>
  );

  const renderEditForm = () => (
    <>
      {selectedUser && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          E-mail (nie można zmienić): <strong>{selectedUser.email}</strong>
        </Typography>
      )}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <FormField
          label="Imię"
          error={editForm.formState.errors.firstName}
          {...editForm.register('firstName')}
        />
        <FormField
          label="Nazwisko"
          error={editForm.formState.errors.lastName}
          {...editForm.register('lastName')}
        />
      </Box>
      <Controller
        name="role"
        control={editForm.control}
        render={({ field }) => (
          <FormSelect
            label="Rola"
            options={ROLE_OPTIONS}
            error={editForm.formState.errors.role}
            {...field}
          />
        )}
      />
    </>
  );

  return (
    <Box>
      <PageHeader
        title="Użytkownicy"
        subtitle={`Łącznie rekordów: ${total}`}
        action={
          <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setCreateOpen(true)}>
            Utwórz konto
          </Button>
        }
      />

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
        title="Utwórz nowe konto"
        submitLabel="Utwórz konto"
        isSubmitting={isSubmitting}
      >
        {renderCreateForm()}
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Kod logowania (5 cyfr) zostanie wygenerowany automatycznie. Użytkownik ustawi hasło z linku
          wysłanego e-mailem.
        </Typography>
      </FormModal>

      {lastSetupLink && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Ostatni link aktywacyjny (dev/fallback):{' '}
          <a href={lastSetupLink} target="_blank" rel="noreferrer">
            {lastSetupLink}
          </a>
        </Alert>
      )}

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
        {renderEditForm()}
      </FormModal>
    </Box>
  );
};

export default UsersPage;
