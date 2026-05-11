# Plan testów manualnych i automatycznych WMS

**Cel:** wykonać ręczne testy pod raport oraz zrozumieć, co realnie pokrywają automaty.  
**Data przygotowania:** 11.05.2026

---

## 1) Testy manualne — scenariusz krok po kroku (pod raport)

## 1.1. Przygotowanie środowiska

1. Uruchom backend (`http://127.0.0.1:8000`) i frontend (`http://127.0.0.1:5173`).
2. Sprawdź health: `GET /api/health` = 200.
3. Przygotuj konta:
   - ADMIN: `00001`
   - WORKER: `00002`
   - FOREMAN: konto brygadzisty z seedu
4. Wyczyść stare sesje (wylogowanie/localStorage), aby uniknąć fałszywych wyników.
5. Otwórz arkusz raportowy: `SCENARIUS_TESTOW_RECZNY_WYMAGANIA.xlsx`.

---

## 1.2. Format raportowania (jak zapisywać wynik)

Wynik wpisuj jako: `PASS` / `FAIL` / `CZĘŚCIOWO` / `BLOK` / `N/D`.  
Do każdego FAIL/BLOK dopisz:
- krok, na którym padło,
- komunikat błędu,
- screen i/lub log.

**Minimalny zestaw dowodów do raportu:**
- screen logowania,
- screen utworzonego PZ/MM/RW,
- screen zadania (MOVE/PICKING/PUTAWAY),
- screen stanu magazynowego po operacji,
- screen ledger/audit.

---

## 1.3. Scenariusze manualne do wykonania

## M1 — Logowanie i sesja (web)
**Cel:** sprawdzić autoryzację i podstawową sesję.
1. Wejdź na `/login`.
2. Wpisz błędne hasło -> oczekiwany komunikat o błędzie.
3. Zaloguj poprawnie jako ADMIN.
4. Odśwież stronę (F5) i sprawdź, czy sesja jest utrzymana.
**Oczekiwane:** poprawne logowanie, brak wylogowania po F5.

## M2 — RBAC (ADMIN/FOREMAN/WORKER)
**Cel:** potwierdzić ograniczenia uprawnień.
1. Jako ADMIN otwórz `/users`, `/settings`, `/audit-log`.
2. Jako WORKER spróbuj wejść na `/users` i `/settings`.
3. Jako FOREMAN sprawdź dostęp do zadań i dokumentów.
**Oczekiwane:** brak nieautoryzowanego dostępu; restrykcje zgodne z rolą.

## M3 — Słowniki (produkty, lokalizacje)
**Cel:** sprawdzić CRUD i wyszukiwanie.
1. Produkty: dodaj/edytuj produkt.
2. Lokalizacje: dodaj lub edytuj lokalizację.
3. Wyszukaj po SKU/kodzie.
**Oczekiwane:** zapis i odczyt danych bez błędów.

## M4 — PZ (pełny flow)
**Cel:** przyjęcie towaru i przejście dokumentu przez statusy.
1. Wejdź w `/documents/pz`.
2. Utwórz PZ (dostawca + pozycja + putaway location).
3. Kliknij `Zarejestruj`.
4. Dokończ flow PZ (`pz/start`, `pz/complete` przez UI).
**Oczekiwane:** dokument przechodzi statusy, brak błędów walidacji.

## M5 — Put-away
**Cel:** sprawdzić przeniesienie towaru z bufora.
1. Wejdź w `/putaway` lub `Zadania`.
2. Otwórz zadanie PUTAWAY.
3. Zrealizuj kroki i zakończ zadanie.
**Oczekiwane:** status zadania `COMPLETED`, aktualizacja stanów.

## M6 — MM (przesunięcie)
**Cel:** sprawdzić przesunięcie i autogenerację MOVE.
1. Wejdź w `/documents/mm`.
2. Utwórz MM (from -> to, produkt, ilość).
3. Zatwierdź dokument.
4. Sprawdź, czy pojawiło się zadanie MOVE.
**Oczekiwane:** dokument zmienia status, MOVE pojawia się w `/tasks`.

## M7 — RW (wydanie)
**Cel:** sprawdzić RW z nową logiką lokalizacji i odbiorcy.
1. Wejdź w `/documents/rw`.
2. Utwórz RW:
   - wybierz **lokalizację pobrania**,
   - wybierz **odbiorcę z listy**,
   - dodaj pozycję.
3. Zatwierdź RW.
4. Sprawdź stany po zatwierdzeniu.
**Oczekiwane:** brak błędu `field required`, stan maleje na wskazanej lokalizacji.

