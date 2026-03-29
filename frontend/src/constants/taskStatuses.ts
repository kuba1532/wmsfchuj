export enum TaskStatus {
  NEW = 'NEW',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.NEW]: 'Nowy',
  [TaskStatus.ASSIGNED]: 'Przypisany',
  [TaskStatus.IN_PROGRESS]: 'W realizacji',
  [TaskStatus.COMPLETED]: 'Zakończony',
  [TaskStatus.CANCELLED]: 'Anulowany',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  [TaskStatus.NEW]: '#757575',
  [TaskStatus.ASSIGNED]: '#1565C0',
  [TaskStatus.IN_PROGRESS]: '#FF8F00',
  [TaskStatus.COMPLETED]: '#2E7D32',
  [TaskStatus.CANCELLED]: '#D32F2F',
};
