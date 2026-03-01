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
  role: 'ADMINISTRATOR' | 'KIEROWNIK' | 'BRYGADZISTA' | 'MAGAZYNIER';
  is_active: boolean;
  created_at: string;
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
}

// -- Product --

export interface ProductResponse {
  id: number;
  sku: string;
  name: string;
  unit: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ProductCreate {
  sku: string;
  name: string;
  unit?: string;
  description?: string;
}

export interface ProductUpdate {
  name?: string;
  unit?: string;
  description?: string;
  is_active?: boolean;
}

// -- Location --

export interface LocationResponse {
  id: number;
  code: string;
  type: 'BUFFER' | 'STORAGE' | 'PICKING_ZONE';
  is_buffer: boolean;
  row: string | null;
  rack: string | null;
  shelf: string | null;
  is_active: boolean;
  created_at: string;
}

export interface LocationCreate {
  code: string;
  type: string;
  is_buffer?: boolean;
  row?: string;
  rack?: string;
  shelf?: string;
}

export interface LocationUpdate {
  code?: string;
  type?: string;
  is_buffer?: boolean;
  row?: string;
  rack?: string;
  shelf?: string;
  is_active?: boolean;
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
  product: ProductResponse | null;
}

export interface DocumentResponse {
  id: number;
  number: string;
  type: 'PZ' | 'MM' | 'RW';
  status: 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  supplier: string | null;
  from_location_id: number | null;
  to_location_id: number | null;
  recipient: string | null;
  created_by_id: number;
  items: DocumentItemResponse[];
  created_at: string;
}

export interface DocumentItemCreate {
  product_id: number;
  quantity: number;
}

export interface DocumentCreatePZ {
  supplier: string;
  items: DocumentItemCreate[];
}

export interface DocumentCreateMM {
  from_location_id: number;
  to_location_id: number;
  items: DocumentItemCreate[];
}

export interface DocumentCreateRW {
  recipient: string;
  items: DocumentItemCreate[];
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
