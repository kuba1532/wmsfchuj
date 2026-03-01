import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

const EVENTS: string[] = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

interface UseSessionTimeoutOptions {
  timeoutMinutes?: number;
  warningMinutes?: number;
  onWarning?: () => void;
  onTimeout?: () => void;
}

const useSessionTimeout = ({
  timeoutMinutes = 30,
  warningMinutes = 2,
  onWarning,
  onTimeout,
}: UseSessionTimeoutOptions = {}) => {
  const { isAuthenticated, logout } = useAuth();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningShownRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
  }, []);

  const handleTimeout = useCallback(() => {
    onTimeout?.();
    logout();
  }, [logout, onTimeout]);

  const resetTimers = useCallback(() => {
    clearTimers();
    warningShownRef.current = false;

    const warningDelay = (timeoutMinutes - warningMinutes) * 60 * 1000;
    const timeoutDelay = timeoutMinutes * 60 * 1000;

    warningRef.current = setTimeout(() => {
      warningShownRef.current = true;
      onWarning?.();
    }, warningDelay);

    timeoutRef.current = setTimeout(handleTimeout, timeoutDelay);
  }, [clearTimers, timeoutMinutes, warningMinutes, onWarning, handleTimeout]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimers();
      return;
    }

    resetTimers();

    const handleActivity = () => {
      if (!warningShownRef.current) {
        resetTimers();
      }
    };

    EVENTS.forEach((event) => window.addEventListener(event, handleActivity));

    return () => {
      clearTimers();
      EVENTS.forEach((event) => window.removeEventListener(event, handleActivity));
    };
  }, [isAuthenticated, resetTimers, clearTimers]);

  const extendSession = useCallback(() => {
    warningShownRef.current = false;
    resetTimers();
  }, [resetTimers]);

  return { extendSession };
};

export default useSessionTimeout;
