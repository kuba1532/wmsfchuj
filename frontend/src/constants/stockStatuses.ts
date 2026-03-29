export enum StockStatus {
  AVAILABLE = 'AVAILABLE',
  BLOCKED = 'BLOCKED',
}

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  [StockStatus.AVAILABLE]: 'Dostępny',
  [StockStatus.BLOCKED]: 'Zablokowany / Uszkodzony',
};

export const STOCK_STATUS_COLORS: Record<StockStatus, string> = {
  [StockStatus.AVAILABLE]: '#2E7D32',
  [StockStatus.BLOCKED]: '#D32F2F',
};
