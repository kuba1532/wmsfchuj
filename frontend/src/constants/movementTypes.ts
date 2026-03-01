export enum MovementType {
  RECEIVE = 'PRZYJECIE',
  PUTAWAY = 'ROZMIESZENIE',
  MOVE = 'PRZESUNIECIE',
  PICK = 'WYDANIE',
  CORRECTION = 'KOREKTA',
}

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  [MovementType.RECEIVE]: 'Przyjęcie',
  [MovementType.PUTAWAY]: 'Rozmieszczenie',
  [MovementType.MOVE]: 'Przesunięcie',
  [MovementType.PICK]: 'Wydanie',
  [MovementType.CORRECTION]: 'Korekta inwentaryzacyjna',
};
