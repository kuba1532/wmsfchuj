import '../models/models.dart';

/// Opis „co robić” — dopasowany do typu zadania w WMS (backend: TaskTypeEnum).
String taskTitlePl(String type) {
  switch (type) {
    case 'PUTAWAY':
      return 'Odłożenie (putaway)';
    case 'PICKING':
      return 'Kompletacja (picking)';
    case 'MOVE':
      return 'Przesunięcie między lokalizacjami';
    case 'INVENTORY':
      return 'Inwentaryzacja';
    default:
      return type;
  }
}

/// Instrukcja dla pracownika — powiązana z ID lokalizacji (mapa kodów przekaż z zewnątrz).
String taskInstruction(TaskItem t, Map<int, String> locationCodeById) {
  String loc(int? id) {
    if (id == null) return '—';
    return locationCodeById[id] ?? '#$id';
  }

  switch (t.type) {
    case 'PUTAWAY':
      return 'Odbierz towar ze strefy przyjęć i odłóż do lokalizacji docelowej: ${loc(t.toLocationId)}. '
          'Ilość: ${t.quantity ?? "—"}.';
    case 'PICKING':
      return 'Zbierz z lokalizacji ${loc(t.fromLocationId)} w ilości ${t.quantity ?? "—"} '
          '(towar do kompletacji zamówienia / wysyłki).';
    case 'MOVE':
      return 'Przenieś towar z ${loc(t.fromLocationId)} do ${loc(t.toLocationId)} — ilość ${t.quantity ?? "—"}.';
    case 'INVENTORY':
      return 'Policz stan w lokalizacji ${loc(t.fromLocationId)} i zapisz wynik (zadanie inwentaryzacyjne).';
    default:
      return 'Wykonaj zadanie według procedur magazynu.';
  }
}
