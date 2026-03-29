import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/api/client';
import { useNotification } from '@/context/NotificationContext';
import { StockStatus } from '@/constants/stockStatuses';

export interface StockItem {
  id: number;
  product_id: number;
  location_id: number;
  quantity: number;
  status: StockStatus;
  product?: { id: number; sku: string; name: string; unit: string };
  location?: { id: number; code: string; type: string };
}

interface UseStockOptions {
  search?: string;
  statusFilter?: string;
  page?: number;
  pageSize?: number;
}

interface UseStockReturn {
  stock: StockItem[];
  total: number;
  isLoading: boolean;
  refresh: () => void;
  changeStatus: (id: number, status: StockStatus) => Promise<void>;
}

export function useStock({
  search = '',
  statusFilter = '',
  page = 1,
  pageSize = 50,
}: UseStockOptions = {}): UseStockReturn {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useNotification();

  const fetchStock = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status_filter', statusFilter);

      const response = await apiClient.get(`/stock?${params.toString()}`);
      setStock(response.data.items ?? []);
      setTotal(response.data.total ?? 0);
    } catch {
      showError('Nie udało się pobrać stanów magazynowych.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const changeStatus = useCallback(
    async (id: number, status: StockStatus) => {
      await apiClient.patch(`/stock/${id}/status`, { status });
      showSuccess(`Status zmieniony na "${status}".`);
      fetchStock();
    },
    [fetchStock],
  );

  return { stock, total, isLoading, refresh: fetchStock, changeStatus };
}
