import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/api/client';
import { useNotification } from '@/context/NotificationContext';
import { DocumentStatus } from '@/constants/documentStatuses';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

export interface DocumentLineItem {
  id: number;
  product_id: number;
  quantity: number;
  product?: { id: number; sku: string; name: string; unit?: string } | null;
}

export interface DocumentItem {
  id: number;
  number: string;
  type: string;
  status: DocumentStatus;
  supplier_id?: number;
  supplier?: string;
  from_location_id?: number;
  to_location_id?: number;
  from_location_code?: string;
  to_location_code?: string;
  recipient?: string;
  created_by_id: number;
  created_at: string;
  items?: DocumentLineItem[];
}

interface UseDocumentsOptions {
  docType?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

interface UseDocumentsReturn {
  documents: DocumentItem[];
  total: number;
  isLoading: boolean;
  refresh: () => void;
  createPZ: (data: {
    supplier_id: number;
    items: { product_id: number; quantity: number }[];
  }) => Promise<DocumentItem>;
  pzStart: (id: number) => Promise<void>;
  pzComplete: (id: number) => Promise<void>;
  createMM: (data: {
    from_location_id: number;
    to_location_id: number;
    items: { product_id: number; quantity: number }[];
  }) => Promise<DocumentItem>;
  createRW: (data: {
    recipient: string;
    items: { product_id: number; quantity: number }[];
  }) => Promise<DocumentItem>;
  confirmDocument: (id: number) => Promise<void>;
  generateTasks: (id: number) => Promise<void>;
}

export function useDocuments({
  docType = '',
  search = '',
  page = 1,
  pageSize = 25,
}: UseDocumentsOptions = {}): UseDocumentsReturn {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useNotification();

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (docType) params.append('doc_type', docType);
      if (search) params.append('search', search);

      const response = await apiClient.get(`/documents?${params.toString()}`);
      setDocuments(response.data.items ?? []);
      setTotal(response.data.total ?? 0);
    } catch {
      showError('Nie udało się pobrać dokumentów.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, docType, search]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useAutoRefresh(fetchDocuments);

  const createPZ = useCallback(
    async (data: Parameters<UseDocumentsReturn['createPZ']>[0]) => {
      const response = await apiClient.post('/documents/pz', data);
      showSuccess(`Dokument ${response.data.number} został utworzony.`);
      fetchDocuments();
      return response.data;
    },
    [fetchDocuments],
  );

  const pzStart = useCallback(
    async (id: number) => {
      await apiClient.post(`/documents/${id}/pz/start`);
      showSuccess('Przyjęcie oznaczono jako w trakcie.');
      fetchDocuments();
    },
    [fetchDocuments, showSuccess],
  );

  const pzComplete = useCallback(
    async (id: number) => {
      await apiClient.post(`/documents/${id}/pz/complete`);
      showSuccess('Przyjęcie zakończono — utworzono zadania odłożenia.');
      fetchDocuments();
    },
    [fetchDocuments, showSuccess],
  );

  const createMM = useCallback(
    async (data: Parameters<UseDocumentsReturn['createMM']>[0]) => {
      const response = await apiClient.post('/documents/mm', data);
      showSuccess(`Dokument ${response.data.number} został utworzony.`);
      fetchDocuments();
      return response.data;
    },
    [fetchDocuments],
  );

  const createRW = useCallback(
    async (data: Parameters<UseDocumentsReturn['createRW']>[0]) => {
      const response = await apiClient.post('/documents/rw', data);
      showSuccess(`Dokument ${response.data.number} został utworzony.`);
      fetchDocuments();
      return response.data;
    },
    [fetchDocuments],
  );

  const confirmDocument = useCallback(
    async (id: number) => {
      await apiClient.post(`/documents/${id}/confirm`);
      showSuccess('Dokument został zatwierdzony.');
      fetchDocuments();
    },
    [fetchDocuments],
  );

  const generateTasks = useCallback(
    async (id: number) => {
      await apiClient.post(`/documents/${id}/generate-tasks`);
      showSuccess('Zadania zostały wygenerowane.');
      fetchDocuments();
    },
    [fetchDocuments],
  );

  return {
    documents,
    total,
    isLoading,
    refresh: fetchDocuments,
    createPZ,
    pzStart,
    pzComplete,
    createMM,
    createRW,
    confirmDocument,
    generateTasks,
  };
}
