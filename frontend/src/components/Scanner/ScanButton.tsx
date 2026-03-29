import { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { QrCodeScanner } from '@mui/icons-material';
import BarcodeScanner from './BarcodeScanner';

interface ScanButtonProps {
  onScan: (code: string) => void;
  title?: string;
  size?: 'small' | 'medium';
}

/**
 * Przycisk otwierający skaner kamerowy.
 * Umieść obok pola wyszukiwania lub selekta.
 *
 * Przykład:
 *   <TextField ... />
 *   <ScanButton onScan={(code) => setSearch(code)} />
 */
const ScanButton = ({ onScan, title = 'Skanuj kod kreskowy', size = 'small' }: ScanButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title={title}>
        <IconButton size={size} onClick={() => setOpen(true)} sx={{ color: 'primary.main' }}>
          <QrCodeScanner />
        </IconButton>
      </Tooltip>

      <BarcodeScanner open={open} onClose={() => setOpen(false)} onScan={onScan} title={title} />
    </>
  );
};

export default ScanButton;
