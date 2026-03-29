import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook nasłuchujący skanera zewnętrznego (USB/Bluetooth).
 *
 * Skanery zewnętrzne działają jak klawiatura — szybko wpisują znaki
 * i kończą Enterem. Ten hook wykrywa takie "serie" i wywołuje onScan.
 *
 * Parametry:
 * - onScan: callback wywoływany z zeskanowanym kodem
 * - enabled: czy nasłuch jest aktywny (domyślnie true)
 * - minLength: minimalna długość kodu (domyślnie 3)
 * - maxDelay: max czas między znakami w ms (domyślnie 50)
 */
export function useExternalScanner({
  onScan,
  enabled = true,
  minLength = 3,
  maxDelay = 50,
}: {
  onScan: (code: string) => void;
  enabled?: boolean;
  minLength?: number;
  maxDelay?: number;
}) {
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const onScanRef = useRef(onScan);

  // Keep callback ref fresh without re-registering listener
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return;
      }

      const now = Date.now();

      // If too much time passed, reset buffer
      if (now - lastKeyTimeRef.current > maxDelay) {
        bufferRef.current = '';
      }

      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        const code = bufferRef.current.trim();
        if (code.length >= minLength) {
          e.preventDefault();
          onScanRef.current(code);
        }
        bufferRef.current = '';
        return;
      }

      // Only collect printable single characters
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    },
    [maxDelay, minLength],
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}
