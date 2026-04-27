import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/api/client';
import { useNotification } from '@/context/NotificationContext';
import { LocationType } from '@/constants/locationTypes';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

export interface LocationItem {
  id: number;
  code: string;
  type: LocationType;
  row: string | null;
  rack: string | null;
  shelf: string | null;
  is_active: boolean;
  created_at: string;
  version: number;
}

interface UseLocationsOptions {
  search?: string;
  page?: number;
  pageSize?: number;
}

interface UseLocationsReturn {
  locations: LocationItem[];
  total: number;
  pages: number;
  isLoading: boolean;
  refresh: () => void;
  createLocation: (data: LocationCreateData) => Promise<void>;
  updateLocation: (id: number, data: LocationUpdateData) => Promise<void>;
}

export interface LocationCreateData {
  code: string;
  type: string;
  row?: string;
  rack?: string;
  shelf?: string;
}

export interface LocationUpdateData extends Partial<LocationCreateData> {
  is_active?: boolean;
  version: number;
}

export function useLocations({
  search = '',
  page = 1,
  pageSize = 25,
}: UseLocationsOptions = {}): UseLocationsReturn {
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useNotification();

  const fetchLocations = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (search) params.append('search', search);

      const response = await apiClient.get(`/locations?${params.toString()}`);
      setLocations(response.data.items ?? []);
      setTotal(response.data.total ?? 0);
      setPages(response.data.pages ?? 1);
    } catch {
      showError('Nie udało się pobrać listy lokalizacji.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useAutoRefresh(fetchLocations);

  const createLocation = useCallback(
    async (data: LocationCreateData) => {
      await apiClient.post('/locations', data);
      showSuccess(`Lokalizacja "${data.code}" została dodana.`);
      fetchLocations();
    },
    [fetchLocations],
  );

  const updateLocation = useCallback(
    async (id: number, data: LocationUpdateData) => {
      await apiClient.patch(`/locations/${id}`, data);
      showSuccess('Lokalizacja została zaktualizowana.');
      fetchLocations();
    },
    [fetchLocations],
  );

  return {
    locations,
    total,
    pages,
    isLoading,
    refresh: fetchLocations,
    createLocation,
    updateLocation,
  };
}
