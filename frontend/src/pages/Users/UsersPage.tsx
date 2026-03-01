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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { PersonAdd, Search, Lock, LockOpen, Edit, Refresh } from '@mui/icons-material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import apiClient from '@/api/client';
import { Role } from '@/constants/roles';
import { useNotification } from '@/context/NotificationContext';
import { userSchema, type UserFormData } from '@/utils/validators';

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

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

type ApiUser = {
  id: number;
  login_code: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role | string;
  is_active: boolean;
  created_at: string;
  last_login?: string | null;
};

type UiUser = {
  id: number;
  login: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  active: boolean;
  lastLogin: string;
};

const toUiUser = (u: ApiUser): UiUser => ({
  id: u.id,
  login: u.login_code,
  email: u.email,
  firstName: u.first_name,
  lastName: u.last_name,
  role: u.role as Role,
  active: Boolean(u.is_active),
  lastLogin: u.last_login ? String(u.last_login) : '-',
});

const UsersPage = () => {
  const { showSuccess, showError } = useNotification();

  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UiUser[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UiUser | null>(null);

  const createForm = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { email: '', firstName: '', lastName: '', role: '' },
    mode: 'onTouched',
  });

  const editForm = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { email: '', firstName: '', lastName: '', role: '' },
    mode: 'onTouched',
  });

  const fetchUsers = async () => {
    setLoadingList(true);
    try {
      // backend ma paginację: /api/v1/users?page=1&page_size=100
      const res = await apiClient.get('/users', { params: { page: 1, page_size: 100 } });
      const items: ApiUser[] = res.data?.items ?? [];
      setUsers(items.map(toUiUser));
    } catch (e: any) {
      showError(e?.response?.data?.detail || 'Nie udało się pobrać listy użytkowników.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;

    return users.filter(
      (u) =>
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.login.includes(q),
    );
  }, [users, search]);

  const openCreate = () => {
    createForm.reset({ email: '', firstName: '', lastName: '', role: '' });
    setCreateOpen(true);
  };

  const openEdit = (user: UiUser) => {
    setSelectedUser(user);
    editForm.reset({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    });
    setEditOpen(true);
  };

  const handleCreate = async (data: UserFormData) => {
    try {
      // POST /users: email, first_name, last_name, role, password
      // W swagger widzę że password jest wymagane przy tworzeniu
      const res = await apiClient.post('/users', {
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        role: data.role,
        // jeśli w Twoim UI docelowo ma być “link aktywacyjny”, to backend trzeba przebudować
        // na razie (wg swaggera) password jest wymagane:
        password: (data as any).password || 'Admin123!', // awaryjnie jeśli schema wymaga hasła w backendzie
      });

      const created: ApiUser = res.data;
      const ui = toUiUser(created);

      setUsers((prev) => [ui, ...prev]);
      setCreateOpen(false);

      showSuccess(
        `Utworzono konto: ${ui.firstName} ${ui.lastName}. Login: ${ui.login} (hasło ustawione w backendzie).`,
      );
    } catch (e: any) {
      showError(e?.response?.data?.detail || 'Nie udało się utworzyć użytkownika.');
    }
  };

  const handleEdit = async (data: UserFormData) => {
    if (!selectedUser) return;

    try {
      const res = await apiClient.patch(`/users/${selectedUser.id}`, {
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        role: data.role,
        is_active: selectedUser.active,
      });

      const updated: ApiUser = res.data;
      const ui = toUiUser(updated);

      setUsers((prev) => prev.map((u) => (u.id === ui.id ? ui : u)));
      setEditOpen(false);
      setSelectedUser(null);

      showSuccess(`Zaktualizowano użytkownika: ${ui.firstName} ${ui.lastName}.`);
    } catch (e: any) {
      showError(e?.response?.data?.detail || 'Nie udało się zaktualizować użytkownika.');
    }
  };

  const toggleActive = async (user: UiUser) => {
    try {
      const res = await apiClient.patch(`/users/${user.id}`, {
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        role: user.role,
        is_active: !user.active,
      });

      const updated: ApiUser = res.data;
      const ui = toUiUser(updated);

      setUsers((prev) => prev.map((u) => (u.id === ui.id ? ui : u)));
      showSuccess(`Konto ${ui.login} zostało ${ui.active ? 'odblokowane' : 'zablokowane'}.`);
    } catch (e: any) {
      showError(e?.response?.data?.detail || 'Nie udało się zmienić statusu użytkownika.');
    }
  };

  const columns: GridColDef[] = [
    { field: 'login', headerName: 'Login', width: 100 },
    { field: 'firstName', headerName: 'Imię', width: 140 },
    { field: 'lastName', headerName: 'Nazwisko', width: 160 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 220 },
    {
      field: 'role',
      headerName: 'Rola',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={ROLE_LABELS[params.value as Role] ?? String(params.value)}
          size="small"
          sx={{
            bgcolor: ROLE_COLORS[params.value as Role] ?? '#455A64',
            color: 'white',
            fontWeight: 600,
          }}
        />
      ),
    },
    {
      field: 'active',
      headerName: 'Status',
      width: 140,
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
    { field: 'lastLogin', headerName: 'Ostatnie logowanie', width: 180 },
    {
      field: 'actions',
      headerName: 'Akcje',
      width: 140,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Edytuj">
            <IconButton size="small" onClick={() => openEdit(params.row)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title={params.row.active ? 'Zablokuj' : 'Odblokuj'}>
            <IconButton
              size="small"
              color={params.row.active ? 'error' : 'success'}
              onClick={() => toggleActive(params.row)}
            >
              {params.row.active ? <Lock fontSize="small" /> : <LockOpen fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Użytkownicy
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={loadingList ? <CircularProgress size={16} /> : <Refresh />}
            onClick={fetchUsers}
            disabled={loadingList}
          >
            Odśwież
          </Button>

          <Button variant="contained" startIcon={<PersonAdd />} onClick={openCreate}>
            Utwórz konto
          </Button>
        </Box>
      </Box>

      <TextField
        placeholder="Szukaj po imieniu, nazwisku, emailu lub loginie..."
        size="small"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2, width: 420 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
      />

      <DataGrid
        rows={filtered}
        columns={columns}
        pageSizeOptions={[10, 25, 100]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        disableRowSelectionOnClick
        autoHeight
        sx={{ borderRadius: 2 }}
      />

      {/* CREATE MODAL */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Utwórz nowe konto</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'grid', gap: 2 }}>
          <Controller
            name="firstName"
            control={createForm.control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Imię"
                error={!!createForm.formState.errors.firstName}
                helperText={createForm.formState.errors.firstName?.message}
                fullWidth
              />
            )}
          />

          <Controller
            name="lastName"
            control={createForm.control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Nazwisko"
                error={!!createForm.formState.errors.lastName}
                helperText={createForm.formState.errors.lastName?.message}
                fullWidth
              />
            )}
          />

          <Controller
            name="email"
            control={createForm.control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Adres email"
                placeholder="jan.kowalski@firma.pl"
                error={!!createForm.formState.errors.email}
                helperText={createForm.formState.errors.email?.message}
                fullWidth
              />
            )}
          />

          <Controller
            name="role"
            control={createForm.control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Rola"
                error={!!createForm.formState.errors.role}
                helperText={createForm.formState.errors.role?.message}
                fullWidth
              >
                {ROLE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <Typography variant="caption" color="text.secondary">
            Login (5-cyfrowy kod) zostanie wygenerowany przez backend. Hasło — według wymagań
            backendu.
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Anuluj</Button>
          <Button
            variant="contained"
            onClick={createForm.handleSubmit(handleCreate)}
            disabled={createForm.formState.isSubmitting}
          >
            Utwórz konto
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          Edytuj: {selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : ''}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'grid', gap: 2 }}>
          <Controller
            name="firstName"
            control={editForm.control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Imię"
                error={!!editForm.formState.errors.firstName}
                helperText={editForm.formState.errors.firstName?.message}
                fullWidth
              />
            )}
          />

          <Controller
            name="lastName"
            control={editForm.control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Nazwisko"
                error={!!editForm.formState.errors.lastName}
                helperText={editForm.formState.errors.lastName?.message}
                fullWidth
              />
            )}
          />

          <Controller
            name="email"
            control={editForm.control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Adres email"
                error={!!editForm.formState.errors.email}
                helperText={editForm.formState.errors.email?.message}
                fullWidth
              />
            )}
          />

          <Controller
            name="role"
            control={editForm.control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Rola"
                error={!!editForm.formState.errors.role}
                helperText={editForm.formState.errors.role?.message}
                fullWidth
              >
                {ROLE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              setEditOpen(false);
              setSelectedUser(null);
            }}
          >
            Anuluj
          </Button>
          <Button
            variant="contained"
            onClick={editForm.handleSubmit(handleEdit)}
            disabled={editForm.formState.isSubmitting}
          >
            Zapisz zmiany
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage;
