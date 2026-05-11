import { useEffect, useRef } from 'react';
import apiClient from '@/api/client';

interface UseChangeSignalOptions {
  enabled?: boolean;
  intervalMs?: number;
}

interface SyncVersionResponse {
  version: number;
}

export function useChangeSignal(
  onChanged: () => void,
  { enabled = true, intervalMs = 2000 }: UseChangeSignalOptions = {},
) {
  const lastSeenVersionRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const checkVersion = async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const response = await apiClient.get<SyncVersionResponse>('/sync/version');
        const currentVersion = Number(response.data?.version ?? 0);
        const lastSeen = lastSeenVersionRef.current;
        if (lastSeen === null) {
          lastSeenVersionRef.current = currentVersion;
          return;
        }
        if (currentVersion > lastSeen) {
          lastSeenVersionRef.current = currentVersion;
          onChanged();
          return;
        }
        lastSeenVersionRef.current = currentVersion;
      } catch {
        // Cichy fallback: brak sygnału zmian nie powinien psuć działania widoku.
      } finally {
        inFlightRef.current = false;
      }
    };

    void checkVersion();
    const id = window.setInterval(() => {
      void checkVersion();
    }, intervalMs);

    const onFocus = () => {
      void checkVersion();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void checkVersion();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, intervalMs, onChanged]);
}
