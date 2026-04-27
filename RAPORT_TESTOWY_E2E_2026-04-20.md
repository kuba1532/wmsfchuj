# Raport testowy E2E WMS (2026-04-20)

## 1) Scenariusz testowy (zakres)

1. Uruchomione usługi bazowe:
   - backend API na `http://127.0.0.1:8000`
   - frontend Vite na `http://127.0.0.1:5173`
2. Weryfikacja backendu:
   - `GET /api/health`
   - dostępność `/api/docs`
3. Przepływ API end-to-end:
   - logowanie admina
   - odczyt kluczowych zasobów (`products`, `locations`, `stock`, `documents`, `tasks`, `inventory`, `users`, `audit-log`, `suppliers`)
   - scenariusz MM (create + confirm + auto-zadania)
   - scenariusz częściowego blokowania stanu
4. Przepływ web end-to-end z przeglądarką:
   - logowanie
   - przejście przez wszystkie zakładki i podstrony
   - screenshot po każdej zakładce
   - kontrola błędów JS i API 4xx/5xx
5. Weryfikacja aplikacji mobilnej Flutter (`wms_worker`):
   - `flutter analyze`
   - `flutter test`
   - uruchomienie na Chrome z `WMS_API_BASE=http://127.0.0.1:8000`
   - screenshot ekranu startowego/logowania

## 2) Wyniki krok po kroku

- Backend health: **OK** (`{"status":"ok","version":"1.0.0","database":"ok"}`)
- API docs: **OK** (`/api/docs` zwraca Swagger UI)
- API scenario (`e2e_tests/api_scenarios.mjs`): **OK, 18/18**
  - brak FAIL/SKIP
  - MM create/confirm działa
  - auto-generowanie zadań po MM działa
  - częściowe blokowanie stanu działa
- Web tab traversal (`e2e_tests/run_tabs_chrome.mjs`): **OK**
  - logowanie: OK
  - wszystkie zakładki: OK
  - błędy JS: 0
  - błędy API 4xx/5xx: 0
- Flutter worker:
  - `flutter test`: **OK**
  - `flutter analyze`: **INFO x4** (bez błędów blokujących build)
  - uruchomienie z backendem (`flutter run -d chrome --web-port 7357 --dart-define=WMS_API_BASE=http://127.0.0.1:8000`): **OK** (debug service wystartował)

## 3) Artefakty (screeny i raporty)

- Web komplet (bieżące uruchomienie):
  - katalog: `e2e_tests/screens/run_1776697332433`
  - raport: `e2e_tests/screens/run_1776697332433/report.json`
  - pliki ekranów: `dashboard.png`, `products.png`, `locations.png`, `stock.png`, `documents_pz.png`, `documents_mm.png`, `documents_rw.png`, `tasks.png`, `putaway.png`, `picking.png`, `inventory.png`, `users.png`, `reports.png`, `audit_log.png`, `suppliers.png`, `settings.png`
- Flutter worker screenshot:
  - `e2e_tests/screens/flutter_worker_login.png`

## 4) Uwagi

- W `flutter analyze` są 4 ostrzeżenia typu `use_build_context_synchronously`:
  - `lib/screens/mm_tab.dart`
  - `lib/screens/rw_tab.dart`
- Ostrzeżenia nie zablokowały uruchomienia, ale warto je poprawić przed release.