## M8 — Reguła negatywna RW
**Cel:** potwierdzić blokadę biznesową.
1. Spróbuj utworzyć/zatwierdzić RW dla produktu bez stanu na wybranej lokalizacji.
**Oczekiwane:** czytelny błąd, brak niepoprawnej zmiany stanu.

## M9 — Zadania (operacyjne)
**Cel:** sprawdzić lifecycle zadań.
1. Wejdź w `/tasks`.
2. Weź zadanie (`ASSIGNED/IN_PROGRESS`), zakończ (`COMPLETED`).
3. Zweryfikuj filtry statusów.
**Oczekiwane:** poprawne przejścia statusów.

## M10 — Stany magazynowe + częściowe blokowanie
**Cel:** sprawdzić mechanikę `AVAILABLE/BLOCKED`.
1. Wejdź w `/stock`.
2. Zablokuj część ilości (np. 0.5).
3. Sprawdź, czy rozdzieliło rekordy wg statusu.
**Oczekiwane:** widoczne `AVAILABLE` + `BLOCKED`, spójna suma.

## M11 — Ledger i Audit
**Cel:** potwierdzić ślad operacji.
1. Otwórz `/ledger`.
2. Zweryfikuj wpisy po PZ/MM/RW.
3. Otwórz `/audit-log` i sprawdź zdarzenia.
**Oczekiwane:** każdy kluczowy krok ma ślad.

## M12 — Raporty i eksport
**Cel:** zweryfikować raportowanie.
1. Wejdź w `/reports`.
2. Wygeneruj eksport CSV/XLSX/PDF (co dostępne).
**Oczekiwane:** plik generuje się poprawnie.

## M13 — Mobilka: logowanie i API
**Cel:** potwierdzić pracę na fizycznym telefonie.
1. Ustaw poprawny serwer API (IP komputera, nie `127.0.0.1`).
2. Zaloguj się jako WORKER.
3. Sprawdź listy zadań, RW/PZ/MM.
**Oczekiwane:** brak błędu połączenia, poprawna sesja.

## M14 — Mobilka: RW z nowym payloadem
**Cel:** potwierdzić naprawę mobilki pod `from_location_id` i `recipient_id`.
1. W RW wybierz lokalizację pobrania i odbiorcę.
2. Utwórz dokument.
3. Zweryfikuj brak błędu walidacji backend.
**Oczekiwane:** dokument RW tworzy się poprawnie.

---

## 1.4. Krótki szablon raportu po testach (do skopiowania)

## Raport wykonania testów manualnych — WMS

- **Data:**  
- **Tester:**  
- **Środowisko:** (backend URL, frontend URL, urządzenie mobilne)  
- **Wersja aplikacji:** (commit/tag/build)

### Podsumowanie
- PASS:  
- FAIL:  
- CZĘŚCIOWO:  
- BLOK:  
- N/D:

### Krytyczne obserwacje
1.  
2.  
3.

### Lista błędów (jeśli wystąpiły)
| ID | Moduł | Krok | Objaw | Priorytet | Załącznik |
|---|---|---|---|---|---|
| BUG-01 | RW | M7.2 | ... | High | screen/log |

### Wnioski i rekomendacje
-  
-  

---

## 2) Testy automatyczne — co mamy i co dokładnie sprawdzają

Poniżej mapa istniejących automatów na podstawie plików w repo.

## 2.1. Orkiestrator pełnej paczki

### `e2e_tests/run_all_tests.mjs`
Uruchamia sekwencyjnie:
1. `api_scenarios.mjs` (API smoke + logika biznesowa),
2. `round2_uat_api.mjs` (API UAT PZ/MM/RW),
3. `round3_roles_api.mjs` (RBAC API),
4. `run_tabs_chrome.mjs` (web smoke + screeny),
5. `round3_roles_webshots.mjs` (web role routing + screeny).

**Znaczenie:** to „pipeline regresji” na poziomie E2E/UAT.

---

## 2.2. Testy automatyczne API (Node)

### `e2e_tests/api_scenarios.mjs`
**Sprawdza:**
- logowanie i podstawowe listowania API (`products`, `locations`, `stock`, `documents`, `tasks`, `inventory`, `users`, `audit-log`, `suppliers`),
- scenariusz MM: create -> confirm -> status IN_PROGRESS + autogeneracja MOVE,
- scenariusz częściowego blokowania stanu (`PATCH /stock/{id}/status` z quantity) + split AVAILABLE/BLOCKED.

