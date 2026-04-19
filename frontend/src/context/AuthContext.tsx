import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Role } from '@/constants/roles';

interface User {
  id: number;
  login: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Dekoduje payload JWT bez weryfikacji podpisu (backend weryfikuje)
const decodeTokenPayload = (token: string): Record<string, unknown> | null => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

// Sprawdza czy token wygasł (z buforem 10s)
const isTokenExpired = (token: string): boolean => {
  const payload = decodeTokenPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return payload.exp * 1000 < Date.now() + 10_000;
};

const clearStorage = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

// Synchroniczny odczyt zapisanej sesji z localStorage — MUSI byc wykonany
// w lazy-initializerze useState, inaczej pierwszy render widzi null
// i AuthGuard przekierowuje na /login zanim useEffect zdązy przywrócić stan
// (to by znaczyło: F5/bezpośredni URL = wylogowanie).
const loadStoredSession = (): { token: string | null; refresh: string | null; user: User | null } => {
  const storedAccess = localStorage.getItem('accessToken');
  const storedRefresh = localStorage.getItem('refreshToken');
  const storedUser = localStorage.getItem('user');

  if (!storedAccess || !storedUser) {
    clearStorage();
    return { token: null, refresh: null, user: null };
  }

  if (isTokenExpired(storedAccess)) {
    clearStorage();
    return { token: null, refresh: null, user: null };
  }

  try {
    return { token: storedAccess, refresh: storedRefresh, user: JSON.parse(storedUser) };
  } catch {
    clearStorage();
    return { token: null, refresh: null, user: null };
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const initial = loadStoredSession();
  const [user, setUser] = useState<User | null>(initial.user);
  const [accessToken, setAccessToken] = useState<string | null>(initial.token);
  const [refreshToken, setRefreshToken] = useState<string | null>(initial.refresh);

  // Auto-logout gdy token wygasa podczas aktywnej sesji
  useEffect(() => {
    if (!accessToken) return;

    const payload = decodeTokenPayload(accessToken);
    if (!payload || typeof payload.exp !== 'number') return;

    const msUntilExpiry = payload.exp * 1000 - Date.now();
    if (msUntilExpiry <= 0) return;

    const timer = setTimeout(() => {
      logout();
    }, msUntilExpiry);

    return () => clearTimeout(timer);
  }, [accessToken]);

  const login = useCallback((newAccessToken: string, newRefreshToken: string, newUser: User) => {
    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);
    setUser(newUser);
    localStorage.setItem('accessToken', newAccessToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  }, []);

  const logout = useCallback(() => {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    clearStorage();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        login,
        logout,
        isAuthenticated: !!accessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
