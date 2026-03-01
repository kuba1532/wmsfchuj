import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, TextField } from '@mui/material';
import { taskSchema, type TaskFormData } from '@/utils/validators';
import FormField from '@/components/Form/FormField';
import FormSelect from '@/components/Form/FormSelect';
import FormModal from '@/components/Modal/FormModal';

const TASK_TYPE_OPTIONS = [
  { value: 'PUTAWAY', label: 'Rozmieszczanie' },
  { value: 'PICKING', label: 'Kompletacja' },
  { value: 'MOVE', label: 'Przesunięcie' },
  { value: 'INVENTORY', label: 'Inwentaryzacja' },
];

const MOCK_WORKERS = [
  { value: 'Jan Kowalski', label: 'Jan Kowalski (12345)' },
  { value: 'Anna Nowak', label: 'Anna Nowak (54321)' },
  { value: 'Piotr Zieliński', label: 'Piotr Zieliński (22222)' },
];

const MOCK_PRODUCTS = [
  { id: 1, label: 'SKU-001 – Śruba M8x40' },
  { id: 2, label: 'SKU-002 – Nakrętka M8' },
  { id: 3, label: 'SKU-003 – Olej hydrauliczny 5L' },
  { id: 4, label: 'SKU-004 – Filtr powietrza FP-200' },
  { id: 5, label: 'SKU-005 – Uszczelka gumowa 50mm' },
];

const MOCK_LOCATIONS = [
  'BUFOR-01',
  'R1-A-01',
  'R1-A-02',
  'R1-B-01',
  'R1-B-02',
  'R2-A-03',
  'R2-C-01',
  'R3-B-02',
  'R4-A-01',
  'R4-B-03',
];

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => void;
}

const CreateTaskModal = ({ open, onClose, onSubmit }: CreateTaskModalProps) => {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      type: '',
      assignedTo: '',
      productId: 0,
      fromLocation: '',
      toLocation: '',
      quantity: 1,
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSubmit = (data: TaskFormData) => {
    onSubmit(data);
    reset();
  };

  return (
    <FormModal
      open={open}
      onClose={handleClose}
      onSubmit={handleSubmit(handleFormSubmit)}
      title="Utwórz nowe zadanie"
      maxWidth="sm"
      submitLabel="Utwórz zadanie"
    >
      <Controller
        name="type"
        control={control}
        render={({ field }) => (
          <FormSelect
            label="Typ zadania"
            options={TASK_TYPE_OPTIONS}
            error={errors.type}
            {...field}
          />
        )}
      />
      <Controller
        name="assignedTo"
        control={control}
        render={({ field }) => (
          <FormSelect
            label="Przypisz do magazyniera"
            options={MOCK_WORKERS}
            error={errors.assignedTo}
            {...field}
          />
        )}
      />
      <TextField
        select
        label="Produkt"
        size="small"
        fullWidth
        margin="normal"
        error={!!errors.productId}
        helperText={errors.productId?.message}
        {...register('productId', { valueAsNumber: true })}
        slotProps={{ select: { native: true } }}
      >
        <option value="">-- Wybierz produkt --</option>
        {MOCK_PRODUCTS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </TextField>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          select
          label="Z lokalizacji"
          size="small"
          fullWidth
          margin="normal"
          error={!!errors.fromLocation}
          helperText={errors.fromLocation?.message}
          {...register('fromLocation')}
          slotProps={{ select: { native: true } }}
        >
          <option value="">-- Wybierz --</option>
          {MOCK_LOCATIONS.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </TextField>
        <TextField
          select
          label="Do lokalizacji"
          size="small"
          fullWidth
          margin="normal"
          error={!!errors.toLocation}
          helperText={errors.toLocation?.message}
          {...register('toLocation')}
          slotProps={{ select: { native: true } }}
        >
          <option value="">-- Opcjonalnie --</option>
          {MOCK_LOCATIONS.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </TextField>
      </Box>
      <FormField
        label="Ilość"
        type="number"
        error={errors.quantity}
        {...register('quantity', { valueAsNumber: true })}
      />
    </FormModal>
  );
};

export default CreateTaskModal;
