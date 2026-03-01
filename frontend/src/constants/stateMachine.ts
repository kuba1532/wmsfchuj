import { DocumentStatus } from './documentStatuses';
import { TaskStatus } from './taskStatuses';

export const DOCUMENT_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  [DocumentStatus.DRAFT]: [DocumentStatus.CONFIRMED, DocumentStatus.CANCELLED],
  [DocumentStatus.CONFIRMED]: [DocumentStatus.IN_PROGRESS, DocumentStatus.CANCELLED],
  [DocumentStatus.IN_PROGRESS]: [DocumentStatus.COMPLETED, DocumentStatus.CANCELLED],
  [DocumentStatus.COMPLETED]: [],
  [DocumentStatus.CANCELLED]: [],
};

export const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.NEW]: [TaskStatus.ASSIGNED, TaskStatus.CANCELLED],
  [TaskStatus.ASSIGNED]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
  [TaskStatus.COMPLETED]: [],
  [TaskStatus.CANCELLED]: [],
};

export const canTransitionDocument = (from: DocumentStatus, to: DocumentStatus): boolean => {
  return DOCUMENT_TRANSITIONS[from].includes(to);
};

export const canTransitionTask = (from: TaskStatus, to: TaskStatus): boolean => {
  return TASK_TRANSITIONS[from].includes(to);
};
