export enum DocumentStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  [DocumentStatus.DRAFT]: 'Nowy',
  [DocumentStatus.CONFIRMED]: 'Zatwierdzony',
  [DocumentStatus.IN_PROGRESS]: 'W trakcie',
  [DocumentStatus.COMPLETED]: 'Zakończony',
  [DocumentStatus.CANCELLED]: 'Anulowany',
};

export const DOCUMENT_STATUS_COLORS: Record<DocumentStatus, string> = {
  [DocumentStatus.DRAFT]: '#757575',
  [DocumentStatus.CONFIRMED]: '#1565C0',
  [DocumentStatus.IN_PROGRESS]: '#FF8F00',
  [DocumentStatus.COMPLETED]: '#2E7D32',
  [DocumentStatus.CANCELLED]: '#D32F2F',
};
