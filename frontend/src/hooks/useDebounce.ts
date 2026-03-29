import { useState, useEffect } from 'react';

/**
 * Debounce wartości — zwraca opóźnioną wersję podanej wartości.
 * Używaj zamiast ręcznego clearTimeout w wyszukiwarkach.
 *
 * Przykład:
 *   const [search, setSearch] = useState('');
 *   const debouncedSearch = useDebounce(search, 400);
 *   // użyj debouncedSearch w query/API call
 */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
