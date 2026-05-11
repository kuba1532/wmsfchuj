export enum TaskType {
  PUTAWAY = 'PUTAWAY',
  MOVE = 'MOVE',
  PICKING = 'PICKING',
  INVENTORY = 'INVENTORY',
}

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  [TaskType.PUTAWAY]: 'Odłożenie po przyjęciu',
  [TaskType.MOVE]: 'Przeniesienie w magazynie',
  [TaskType.PICKING]: 'Kompletacja (zbieranie)',
  [TaskType.INVENTORY]: 'Inwentaryzacja',
};
