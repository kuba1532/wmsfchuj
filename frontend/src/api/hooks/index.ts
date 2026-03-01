import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../client';
import type {
  PaginatedResponse,
  UserResponse,
  UserCreate,
  UserUpdate,
  ProductResponse,
  ProductCreate,
  ProductUpdate,
  LocationResponse,
  LocationCreate,
  LocationUpdate,
  StockResponse,
  DocumentResponse,
  DocumentCreatePZ,
  DocumentCreateMM,
  DocumentCreateRW,
  TaskResponse,
  TaskCreate,
  InventoryResponse,
  InventoryCreate,
  StockLedgerResponse,
  AuditLogResponse,
} from '../types';

// ── USERS ──

export function useUsers(page = 1, pageSize = 10, search = '') {
  return useQuery({
    queryKey: ['users', page, pageSize, search],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<UserResponse>>('/users', {
        params: { page, page_size: pageSize, search },
      });
      return data;
    },
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const { data } = await apiClient.get<UserResponse>(`/users/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UserCreate) => {
      const { data } = await apiClient.post<UserResponse>('/users', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UserUpdate & { id: number }) => {
      const { data } = await apiClient.patch<UserResponse>(`/users/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

// ── PRODUCTS ──

export function useProducts(page = 1, pageSize = 10, search = '') {
  return useQuery({
    queryKey: ['products', page, pageSize, search],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<ProductResponse>>('/products', {
        params: { page, page_size: pageSize, search },
      });
      return data;
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProductCreate) => {
      const { data } = await apiClient.post<ProductResponse>('/products', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: ProductUpdate & { id: number }) => {
      const { data } = await apiClient.patch<ProductResponse>(`/products/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

// ── LOCATIONS ──

export function useLocations(page = 1, pageSize = 10, search = '') {
  return useQuery({
    queryKey: ['locations', page, pageSize, search],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<LocationResponse>>('/locations', {
        params: { page, page_size: pageSize, search },
      });
      return data;
    },
  });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: LocationCreate) => {
      const { data } = await apiClient.post<LocationResponse>('/locations', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locations'] }),
  });
}

export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: LocationUpdate & { id: number }) => {
      const { data } = await apiClient.patch<LocationResponse>(`/locations/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locations'] }),
  });
}

// ── STOCK ──

export function useStock(page = 1, pageSize = 10, statusFilter = '') {
  return useQuery({
    queryKey: ['stock', page, pageSize, statusFilter],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<StockResponse>>('/stock', {
        params: { page, page_size: pageSize, status_filter: statusFilter || undefined },
      });
      return data;
    },
  });
}

export function useChangeStockStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'AVAILABLE' | 'BLOCKED' }) => {
      const { data } = await apiClient.patch<StockResponse>(`/stock/${id}/status`, { status });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stock'] }),
  });
}

// ── DOCUMENTS ──

export function useDocuments(page = 1, pageSize = 10, docType = '', search = '') {
  return useQuery({
    queryKey: ['documents', page, pageSize, docType, search],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<DocumentResponse>>('/documents', {
        params: {
          page,
          page_size: pageSize,
          doc_type: docType || undefined,
          search: search || undefined,
        },
      });
      return data;
    },
  });
}

export function useDocument(id: number) {
  return useQuery({
    queryKey: ['documents', id],
    queryFn: async () => {
      const { data } = await apiClient.get<DocumentResponse>(`/documents/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreatePZ() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: DocumentCreatePZ) => {
      const { data } = await apiClient.post<DocumentResponse>('/documents/pz', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useCreateMM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: DocumentCreateMM) => {
      const { data } = await apiClient.post<DocumentResponse>('/documents/mm', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useCreateRW() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: DocumentCreateRW) => {
      const { data } = await apiClient.post<DocumentResponse>('/documents/rw', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useConfirmDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.post<DocumentResponse>(`/documents/${id}/confirm`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useGenerateTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: number) => {
      const { data } = await apiClient.post(`/documents/${documentId}/generate-tasks`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// ── TASKS ──

export function useTasks(page = 1, pageSize = 10, statusFilter = '') {
  return useQuery({
    queryKey: ['tasks', page, pageSize, statusFilter],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<TaskResponse>>('/tasks', {
        params: { page, page_size: pageSize, status_filter: statusFilter || undefined },
      });
      return data;
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TaskCreate) => {
      const { data } = await apiClient.post<TaskResponse>('/tasks', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useStartTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.post<TaskResponse>(`/tasks/${id}/start`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.post<TaskResponse>(`/tasks/${id}/complete`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

// ── INVENTORY ──

export function useInventories(page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ['inventory', page, pageSize],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<InventoryResponse>>('/inventory', {
        params: { page, page_size: pageSize },
      });
      return data;
    },
  });
}

export function useInventory(id: number) {
  return useQuery({
    queryKey: ['inventory', id],
    queryFn: async () => {
      const { data } = await apiClient.get<InventoryResponse>(`/inventory/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: InventoryCreate) => {
      const { data } = await apiClient.post<InventoryResponse>('/inventory', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  });
}

export function useApproveInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.post<InventoryResponse>(`/inventory/${id}/approve`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
    },
  });
}

// ── LEDGER ──

export function useLedger(page = 1, pageSize = 10, search = '') {
  return useQuery({
    queryKey: ['ledger', page, pageSize, search],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<StockLedgerResponse>>('/ledger', {
        params: { page, page_size: pageSize, search: search || undefined },
      });
      return data;
    },
  });
}

// ── AUDIT LOG ──

export function useAuditLog(page = 1, pageSize = 10, entityType = '', action = '') {
  return useQuery({
    queryKey: ['audit-log', page, pageSize, entityType, action],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<AuditLogResponse>>('/audit-log', {
        params: {
          page,
          page_size: pageSize,
          entity_type: entityType || undefined,
          action: action || undefined,
        },
      });
      return data;
    },
  });
}

// ── AUTH (change password, unlock) ──

export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: { current_password: string; new_password: string }) => {
      const { data } = await apiClient.post('/auth/change-password', payload);
      return data;
    },
  });
}

export function useUnlockAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: number) => {
      const { data } = await apiClient.post(`/auth/unlock/${userId}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
