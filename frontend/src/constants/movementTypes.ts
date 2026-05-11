export enum MovementType {
  RECEIVE = 'RECEIPT',
  PUTAWAY = 'PUTAWAY',
  MOVE = 'MOVE',
  PICK = 'PICK',
  CORRECTION = 'INVENTORY_CORRECTION',
}

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  [MovementType.RECEIVE]: 'Przyjęcie',
  [MovementType.PUTAWAY]: 'Odłożenie po przyjęciu',
  [MovementType.MOVE]: 'Przeniesienie w magazynie',
  [MovementType.PICK]: 'Wydanie',
  [MovementType.CORRECTION]: 'Korekta inwentaryzacyjna',
};
