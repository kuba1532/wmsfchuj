import '../models/models.dart';

/// Opis „co robić” — dopasowany do typu zadania w WMS (backend: TaskTypeEnum).
/// Nazwy pod osoby nietechniczne: PUTAWAY = po przyjęciu z bufora na regał; MOVE = zwykłe MM w środku magazynu.
String taskTitlePl(String type) {
  switch (type) {
    case 'PUTAWAY':
      return 'Odłożenie po przyjęciu';
    case 'PICKING':
      return 'Kompletacja (zbieranie)';
    case 'MOVE':
      return 'Przeniesienie w magazynie';
    case 'INVENTORY':
      return 'Inwentaryzacja';
    default:
      return type;
  }
}

/// Krótki status zadania — te same słowa co na panelu webowym.
String taskStatusBriefPl(String status) {
  switch (status) {
    case 'NEW':
      return 'Nowy';
    case 'ASSIGNED':
      return 'Przypisany';
    case 'IN_PROGRESS':
      return 'W realizacji';
    case 'COMPLETED':
      return 'Zakończony';
    case 'CANCELLED':
      return 'Anulowany';
    default:
      return status;
  }
}

extension DocumentHeaderRelatedTasksX on DocumentHeader {
  String get relatedTasksLine {
    if (relatedTasks.isEmpty) return 'Zadania: brak';
    final parts = relatedTasks.asMap().entries.map((e) {
      final i = e.key + 1;
      final t = e.value;
      return '$i. #${t.id} ${taskTitlePl(t.type)} · ${taskStatusBriefPl(t.status)}';
    }).join(' · ');
    return 'Zadania: $parts';
  }
}

/// Krótkie wyjaśnienie dwóch kroków (start vs complete) — backend nie przesuwa towaru przy „start”.
String taskLifecycleHintPl(String type) {
  switch (type) {
    case 'PUTAWAY':
      return 'Krok 1: „Rozpocznij pracę” — tylko informacja, że pracujesz. '
          'Krok 2: „Zakończ (kod miejsca)” po fizycznym odłożeniu — wtedy system '
          'zdejmuje towar z bufora i księguje odłożenie.';
    case 'MOVE':
      return 'Krok 1: „Rozpocznij pracę”. Krok 2: „Zakończ (kod miejsca)” po przeniesieniu; '
          'potwierdzasz miejsce docelowe, co chroni przed przypadkowym zakończeniem bez czynności.';
    case 'PICKING':
      return 'Krok 1: „Rozpocznij pracę”. Krok 2: „Zakończ (kod miejsca)” — '
          'potwierdzasz skanem lokalizację źródłową, żeby nie zakończyć przypadkiem bez realnego zbierania.';
    case 'INVENTORY':
      return 'Krok 1: „Rozpocznij pracę”. Krok 2: „Zakończ (kod miejsca)” '
          'z potwierdzeniem lokalizacji do policzenia.';
    default:
      return '„Rozpocznij pracę” nie zmienia stanów magazynu — '
          '„Zakończ (kod miejsca)” wymaga potwierdzenia.';
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
      return 'Towar jest na buforze przyjęć. Fizycznie odłóż na regał: ${loc(t.toLocationId)}. '
          'Ilość: ${t.quantity ?? "—"}.';
    case 'PICKING':
      return 'Zbierz z lokalizacji ${loc(t.fromLocationId)} w ilości ${t.quantity ?? "—"} '
          '(kompletacja / wydanie).';
    case 'MOVE':
      return 'Przenieś towar między miejscami w magazynie: z ${loc(t.fromLocationId)} do ${loc(t.toLocationId)} — ilość ${t.quantity ?? "—"}.';
    case 'INVENTORY':
      return 'Policz stan w lokalizacji ${loc(t.fromLocationId)} i zapisz wynik (zadanie inwentaryzacyjne).';
    default:
      return 'Wykonaj zadanie według procedur magazynu.';
  }
}
