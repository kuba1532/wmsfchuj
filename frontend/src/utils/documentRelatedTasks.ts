import { TaskType, TASK_TYPE_LABELS } from '@/constants/taskTypes';
import { TaskStatus, TASK_STATUS_LABELS } from '@/constants/taskStatuses';

export function documentLinkedTaskTypeLabel(type: string): string {
  return TASK_TYPE_LABELS[type as TaskType] ?? type;
}

export function documentLinkedTaskStatusLabel(status: string): string {
  return TASK_STATUS_LABELS[status as TaskStatus] ?? status;
}
