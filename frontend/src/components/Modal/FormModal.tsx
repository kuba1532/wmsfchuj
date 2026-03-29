import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import type { ReactNode } from 'react';

interface FormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  children: ReactNode;
  submitLabel?: string;
  /** @deprecated użyj isSubmitting */
  loading?: boolean;
  isSubmitting?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg';
}

const FormModal = ({
  open,
  onClose,
  onSubmit,
  title,
  children,
  submitLabel = 'Zapisz',
  loading = false,
  isSubmitting = false,
  maxWidth = 'sm',
}: FormModalProps) => {
  const disabled = loading || isSubmitting;

  return (
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box fontWeight={600}>{title}</Box>
        <IconButton onClick={onClose} size="small" disabled={disabled}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined" color="inherit" disabled={disabled}>
          Anuluj
        </Button>
        <Button onClick={onSubmit} variant="contained" disabled={disabled}>
          {disabled ? 'Zapisywanie...' : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FormModal;
