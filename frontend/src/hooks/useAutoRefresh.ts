import { useEffect } from 'react';

interface UseAutoRefreshOptions {
  enabled?: boolean;
  intervalMs?: number;
}

export function useAutoRefresh(callback: () => void, { enabled = true, intervalMs = 2 * 60 * 1000 }: UseAutoRefreshOptions = {}) {
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => callback(), intervalMs);
    return () => window.clearInterval(id);
  }, [callback, enabled, intervalMs]);
}
