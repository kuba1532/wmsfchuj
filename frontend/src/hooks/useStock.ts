import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/api/client';
import { useNotification } from '@/context/NotificationContext';
import { StockStatus } from '@/constants/stockStatuses';
import { useChangeSignal } from '@/hooks/useChangeSignal';

export interface StockItem {
  id: number;
  product_id: number;
  location_id: number;
  quantity: number;
  status: StockStatus;
  version?: number;
  product?: { id: number; sku: string; name: string; unit: string };
  location?: { id: number; code: string; type: string };
}

interface UseStockOptions {
  search?: string;
  statusFilter?: string;
  page?: number;
  pageSize?: number;
  autoRefreshEnabled?: boolean;
}

interface UseStockReturn {
  stock: StockItem[];
  total: number;
  isLoading: boolean;
  refresh: () => void;
  changeStatus: (
    id: number,
    status: StockStatus,
    version?: number,
    quantity?: number,
  ) => Promise<void>;
}

export function useStock({
  search = '',
  statusFilter = '',
  page = 1,
  pageSize = 50,
  autoRefreshEnabled = true,
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

  // Odświeżaj tylko po wykryciu zmiany w systemie (web/mobilka), bez "na pale".
  useChangeSignal(fetchStock, {
    enabled: autoRefreshEnabled,
    intervalMs: 2000,
  });

  const changeStatus = useCallback(
    async (id: number, status: StockStatus, version?: number, quantity?: number) => {
      const current = stock.find((s) => s.id === id);
      const payloadVersion = version ?? current?.version ?? 1;
      const payload: { status: StockStatus; version: number; quantity?: number } = {
        status,
        version: payloadVersion,
      };
      if (quantity !== undefined && quantity > 0) {
        payload.quantity = quantity;
      }
      await apiClient.patch(`/stock/${id}/status`, payload);
      const qtyInfo = quantity && current && quantity < Number(current.quantity)
        ? ` (${quantity} z ${current.quantity})`
        : '';
      showSuccess(`Status zmieniony na "${status}"${qtyInfo}.`);
      fetchStock();
    },
    [fetchStock, stock],
  );

  return { stock, total, isLoading, refresh: fetchStock, changeStatus };
}
