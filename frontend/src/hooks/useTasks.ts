import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/api/client';
import { useNotification } from '@/context/NotificationContext';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

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
  // Rozszerzone dane dołączane przez backend (opcjonalne)
  product?: { id: number; sku: string; name: string; unit?: string } | null;
  from_location?: { id: number; code: string; type?: string } | null;
  to_location?: { id: number; code: string; type?: string } | null;
  product_name?: string;
  from_location_code?: string;
  to_location_code?: string;
  assigned_to_name?: string;
}

interface UseTasksOptions {
  statusFilter?: string;
  /** Jak na mobilce: API pomija COMPLETED/CANCELLED (spójna lista „Aktywne”). */
  omitTerminal?: boolean;
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
  omitTerminal = false,
  page = 1,
  pageSize = 100,
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
      if (omitTerminal) params.append('omit_terminal', 'true');

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
  }, [page, pageSize, statusFilter, omitTerminal]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Szybsza synchronizacja z mobilką (giełda zadań) — aktualizacja co 10s.
  useAutoRefresh(fetchTasks, { intervalMs: 10 * 1000 });

  const startTask = useCallback(
    async (id: number) => {
      await apiClient.post(`/tasks/${id}/start`);
      showSuccess(
        'Zadanie w realizacji — przy odłożeniu (PZ) stany zmieniają się dopiero po zakończeniu z potwierdzeniem miejsca.',
      );
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
