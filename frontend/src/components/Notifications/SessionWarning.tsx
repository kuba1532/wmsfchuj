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

const SessionWarning = ({ open, onExtend, onLogout, minutes = 2 }: SessionWarningProps) => {
  return (
    <Dialog open={open} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
        <Timer color="warning" />
        Sesja wygasa
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Twoja sesja wygaśnie za {minutes} minuty z powodu braku aktywności. Czy chcesz kontynuować
          pracę?
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
