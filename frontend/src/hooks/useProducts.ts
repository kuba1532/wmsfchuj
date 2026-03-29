import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/api/client';
import { useNotification } from '@/context/NotificationContext';

export interface ProductItem {
  id: number;
  sku: string;
  ean: string | null;
  name: string;
  unit: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  version: number;
}

interface UseProductsOptions {
  search?: string;
  page?: number;
  pageSize?: number;
}

interface UseProductsReturn {
  products: ProductItem[];
  total: number;
  pages: number;
  isLoading: boolean;
  refresh: () => void;
  createProduct: (data: ProductCreateData) => Promise<void>;
  updateProduct: (id: number, data: ProductUpdateData) => Promise<void>;
}

export interface ProductCreateData {
  sku: string;
  ean?: string;
  name: string;
  unit: string;
  description?: string;
}

export interface ProductUpdateData extends Partial<ProductCreateData> {
  is_active?: boolean;
  version: number;
}

export function useProducts({
  search = '',
  page = 1,
  pageSize = 25,
}: UseProductsOptions = {}): UseProductsReturn {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useNotification();

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (search) params.append('search', search);

      const response = await apiClient.get(`/products?${params.toString()}`);
      setProducts(response.data.items ?? []);
      setTotal(response.data.total ?? 0);
      setPages(response.data.pages ?? 1);
    } catch {
      showError('Nie udało się pobrać listy produktów.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const createProduct = useCallback(
    async (data: ProductCreateData) => {
      await apiClient.post('/products', data);
      showSuccess(`Produkt "${data.name}" został dodany.`);
      fetchProducts();
    },
    [fetchProducts],
  );

  const updateProduct = useCallback(
    async (id: number, data: ProductUpdateData) => {
      await apiClient.patch(`/products/${id}`, data);
      showSuccess('Produkt został zaktualizowany.');
      fetchProducts();
    },
    [fetchProducts],
  );

  return {
    products,
    total,
    pages,
    isLoading,
    refresh: fetchProducts,
    createProduct,
    updateProduct,
  };
}
