import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/api/client';
import { useNotification } from '@/context/NotificationContext';
import { Role } from '@/constants/roles';

export interface UserItem {
  id: number;
  login_code: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  version: number;
}

export interface UserCreateResult {
  user: UserItem;
  setup_password_url: string;
}

interface UseUsersOptions {
  search?: string;
  page?: number;
  pageSize?: number;
}

interface UseUsersReturn {
  users: UserItem[];
  total: number;
  pages: number;
  isLoading: boolean;
  refresh: () => void;
  createUser: (data: UserCreateData) => Promise<UserCreateResult>;
  updateUser: (id: number, data: UserUpdateData) => Promise<void>;
  toggleActive: (user: UserItem) => Promise<void>;
}

export interface UserCreateData {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

export interface UserUpdateData {
  first_name?: string;
  last_name?: string;
  role?: string;
  is_active?: boolean;
  version: number;
}

export function useUsers({
  search = '',
  page = 1,
  pageSize = 25,
}: UseUsersOptions = {}): UseUsersReturn {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useNotification();

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (search) params.append('search', search);

      const response = await apiClient.get(`/users?${params.toString()}`);
      setUsers(response.data.items ?? []);
      setTotal(response.data.total ?? 0);
      setPages(response.data.pages ?? 1);
    } catch {
      showError('Nie udało się pobrać listy użytkowników.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const createUser = useCallback(
    async (data: UserCreateData): Promise<UserCreateResult> => {
      const response = await apiClient.post('/users', data);
      const result: UserCreateResult = response.data;
      showSuccess(
        `Konto dla ${data.first_name} ${data.last_name} utworzone. Login: ${result.user.login_code}.`,
      );
      fetchUsers();
      return result;
    },
    [fetchUsers],
  );

  const updateUser = useCallback(
    async (id: number, data: UserUpdateData) => {
      await apiClient.patch(`/users/${id}`, data);
      showSuccess('Dane użytkownika zostały zaktualizowane.');
      fetchUsers();
    },
    [fetchUsers],
  );

  const toggleActive = useCallback(
    async (user: UserItem) => {
      await apiClient.patch(`/users/${user.id}`, {
        is_active: !user.is_active,
        version: user.version,
      });
      showSuccess(
        `Konto ${user.login_code} zostało ${user.is_active ? 'zablokowane' : 'odblokowane'}.`,
      );
      fetchUsers();
    },
    [fetchUsers],
  );

  return {
    users,
    total,
    pages,
    isLoading,
    refresh: fetchUsers,
    createUser,
    updateUser,
    toggleActive,
  };
}
