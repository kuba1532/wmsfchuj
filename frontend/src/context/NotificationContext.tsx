import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { Snackbar, Alert, type AlertColor } from '@mui/material';

interface Notification {
  id: number;
  message: string;
  severity: AlertColor;
}

interface NotificationContextType {
  showSuccess: (message: unknown) => void;
  showError: (message: unknown) => void;
  showWarning: (message: unknown) => void;
  showInfo: (message: unknown) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

let notificationId = 0;

/**
 * Zamienia dowolny "message" na bezpieczny string do renderowania.
 * Obsługuje typowe struktury z FastAPI:
 * - detail: "..."
 * - detail: [{loc,msg,type,...}, ...] (422)
 */
const toMessageString = (input: unknown): string => {
  if (input == null) return 'Wystąpił błąd.';

  if (typeof input === 'string') {
    const s = input.trim();
    return s || 'Wystąpił błąd.';
  }

  // Jeśli ktoś poda Error
  if (input instanceof Error) {
    return input.message || 'Wystąpił błąd.';
  }

  // Jeśli ktoś poda axios error response.data.detail
  // (czasem message może być już obiektem)
  if (typeof input === 'object') {
    const anyObj = input as any;

    // FastAPI: { detail: "..." }
    if (typeof anyObj?.detail === 'string' && anyObj.detail.trim()) {
      return anyObj.detail.trim();
    }

    // FastAPI 422: { detail: [{msg,...}, ...] }
    if (Array.isArray(anyObj?.detail)) {
      const msgs = anyObj.detail
        .map((x: any) => {
          if (!x) return null;
          if (typeof x === 'string') return x;
          if (typeof x?.msg === 'string') return x.msg;
          return null;
        })
        .filter(Boolean) as string[];

      if (msgs.length) return msgs.join(' | ');

      try {
        return JSON.stringify(anyObj.detail);
      } catch {
        return 'Wystąpił błąd.';
      }
    }

    // Czasem dostaniesz bezpośrednio tablicę błędów
    if (Array.isArray(input)) {
      const msgs = (input as any[])
        .map((x) => {
          if (!x) return null;
          if (typeof x === 'string') return x;
          if (typeof x?.msg === 'string') return x.msg;
          return null;
        })
        .filter(Boolean) as string[];

      if (msgs.length) return msgs.join(' | ');
      try {
        return JSON.stringify(input);
      } catch {
        return 'Wystąpił błąd.';
      }
    }

    // Fallback na obiekt
    try {
      return JSON.stringify(input);
    } catch {
      return 'Wystąpił błąd.';
    }
  }

  // number/boolean/symbol itp.
  return String(input);
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((message: unknown, severity: AlertColor) => {
    const id = ++notificationId;
    const safeMessage = toMessageString(message);
    setNotifications((prev) => [...prev, { id, message: safeMessage, severity }]);
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showSuccess = useCallback(
    (message: unknown) => addNotification(message, 'success'),
    [addNotification],
  );

  const showError = useCallback(
    (message: unknown) => addNotification(message, 'error'),
    [addNotification],
  );

  const showWarning = useCallback(
    (message: unknown) => addNotification(message, 'warning'),
    [addNotification],
  );

  const showInfo = useCallback(
    (message: unknown) => addNotification(message, 'info'),
    [addNotification],
  );

  return (
    <NotificationContext.Provider value={{ showSuccess, showError, showWarning, showInfo }}>
      {children}
      {notifications.map((notification, index) => (
        <Snackbar
          key={notification.id}
          open
          autoHideDuration={4000}
          onClose={() => removeNotification(notification.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{ bottom: { xs: 24 + index * 64 } }}
        >
          <Alert
            onClose={() => removeNotification(notification.id)}
            severity={notification.severity}
            variant="filled"
            elevation={6}
            sx={{ width: '100%', minWidth: 300 }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};
