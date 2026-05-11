/// Zgodnie z `frontend/src/constants/documentStatuses.ts` (DOCUMENT_STATUS_LABELS).
String documentStatusLabelPl(String status) {
  switch (status) {
    case 'DRAFT':
      return 'Nowy';
    case 'CONFIRMED':
      return 'Zatwierdzony';
    case 'IN_PROGRESS':
      return 'W trakcie';
    case 'COMPLETED':
      return 'Zakończony';
    case 'CANCELLED':
      return 'Anulowany';
    default:
      return status;
  }
}
