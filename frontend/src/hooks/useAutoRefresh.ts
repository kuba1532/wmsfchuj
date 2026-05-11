import { useEffect } from 'react';

interface UseAutoRefreshOptions {
  enabled?: boolean;
  intervalMs?: number;
  refreshOnFocus?: boolean;
  refreshOnVisibility?: boolean;
  refreshOnOnline?: boolean;
}

export function useAutoRefresh(
  callback: () => void,
  {
    enabled = true,
    intervalMs = 30 * 1000,
    refreshOnFocus = true,
    refreshOnVisibility = true,
    refreshOnOnline = true,
  }: UseAutoRefreshOptions = {},
) {
  useEffect(() => {
    if (!enabled) return;

    const id = window.setInterval(() => callback(), intervalMs);

    const onFocus = () => callback();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') callback();
    };
    const onOnline = () => callback();

    if (refreshOnFocus) window.addEventListener('focus', onFocus);
    if (refreshOnVisibility) document.addEventListener('visibilitychange', onVisibility);
    if (refreshOnOnline) window.addEventListener('online', onOnline);

    return () => {
      window.clearInterval(id);
      if (refreshOnFocus) window.removeEventListener('focus', onFocus);
      if (refreshOnVisibility) document.removeEventListener('visibilitychange', onVisibility);
      if (refreshOnOnline) window.removeEventListener('online', onOnline);
    };
  }, [callback, enabled, intervalMs, refreshOnFocus, refreshOnVisibility, refreshOnOnline]);
}
