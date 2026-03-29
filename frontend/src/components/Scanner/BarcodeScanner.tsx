import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
} from '@mui/material';
import { Close, CameraAlt, FlipCameraAndroid } from '@mui/icons-material';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
}

/**
 * Skaner kodów kreskowych — otwiera kamerę telefonu/komputera.
 * Obsługuje kody 1D (Code128, EAN-13, EAN-8, UPC-A itp.).
 *
 * Wymaga: npm install html5-qrcode
 */
const BarcodeScanner = ({
  open,
  onClose,
  onScan,
  title = 'Skanuj kod kreskowy',
}: BarcodeScannerProps) => {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const stopScanner = useCallback(async () => {
    try {
      const scanner = html5QrCodeRef.current as {
        isScanning?: boolean;
        stop?: () => Promise<void>;
        clear?: () => void;
      } | null;
      if (scanner?.isScanning) {
        await scanner.stop?.();
      }
      scanner?.clear?.();
    } catch {
      // ignore cleanup errors
    }
    html5QrCodeRef.current = null;
  }, []);

  const startScanner = useCallback(async () => {
    if (!scannerRef.current) return;

    setError(null);

    try {
      // Dynamic import — nie crashuje jeśli biblioteka nie jest zainstalowana
      const { Html5Qrcode } = await import('html5-qrcode');

      await stopScanner();

      const scannerId = 'barcode-scanner-region';
      scannerRef.current.id = scannerId;

      const html5QrCode = new Html5Qrcode(scannerId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode },
        {
          fps: 10,
          qrbox: { width: 280, height: 120 },
          aspectRatio: 1.777,
        },
        (decodedText: string) => {
          const trimmed = decodedText.trim();
          if (trimmed) {
            onScan(trimmed);
            stopScanner();
            onClose();
          }
        },
        () => {
          // scan error — ignore (continuous scanning)
        },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (message.includes('NotAllowedError') || message.includes('Permission')) {
        setError('Brak dostępu do kamery. Zezwól na dostęp w ustawieniach przeglądarki.');
      } else if (message.includes('NotFoundError') || message.includes('device')) {
        setError('Nie znaleziono kamery na tym urządzeniu.');
      } else if (message.includes('html5-qrcode')) {
        setError('Biblioteka skanera nie jest zainstalowana. Uruchom: npm install html5-qrcode');
      } else {
        setError(`Błąd kamery: ${message}`);
      }
    }
  }, [facingMode, onScan, onClose, stopScanner]);

  // Start/stop scanner when dialog opens/closes
  useEffect(() => {
    if (open) {
      // Small delay to let dialog render
      const timer = setTimeout(startScanner, 300);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
  }, [open, startScanner, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const handleFlipCamera = async () => {
    await stopScanner();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        stopScanner();
        onClose();
      }}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CameraAlt />
          <Typography fontWeight={600}>{title}</Typography>
        </Box>
        <Box>
          <IconButton size="small" onClick={handleFlipCamera} title="Zmień kamerę">
            <FlipCameraAndroid />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              stopScanner();
              onClose();
            }}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Skieruj kamerę na kod kreskowy. Skanowanie nastąpi automatycznie.
          </Typography>
        )}

        <Box
          ref={scannerRef}
          sx={{
            width: '100%',
            minHeight: 250,
            bgcolor: '#000',
            borderRadius: 2,
            overflow: 'hidden',
            '& video': { width: '100% !important', borderRadius: 2 },
            '& #qr-shaded-region': { borderColor: '#3B82F6 !important' },
          }}
        />
      </DialogContent>

      <DialogActions>
        <Button
          onClick={() => {
            stopScanner();
            onClose();
          }}
        >
          Anuluj
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BarcodeScanner;
