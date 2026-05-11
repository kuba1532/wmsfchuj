import type { TaskItem } from '@/hooks/useTasks';

/** Kod lokalizacji do porównania (skan / wpis) przed zakończeniem zadania — spójnie z aplikacją mobilną. */
export function getExpectedLocationCodeForComplete(task: TaskItem): {
  expected: string | null;
  hint: string;
} {
  const fromCode = task.from_location?.code ?? task.from_location_code ?? null;
  const toCode = task.to_location?.code ?? task.to_location_code ?? null;

  switch (task.type) {
    case 'PUTAWAY':
      return {
        expected: toCode,
        hint: 'Wpisz lub wklej kod miejsca DOCELOWEGO (bufor → regał). Musi zgadzać się z systemem.',
      };
    case 'MOVE':
      return {
        expected: toCode,
        hint: 'Wpisz kod miejsca DOCELOWEGO (dokąd przewiozłeś towar).',
      };
    case 'PICKING':
      return {
        expected: fromCode,
        hint: 'Wpisz kod miejsca ŹRÓDŁOWEGO (skąd zbierasz).',
      };
    case 'INVENTORY':
      return {
        expected: fromCode,
        hint: 'Wpisz kod lokalizacji, którą inwentaryzujesz.',
      };
    default:
      return { expected: null, hint: '' };
  }
}

export function locationCodesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
