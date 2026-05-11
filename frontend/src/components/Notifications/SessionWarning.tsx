import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import { Timer } from '@mui/icons-material';

interface SessionWarningProps {
  open: boolean;
  onExtend: () => void;
  onLogout: () => void;
  minutes?: number;
}

const minutesPhrasePl = (n: number): string => {
  if (n === 1) return '1 minutę';
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} minuty`;
  return `${n} minut`;
};

const SessionWarning = ({ open, onExtend, onLogout, minutes = 2 }: SessionWarningProps) => {
  return (
    <Dialog open={open} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
        <Timer color="warning" />
        Sesja wygasa
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Twoja sesja wygaśnie za {minutesPhrasePl(minutes)} z powodu braku aktywności. Czy chcesz
          kontynuować pracę?
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onLogout} variant="outlined" color="inherit">
          Wyloguj
        </Button>
        <Button onClick={onExtend} variant="contained" color="warning">
          Kontynuuj sesję
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionWarning;