**Po co:** szybka detekcja regresji reguł biznesowych i kontraktu API.

### `e2e_tests/round2_uat_api.mjs`
**Sprawdza pełny biznesowy flow API:**
- PZ (create/start/complete),
- MM (create/confirm + wzrost liczby MOVE),
- RW (create z `from_location_id` + `recipient_id`, confirm, wpływ na stock).

**Po co:** potwierdzenie kluczowych procesów operacyjnych.

### `e2e_tests/round3_roles_api.mjs`
**Sprawdza RBAC po API** dla ról `ADMIN`, `FOREMAN`, `WORKER` na endpointach:
- products/locations/tasks/documents/stock/inventory/suppliers/users/audit-log.

**Po co:** upewnienie, że backend nie przepuszcza nieuprawnionego dostępu.

### `e2e_tests/benchmark_50_users.mjs`
**Sprawdza wydajność (syntetyczny benchmark):**
- równoległe wirtualne „użytkowniki” (domyślnie 50),
- endpointy: tasks, stock, documents, products, locations,
- metryki: avg, p50, p95, p99, max, errorRate.

**Po co:** szybki test obciążeniowy i trendów wydajności.

---

## 2.3. Testy automatyczne Web UI (Playwright)

### `e2e_tests/run_tests.mjs`
**Sprawdza:**
- logowanie i obecność tokenów sesji w localStorage,
- przejście po głównych zakładkach (`/dashboard`, `/products`, `/documents/*`, `/tasks`, `/stock`, `/reports`, `/audit-log`, itd.),
- zbieranie błędów JS i nieudanych requestów API (4xx/5xx),
- scenariusz UI MM (utworzenie, podgląd, zatwierdzenie),
- scenariusz częściowego blokowania stanu.

**Po co:** regresja frontu + dowody w postaci screenshotów.

### `e2e_tests/round2_uat_webshots.mjs`
**Sprawdza:** szybkie web UAT screenshot run (login + kluczowe strony).  
**Po co:** szybka dokumentacja wizualna stanu aplikacji.

### `e2e_tests/round3_roles_webshots.mjs`
**Sprawdza:** UI dla wielu ról (admin/foreman/worker), routing i dostępność ekranów.  
**Po co:** walidacja zachowania frontu względem RBAC.

---

## 2.4. Testy jednostkowe frontend (Vitest)

### `frontend/src/tests/unit/validators.test.ts`
**Co testuje:**
- schematy walidacji (login, produkt, user, zmiana hasła),
- przypadki pozytywne i negatywne.

### `frontend/src/tests/unit/usePermissions.test.ts`
**Co testuje:**
- mapę RBAC w kodzie frontu (`PERMISSIONS`) dla wszystkich ról.

### `frontend/src/tests/unit/stateMachine.test.ts`
**Co testuje:**
- dozwolone przejścia statusów dokumentów i zadań (`stateMachine`).

**Po co unit testy frontu:** łapią regresje logiki domenowej bez odpalania całej aplikacji.

---

## 2.5. Testy automatyczne mobilki (Flutter)

### `wms_worker/integration_test/wms_flow_golden_test.dart`
**Pełny scenariusz integracyjny mobilki:**
- logowanie magazyniera,
- PZ z wyborem dostawcy i skanem SKU,
- utworzenie i rejestracja PZ,
- przejście do zadań PUTAWAY,
- potwierdzenie lokalizacji i zakończenie zadania,
- zapis serii screenshotów (`build/integration_screenshots/*.png`).

**Po co:** sprawdza realny, end-to-end flow magazyniera i generuje materiał dowodowy.

### `wms_worker/test/widget_test.dart`
**Smoke widget test:** aplikacja startuje i renderuje root widget.

---

## 2.6. Jak odpalać automaty (skrót)

### Pełna paczka E2E/UAT
```bash
cd e2e_tests
node run_all_tests.mjs
```

### Frontend unit
```bash
cd frontend
npm run test:run
```

### Mobilka integration
```bash
cd wms_worker
flutter test integration_test/wms_flow_golden_test.dart -d macos
```

---

## 3) Jak to opisać promotorowi (krótko)

"Manualnie wykonuję scenariusze biznesowe i role użytkowników (UAT), a automaty pokrywają trzy poziomy:  
(1) kontrakt i logikę API,  
(2) regresję UI web (wraz z dowodami screenshot),  
(3) flow operacyjny mobilki.  
To daje połączenie: walidacja biznesowa + techniczna + dowody przebiegu testów."
