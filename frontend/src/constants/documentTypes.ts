export enum DocumentType {
  PZ = 'PZ',
  MM = 'MM',
  RW = 'RW',
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  [DocumentType.PZ]: 'Przyjęcie zewnętrzne',
  [DocumentType.MM]: 'Przesunięcie międzymagazynowe',
  [DocumentType.RW]: 'Rozchód wewnętrzny / Wydanie',
};
