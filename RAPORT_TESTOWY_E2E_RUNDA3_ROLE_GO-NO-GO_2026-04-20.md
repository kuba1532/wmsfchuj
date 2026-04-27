# Raport E2E Runda 3 — Role i GO/NO-GO (2026-04-20)

## Cel

Weryfikacja akceptacyjna per rola: `ADMIN`, `FOREMAN`, `WORKER` pod kątem:
- logowania,
- dostępu do kluczowych obszarów,
- separacji uprawnień,
- stabilności (brak krytycznych błędów 5xx).

## Decyzja końcowa

- **GO** (brak krytycznych błędów).
- `criticalFailures = 0`.

## Wynik API (macierz uprawnień)

- `ADMIN`: pełny dostęp do wszystkich sprawdzonych endpointów.
- `FOREMAN`: poprawny brak dostępu do `users` (HTTP 403), dostęp do pozostałych obszarów.
- `WORKER`: poprawne ograniczenia:
  - brak dostępu do `inventory` (HTTP 403),
  - brak dostępu do `users` (HTTP 403),
  - brak dostępu do `audit-log` (HTTP 403),
  - dostęp do obszarów operacyjnych (`tasks`, `documents`, `stock`, `products`, `locations`, `suppliers`).

To zachowanie jest spójne z modelem uprawnień rolowych.

## Wynik UI (web)

- Logowanie: OK dla każdej roli.
- Nawigacja i zrzuty ekranów wykonane dla tras:
  - `/dashboard`, `/tasks`, `/documents/mm`, `/users`, `/audit-log`
- Dla `FOREMAN` i `WORKER` wejście na `/users` kończy się przekierowaniem na dashboard (zgodne z ograniczeniem uprawnień).

## Artefakty

- Raport API rola/uprawnienia:
  - `e2e_tests/screens/round3_roles_api_report.json`
- Screeny web rola/uprawnienia:
  - `e2e_tests/screens/round3_roles_web_1776697919696`
  - `e2e_tests/screens/round3_roles_web_1776697919696/report.json`

## Checklista akceptacyjna (spełniona)

- [x] Logowanie działa dla `ADMIN`, `FOREMAN`, `WORKER`
- [x] Role widzą właściwe obszary
- [x] Ograniczone role mają blokady na obszary wrażliwe
- [x] Brak błędów krytycznych 5xx w testach
- [x] Zrzuty ekranów wykonane dla ścieżek kontrolnych
