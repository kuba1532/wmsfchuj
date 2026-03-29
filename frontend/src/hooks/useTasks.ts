import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/api/client';
import { useNotification } from '@/context/NotificationContext';

export interface TaskItem {
  id: number;
  type: string;
  status: string;
  product_id: number | null;
  from_location_id: number | null;
  to_location_id: number | null;
  quantity: number;
  assigned_to_id: number | null;
  document_id: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  // Rozszerzone dane dołączane przez frontend (opcjonalne)
  product_name?: string;
  from_location_code?: string;
  to_location_code?: string;
  assigned_to_name?: string;
}

interface UseTasksOptions {
  statusFilter?: string;
  page?: number;
  pageSize?: number;
}

interface UseTasksReturn {
  tasks: TaskItem[];
  total: number;
  pages: number;
  isLoading: boolean;
  refresh: () => void;
  startTask: (id: number) => Promise<void>;
  completeTask: (id: number) => Promise<void>;
  cancelTask: (id: number) => Promise<void>;
}

export function useTasks({
  statusFilter = '',
  page = 1,
  pageSize = 50,
}: UseTasksOptions = {}): UseTasksReturn {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useNotification();

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (statusFilter) params.append('status_filter', statusFilter);

      const response = await apiClient.get(`/tasks?${params.toString()}`);
      const data = response.data;

      setTasks(data.items ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } catch {
      showError('Nie udało się pobrać listy zadań.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const startTask = useCallback(
    async (id: number) => {
      await apiClient.post(`/tasks/${id}/start`);
      showSuccess('Zadanie rozpoczęte.');
      fetchTasks();
    },
    [fetchTasks],
  );

  const completeTask = useCallback(
    async (id: number) => {
      await apiClient.post(`/tasks/${id}/complete`);
      showSuccess('Zadanie zakończone.');
      fetchTasks();
    },
    [fetchTasks],
  );

  const cancelTask = useCallback(
    async (id: number) => {
      await apiClient.post(`/tasks/${id}/cancel`);
      showSuccess('Zadanie anulowane.');
      fetchTasks();
    },
    [fetchTasks],
  );

  return {
    tasks,
    total,
    pages,
    isLoading,
    refresh: fetchTasks,
    startTask,
    completeTask,
    cancelTask,
  };
}
