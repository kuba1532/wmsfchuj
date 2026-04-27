# Plan weryfikacji projektu WMS

Cel: upewnić się, że backend, frontend web i aplikacja mobilna są spójne, bezpieczne w podstawowym zakresie i gotowe do wdrożenia testowego.

## 1. Środowisko i uruchomienie

- [ ] Backend: `docker compose` (lub lokalnie) — baza, migracje Alembic, seed admina z logów startowych.
- [ ] Zmienne środowiskowe (`ADMIN_*`, `DATABASE_URL`, sekret JWT) — bez wartości domyślnych w produkcji.
- [ ] Frontend web: `npm install`, `npm run build`, ewentualnie `npm test`.
- [ ] CORS w `main.py` — dozwolone originy zgodne z adresem frontu (nie `*` w produkcji).

## 2. API i kontrakty

- [ ] Health / dokumentacja OpenAPI (`/docs`) — lista endpointów zgodna z routerem `api/v1`.
- [ ] Logowanie: 5-cyfrowy `login`, odpowiedź z `access_token` / `refresh_token`.
- [ ] Uprawnienia ról (WORKER vs FOREMAN vs ADMIN) — zgodnie z `permissions` w frontendzie i `require_permission` w backendzie.
- [ ] Paginacja (`page`, `page_size`, `pages`) — spójność z frontendem i aplikacją mobilną.

## 3. Przepływy domenowe (próbki manualne / testy)

- [ ] **Zadania**: lista dla pracownika tylko przypisane; `start` / `complete` z poprawnych statusów.
- [ ] **Dokumenty PZ**: utworzenie szkicu, wyszukiwanie produktu (SKU/EAN), zatwierdzanie (rola z `documents` FULL).
- [ ] **Stany magazynowe** po zatwierdzeniu (BUFFER dla PZ) — zgodnie z logiką w `documents.py`.

## 4. Bezpieczeństwo i audyt

- [ ] Tokeny JWT — wygaśnięcie, refresh.
- [ ] Blokada konta po nieudanych logowaniach (zgodnie z `MAX_LOGIN_ATTEMPTS`).
- [ ] Logi audytu dla operacji krytycznych (tworzenie dokumentów, start zadania).

## 5. Frontend web (regresja)

- [ ] Logowanie i routing chroniony (`AuthGuard` / `RoleGuard`).
- [ ] Główne ekrany: zadania, dokumenty, produkty — bez błędów w konsoli przy typowym scenariuszu.

## 6. Aplikacja mobilna (`wms_worker`)

- [ ] Adres API (`--dart-define=WMS_API_BASE=...`) zgodny z siecią (emulator Android: `10.0.2.2`, iOS: `localhost`).
- [ ] Logowanie, lista zadań, skan → wyszukanie produktu, utworzenie PZ.
- [ ] Uprawnienia kamery na urządzeniuo fizycznym.

## 7. Jakość kodu i CI (opcjonalnie)

- [ ] `pytest` / testy backendu (jeśli są).
- [ ] `npm test` / `flutter analyze` przed merge.

---

*Lista ma charakter checklisty — kolejność można dostosować do sprintu.*
