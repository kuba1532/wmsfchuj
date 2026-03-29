import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Box,
  Typography,
  TextField,
  MenuItem,
} from '@mui/material';
import { useState, useEffect } from 'react';
import apiClient from '@/api/client';
import { TASK_TYPE_LABELS } from '@/constants/taskTypes';
import { useNotification } from '@/context/NotificationContext';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  login_code: string;
  role: string;
  is_active: boolean;
}

interface Product {
  id: number;
  sku: string;
  name: string;
  is_active: boolean;
}

interface Location {
  id: number;
  code: string;
  type: string;
  is_active: boolean;
}

interface FormState {
  type: string;
  product_id: string;
  from_location_id: string;
  to_location_id: string;
  quantity: string;
  assigned_to_id: string;
}

const INITIAL_FORM: FormState = {
  type: '',
  product_id: '',
  from_location_id: '',
  to_location_id: '',
  quantity: '',
  assigned_to_id: '',
};

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TASK_TYPE_OPTIONS = Object.entries(TASK_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const CreateTaskModal = ({ open, onClose, onSuccess }: CreateTaskModalProps) => {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const { showError } = useNotification();

  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const [usersRes, productsRes, locationsRes] = await Promise.all([
          apiClient.get('/users?page=1&page_size=100'),
          apiClient.get('/products?page=1&page_size=100'),
          apiClient.get('/locations?page=1&page_size=100'),
        ]);

        setUsers((usersRes.data.items ?? []).filter((u: User) => u.is_active));
        setProducts((productsRes.data.items ?? []).filter((p: Product) => p.is_active));
        setLocations((locationsRes.data.items ?? []).filter((l: Location) => l.is_active));
      } catch {
        showError('Nie udało się pobrać danych słownikowych.');
        onClose();
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [open]);

  const handleClose = () => {
    setForm(INITIAL_FORM);
    setErrors({});
    onClose();
  };

  const validate = (): boolean => {
    const newErrors: Partial<FormState> = {};

    if (!form.type) newErrors.type = 'Wybierz typ zadania.';
    if (!form.assigned_to_id) newErrors.assigned_to_id = 'Wybierz pracownika.';
    if (!form.quantity || Number(form.quantity) <= 0) {
      newErrors.quantity = 'Podaj ilość większą od 0.';
    }
    if (
      form.from_location_id &&
      form.to_location_id &&
      form.from_location_id === form.to_location_id
    ) {
      newErrors.to_location_id = 'Lokalizacja docelowa musi być różna od źródłowej.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await apiClient.post('/tasks', {
        type: form.type,
        product_id: form.product_id ? Number(form.product_id) : null,
        from_location_id: form.from_location_id ? Number(form.from_location_id) : null,
        to_location_id: form.to_location_id ? Number(form.to_location_id) : null,
        quantity: Number(form.quantity),
        assigned_to_id: Number(form.assigned_to_id),
      });

      setForm(INITIAL_FORM);
      setErrors({});
      onSuccess();
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      showError(detail ?? 'Nie udało się utworzyć zadania.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Utwórz zadanie</DialogTitle>

      <DialogContent>
        {isLoadingData ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              select
              label="Typ zadania"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              error={!!errors.type}
              helperText={errors.type}
              required
              size="small"
              fullWidth
            >
              {TASK_TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Przypisz do"
              value={form.assigned_to_id}
              onChange={(e) => setForm((f) => ({ ...f, assigned_to_id: e.target.value }))}
              error={!!errors.assigned_to_id}
              helperText={errors.assigned_to_id}
              required
              size="small"
              fullWidth
            >
              {users.map((u) => (
                <MenuItem key={u.id} value={String(u.id)}>
                  {u.first_name} {u.last_name} ({u.login_code})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Produkt"
              value={form.product_id}
              onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}
              error={!!errors.product_id}
              helperText={errors.product_id}
              size="small"
              fullWidth
            >
              <MenuItem value="">— brak —</MenuItem>
              {products.map((p) => (
                <MenuItem key={p.id} value={String(p.id)}>
                  {p.sku} — {p.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Lokalizacja źródłowa"
              value={form.from_location_id}
              onChange={(e) => setForm((f) => ({ ...f, from_location_id: e.target.value }))}
              error={!!errors.from_location_id}
              helperText={errors.from_location_id}
              size="small"
              fullWidth
            >
              <MenuItem value="">— brak —</MenuItem>
              {locations.map((l) => (
                <MenuItem key={l.id} value={String(l.id)}>
                  {l.code} ({l.type})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Lokalizacja docelowa"
              value={form.to_location_id}
              onChange={(e) => setForm((f) => ({ ...f, to_location_id: e.target.value }))}
              error={!!errors.to_location_id}
              helperText={errors.to_location_id}
              size="small"
              fullWidth
            >
              <MenuItem value="">— brak —</MenuItem>
              {locations.map((l) => (
                <MenuItem key={l.id} value={String(l.id)}>
                  {l.code} ({l.type})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Ilość"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              type="number"
              error={!!errors.quantity}
              helperText={errors.quantity}
              required
              size="small"
              fullWidth
            />

            {Object.keys(errors).length > 0 && (
              <Typography variant="caption" color="error">
                Popraw błędy przed zapisaniem.
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Anuluj
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isLoadingData || isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
        >
          {isSubmitting ? 'Zapisywanie...' : 'Utwórz'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateTaskModal;
