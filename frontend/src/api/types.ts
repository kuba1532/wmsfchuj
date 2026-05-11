export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// -- Auth --

export interface LoginRequest {
  login: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserResponse;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// -- User --

export interface UserResponse {
  id: number;
  login_code: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'ADMIN' | 'MANAGER' | 'FOREMAN' | 'WORKER';
  is_active: boolean;
  created_at: string;
  version: number;
}

export interface UserCreate {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  password: string;
}

export interface UserUpdate {
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  is_active?: boolean;
  version: number;
}

// -- Product --

export interface ProductResponse {
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

export interface ProductCreate {
  sku: string;
  ean?: string;
  name: string;
  unit?: string;
  description?: string;
}

export interface ProductUpdate {
  name?: string;
  ean?: string;
  unit?: string;
  description?: string;
  is_active?: boolean;
  version: number;
}

// -- Location --

export interface LocationResponse {
  id: number;
  code: string;
  type: 'BUFFER' | 'STORAGE' | 'PICKING_ZONE';
  row: string | null;
  rack: string | null;
  shelf: string | null;
  is_active: boolean;
  created_at: string;
  version: number;
}

export interface LocationCreate {
  code: string;
  type: string;
  row?: string;
  rack?: string;
  shelf?: string;
}

export interface LocationUpdate {
  code?: string;
  type?: string;
  row?: string;
  rack?: string;
  shelf?: string;
  is_active?: boolean;
  version: number;
}

// -- Stock --

export interface StockResponse {
  id: number;
  product_id: number;
  location_id: number;
  quantity: number;
  status: 'AVAILABLE' | 'BLOCKED';
  product: ProductResponse | null;
  location: LocationResponse | null;
}

// -- Document --

export interface DocumentItemResponse {
  id: number;
  product_id: number;
  quantity: number;
  putaway_to_location_id?: number | null;
  putaway_to_location_code?: string | null;
  product: ProductResponse | null;
}

export interface DocumentLinkedTaskBrief {
  id: number;
  type: string;
  status: string;
}

export interface DocumentResponse {
  id: number;
  number: string;
  type: 'PZ' | 'MM' | 'RW';
  status: 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  supplier_id: number | null;
  supplier: string | null;
  from_location_id: number | null;
  to_location_id: number | null;
  from_location_code?: string | null;
  to_location_code?: string | null;
  recipient: string | null;
  created_by_id: number;
  items: DocumentItemResponse[];
  created_at: string;
  related_tasks?: DocumentLinkedTaskBrief[];
}

export interface DocumentItemCreate {
  product_id: number;
  quantity: number;
}

export interface DocumentCreatePZ {
  supplier_id: number;
  to_location_id: number;
  items: DocumentItemCreate[];
}

export interface DocumentCreateMM {
  from_location_id: number;
  to_location_id: number;
  items: DocumentItemCreate[];
}

export interface DocumentCreateRW {
  from_location_id: number;
  recipient_id?: number;
  /** Tekstowe (legacy) — używane tylko gdy brak recipient_id */
  recipient?: string;
  items: DocumentItemCreate[];
}

export interface RecipientResponse {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
}

// -- Task --

export interface TaskResponse {
  id: number;
  type: 'PUTAWAY' | 'PICKING' | 'MOVE' | 'INVENTORY';
  status: 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  product_id: number | null;
  from_location_id: number | null;
  to_location_id: number | null;
  quantity: number;
  assigned_to_id: number | null;
  document_id: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface TaskCreate {
  type: string;
  product_id?: number;
  from_location_id?: number;
  to_location_id?: number;
  quantity?: number;
  assigned_to_id: number;
}

// -- Inventory --

export interface InventoryItemResponse {
  id: number;
  location_id: number;
  product_id: number;
  system_quantity: number;
  actual_quantity: number;
  difference: number;
}

export interface InventoryResponse {
  id: number;
  number: string;
  type: 'FULL' | 'PARTIAL';
  status: string;
  counted_by_id: number;
  approved_by_id: number | null;
  items: InventoryItemResponse[];
  created_at: string;
  approved_at: string | null;
}

export interface InventoryItemCreate {
  location_id: number;
  product_id: number;
  actual_quantity: number;
}

export interface InventoryCreate {
  type: 'FULL' | 'PARTIAL';
  items: InventoryItemCreate[];
}

// -- Ledger --

export interface StockLedgerResponse {
  id: number;
  movement_type: string;
  product_id: number;
  from_location_id: number | null;
  to_location_id: number | null;
  quantity: number;
  document_number: string | null;
  user_id: number;
  created_at: string;
}

// -- Audit --

export interface AuditLogResponse {
  id: number;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details: string | null;
  user_id: number | null;
  created_at: string;
}
