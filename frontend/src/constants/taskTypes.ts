export enum TaskType {
  PUTAWAY = 'PUTAWAY',
  MOVE = 'PRZESUNIĘCIE',
  PICKING = 'PICKING',
  INVENTORY = 'INWENTARYZACJA',
}

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  [TaskType.PUTAWAY]: 'Rozmieszczanie',
  [TaskType.MOVE]: 'Przesunięcie',
  [TaskType.PICKING]: 'Kompletacja',
  [TaskType.INVENTORY]: 'Inwentaryzacja',
};
