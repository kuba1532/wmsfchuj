# Audyt zgodności z wymaganiami — System WMS (Zespół 36)

Dokument odpowiada na pytanie: **czy projekt jest kompletny i czy wszystko działa?** Każde wymaganie z dokumentu „Wymagania_WMS_pelne_z_brygadzista” zostało zweryfikowane w kodzie i/lub funkcjonalnie (uruchomiona aplikacja, API, testy).

**Data audytu:** 2026-05-30
**Aktualizacja:** 2026-05-31 — domknięto kluczowe luki: dodano automatyczny pakiet testów (pytest backend + Playwright E2E) oraz wymuszanie zmiany hasła co 180 dni (N-04).
**Metoda weryfikacji:** analiza kodu + uruchomiony backend (FastAPI) i panel web + smoke‑test API dla wszystkich modułów + test RBAC dla 4 ról + uruchomienie testów jednostkowych, automatycznych testów backendu (pytest) i E2E (Playwright).

## Werdykt skrótowy

- **MUST HAVE (funkcjonalne i niefunkcjonalne): 100% zrealizowane.** ✅
- **SHOULD HAVE: zrealizowane** (N-04 domknięte; pozostają 2 niefunkcjonalne częściowo — backup i formalna retencja logów — uzasadnienie niżej).
- **COULD HAVE: 1 z 5 zrealizowane** (PDF). Pozostałe to świadomie pominięte opcje (zgodnie z MoSCoW „Could”).
- **WON'T HAVE: poprawnie poza zakresem.** ✅
- **Status luk (po aktualizacji 2026-05-31):** (1) automatyczne testy backendu/E2E — **DODANE** ✅ (26 testów pytest + 3 E2E Playwright), (2) wymuszanie zmiany hasła co 180 dni — **ZAIMPLEMENTOWANE** ✅, (3) automatyczny backup/retencja logów — pozostaje do konfiguracji na serwerze (element wdrożenia). Szczegóły w sekcji „Luki”.

---

## 1. Wymagania funkcjonalne — MUST HAVE

| ID | Wymaganie | Status | Dowód / lokalizacja |
|---|---|:--:|---|
| M-F1 | Logowanie: 5‑cyfrowy kod + hasło | ✅ | `users.login_code String(5)`, `auth.py /login`; zweryfikowane logowanie 4 kont |
| M-F2 | RBAC (Admin/Kierownik/Brygadzista/Magazynier) wg macierzy | ✅ | `middleware/auth.py PERMISSION_MATRIX`; potwierdzone E2E (`docs/dokumentacja_rol/`) |
| M-F3 | Kartoteka produktów (nazwa, SKU, jednostka) | ✅ | `models.Product`, `endpoints/products.py`, `ProductsPage` |
| M-F4 | Topologia magazynu (rzędy, regały, półki) | ✅ | `models.Location.row/rack/shelf + type`, `endpoints/locations.py` |
| M-F5 | Stany wg lokalizacji fizycznej | ✅ | `models.Stock (product+location+status+qty)`, `StockPage` |
| M-F6 | Rejestr ruchów (nieedytowalny: typ, user, czas, ilość) | ✅ | `models.StockLedger`, zapisywany przy każdej operacji; brak endpointu edycji/usuwania |
| M-F7 | Przyjęcia zewnętrzne (PZ) | ✅ | `documents.py create_pz / pz_complete`, ruch `RECEIPT` |
| M-F8 | Put‑away (bufor → składowanie) | ✅* | typ zadania `PUTAWAY`, `tasks.py _move_stock_for_putaway`, ekran `/putaway`, `generate-tasks` |
| M-F9 | Przesunięcia (MM) | ✅ | `documents.py _confirm_mm`, ruch `MOVE` |
| M-F10 | Wydania (RW/Picking) | ✅ | `documents.py _confirm_rw`, ruch `PICK` |
| M-F11 | Inwentaryzacja (porównanie + korekta z zatwierdzeniem) | ✅ | `models.Inventory/InventoryItem (system/actual/difference)`, `endpoints/inventory.py`, `InventoryPage` |
| M-F12 | Interfejs zarządczy (desktop) | ✅ | panel web React (DesktopLayout) — konfiguracja, raporty |
| M-F13 | Interfejs mobilny | ✅ | aplikacja Flutter (`wms_worker`) + responsywny web (MobileLayout) |
| M-F14 | Lista zadań użytkownika | ✅ | `endpoints/tasks.py`, `TasksPage` + mobilka; „Moje zadania” / pula |
| M-F15 | Zakładanie kont przez e‑mail (login = kod, link do ustawienia hasła) | ✅ | `users.py create_user (must_set_password)`, `mailer.py`, `password_setup.py`, `auth.py set-password` |

> **\* M-F8 (uwaga projektowa):** funkcja put‑away istnieje i działa (zadania `PUTAWAY` przenoszą towar bufor→lokalizacja docelowa). Domyślny proces PZ został **świadomie uproszczony** („wariant A”): towar przyjmowany jest od razu na wskazaną lokalizację składową, bez etapu bufora. Pełny tor bufor→put‑away pozostaje dostępny (ekran „Odłożenie”, `generate-tasks`). To decyzja UX dla MŚP, nie brak funkcji.

---

## 2. Wymagania funkcjonalne — SHOULD HAVE

| ID | Wymaganie | Status | Dowód / uwagi |
|---|---|:--:|---|
| S-F1 | Automatyczne generowanie zadań z dokumentów | ✅* | MM i RW: zadania tworzą się automatycznie przy zatwierdzeniu (`confirm_document` → `_create_tasks_for_document`). Put‑away PZ: dostępny przez `generate-tasks`. |
| S-F3 | Statusy jakościowe zapasu (Dostępny/Zablokowany) | ✅ | `StockStatusEnum`, `stock.py PATCH /stock/{id}/status` |
| S-F4 | Raportowanie + eksport | ✅ | `ReportsPage` (4 raporty: stany, ruchy, zadania, dokumenty), eksport CSV/XLSX (biblioteka `xlsx`) |
| S-F5 | Dziennik zdarzeń zmian słownikowych | ✅ | `services/audit.py log_action` w products/locations + `AuditLog` |
| WF1 | Brak integracji e‑commerce | ✅ | poprawnie poza zakresem |

> **\* S-F1 (uwaga):** przykład z wymagań „zadanie »Odłóż« po zatwierdzeniu PZ” nie jest domyślnym zachowaniem, bo PZ uproszczono (patrz M-F8). Automatyczne generowanie zadań **działa** dla MM/RW; dla PZ put‑away można wygenerować ręcznie. Wymaganie „Should” uznajemy za spełnione.

---

## 3. Wymagania funkcjonalne — COULD HAVE

| ID | Wymaganie | Status | Dlaczego |
|---|---|:--:|---|
| C-F1 | Generowanie PDF dokumentów (PZ/MM/RW) | ✅ | `frontend/src/utils/pdfGenerator.ts` (`generateDocumentPDF`, `generateInventoryPDF`) |
| C-F2 | Kontrola pakowania (Packing) | ❌ | Nie zaimplementowane. Opcja „Could”, poza MVP. Wymaga osobnego procesu weryfikacji zgodności kompletacji. |
| C-F3 | Partie i daty ważności (FIFO/FEFO) | ❌ | Nie zaimplementowane. Brak kolumn lot/expiry w modelu. Opcja „Could”, świadomie pominięta — grupa docelowa (MŚP e‑commerce) często nie prowadzi partii. |
| C-F4 | Obsługa zwrotów | ❌ | Nie zaimplementowane. Brak typu dokumentu „zwrot”. Opcja „Could”, poza MVP. |
| C-F5 | Wiele magazynów (multi‑warehouse) | ❌ | Nie zaimplementowane. Model lokalizacji jest jednomagazynowy (brak encji „magazyn”). Opcja „Could”, poza MVP. |

> COULD HAVE z definicji MoSCoW są **opcjonalne**. Brak C‑F2..C‑F5 **nie wpływa** na kompletność pracy — są to potencjalne kierunki rozwoju (są w „Planie rozwoju” w prezentacji).

---

## 4. Wymagania niefunkcjonalne

### MUST HAVE

| ID | Wymaganie | Status | Dowód / uwagi |
|---|---|:--:|---|
| N-01 | Bezpieczne hasła (hash) | ✅ | bcrypt (`security.py hash_password`, `passlib[bcrypt]`) |
| N-02 | Szyfrowana komunikacja (HTTPS) | ✅* | Konfiguracja produkcyjna z automatycznym HTTPS (Caddy + HSTS) — `docker-compose.prod.yml`, `Caddyfile`, `nginx.conf`. W dev używany HTTP (localhost). |
| N-03 | Egzekwowanie ról także przy ominięciu UI | ✅ | `require_permission`/`require_roles`; potwierdzone: WORKER → 403 na `/users` i `/inventory`, brak tokenu → 403 |
| N-05 | Czas odpowiedzi < 2 s dla 95% (10 użytkowników) | ✅ | Raport benchmarku: P95 ≈ 321 ms przy 25 równoczesnych użytkownikach (`RAPORT_BENCHMARK_PO_TUNINGU...`) |
| N-06 | Atomowość operacji magazynowych | ✅ | Transakcje z `with_for_update()` + pojedynczy `commit` per operacja (documents.py) |
| N-08 | Interfejs mobilny (RWD, duże elementy) | ✅ | MobileLayout + Flutter; potwierdzone wizualnie |
| N-11 | Rejestrowanie działań (login, dokumenty, zmiana stanu) | ✅ | `AuditLog` + `log_action` (LOGIN, CREATE/CONFIRM dokumentów, zmiana statusu) |
| N-13 | Czytelność i jakość kodu + komentarze | ✅ | konwencje, `ruff`, komentarze przy złożonej logice (PL) |
| N-15 | Działanie w Chrome/Firefox/Edge bez wtyczek | ✅ | standardowy React/Vite, brak zależności od wtyczek |

> **\* N-02:** HTTPS jest **przygotowany i skonfigurowany** do wdrożenia produkcyjnego; aktywuje się po wdrożeniu na domenę (instrukcja `WDROZENIE_CHMURA_WMS.md`). Lokalnie aplikacja chodzi po HTTP — to standard dla środowiska deweloperskiego.

### SHOULD HAVE

| ID | Wymaganie | Status | Uwagi |
|---|---|:--:|---|
| N-04 | Polityka haseł (8+ znaków, litery+cyfry, zmiana co 180 dni) | ✅ | Złożoność: `validate_password_policy`. **Wygasanie po 180 dniach: ZAIMPLEMENTOWANE** — `is_password_expired` + sprawdzanie przy logowaniu (`auth.py`, konfig `PASSWORD_MAX_AGE_DAYS=180`). Wygasłe hasło → 403, rotacja przez `POST /auth/change-expired-password`. Konta bez `password_set_at` (legacy) nie są blokowane. Testy: `tests/test_password_policy.py`. |
| N-07 | Kopie zapasowe (1×/dzień) + odtwarzanie z punktu w czasie | ⚠️ częściowo | Procedura `mysqldump` opisana (`WDROZENIE_CHMURA_WMS.md`). **Brak automatycznego harmonogramu i PITR** — do skonfigurowania na serwerze. |
| N-09 | Minimalna liczba kroków (≤5) | ✅ | Mobilny flow zadania: wybór → start → potwierdzenie kodu → koniec |
| N-10 | Spójność UI (nazwy, ikony, kolory) | ✅ | wspólne komponenty (`StatusBadge`), jednolite oznaczenia statusów |
| N-12 | Retencja logów 12 mies. + filtrowanie | ⚠️ częściowo | Filtrowanie po dacie/użytkowniku/typie DZIAŁA. **Polityka retencji 12 mies. nie jest egzekwowana** (dane są trzymane, brak mechanizmu czyszczenia/retencji — co praktycznie spełnia minimum, ale nie ma formalnej polityki). |
| N-14 | Dokumentacja techniczna | ✅ | README (backend/frontend/mobile), `WDROZENIE_CHMURA_WMS.md`, `docs/dokumentacja_rol/`, ten audyt. (Można dodać formalny opis schematu bazy.) |

### COULD HAVE

| ID | Wymaganie | Status | Uwagi |
|---|---|:--:|---|
| N-16 | Konteneryzacja (Docker) | ✅ | `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml` (dev) + `docker-compose.prod.yml` |

### WON'T HAVE (poprawnie poza zakresem)
- N-17 tryb offline mobilki ✅ poza zakresem
- WF2 płatności, WF3 ERP/księgowość, WF4 automatyzacja fizyczna ✅ poza zakresem

---

## 5. Stan testów (weryfikacja „czy działa”)

| Rodzaj | Stan | Uwaga |
|---|---|---|
| Testy jednostkowe frontend (Vitest) | ✅ **53/53 PASS** | `validators`, `usePermissions`, `stateMachine` |
| Smoke‑test API (wszystkie moduły, jako ADMIN) | ✅ wszystkie 200 | products, locations, stock, documents, tasks, inventory, suppliers, recipients, users, audit‑log |
| Test RBAC po stronie serwera | ✅ | WORKER → 403, brak tokenu → 403 |
| E2E ról w UI (4 role) | ✅ | udokumentowane zrzutami w `docs/dokumentacja_rol/` |
| Benchmark wydajności | ✅ | P95 ≈ 321 ms (raport w repo) |
| **Testy automatyczne backendu (pytest)** | ✅ **26/26 PASS** | `backend/tests/`: RBAC/403 (`test_auth_rbac.py`), polityka haseł + wygasanie 180 dni (`test_password_policy.py`), atomowość PZ→RW (`test_documents_atomicity.py`). Izolowana baza SQLite, `pytest.ini`. |
| **Testy E2E automatyczne (Playwright)** | ✅ **3/3 PASS** (scenariusz z backendem opcjonalny) | `frontend/e2e/`: walidacja formularza logowania (bez backendu) + logowanie admina (z backendem). Konfiguracja `playwright.config.ts`, skrypt `npm run test:e2e`. |
| Testy mobilki (Flutter) | ✅ analiza + testy | `flutter analyze` = „No issues found”, `flutter test` = „All tests passed”. Pełny test skanera wymaga fizycznego urządzenia (kamera). |

> **Wniosek:** aplikacja **działa** (potwierdzone funkcjonalnie, 53 testami jednostkowymi frontu, **26 testami pytest backendu** i **3 testami E2E Playwright**). Luka „brak automatycznych testów” została **domknięta** — w repo jest uruchamialny pakiet pokrywający kluczowe ryzyka (egzekwowanie ról, polityka haseł, atomowość operacji magazynowych, logowanie E2E). Wzmacnia to N-13 oraz wiarygodność planów testów.

### 5.1. Jak uruchomić testy automatyczne

**Backend (pytest):**

```bash
cd backend && source .venv/bin/activate
PYTHONPATH="$PWD" python -m pytest -ra
```

**Frontend — jednostkowe (Vitest):**

```bash
cd frontend && npm run test:run
```

**Frontend — E2E (Playwright):**

```bash
cd frontend
npx playwright install chromium      # jednorazowo
npm run test:e2e                     # scenariusz walidacji startuje sam (bez backendu)
# Pełny happy-path logowania (wymaga backendu + konta admina):
E2E_ADMIN_LOGIN=00001 E2E_ADMIN_PASSWORD=Twoje_Haslo npm run test:e2e
```

---

## 6. Luki i rekomendacje (czego brakuje i dlaczego)

### A. Luki względem wymagań

1. **Automatyczne testy backendu + E2E** — ✅ **ROZWIĄZANE (2026-05-31).** Dodano pakiet `backend/tests/` (26 testów pytest: RBAC/403, atomowość PZ→RW, polityka i wygasanie haseł) oraz `frontend/e2e/` (3 testy Playwright: walidacja + logowanie). Uruchamianie: sekcja 5.1.
2. **N-04: wymuszenie zmiany hasła co 180 dni** — ✅ **ROZWIĄZANE (2026-05-31).** `PASSWORD_MAX_AGE_DAYS=180`, sprawdzanie przy logowaniu (`is_password_expired`), endpoint rotacji wygasłego hasła `POST /auth/change-expired-password`, pokryte testami. Konta bez znanej daty ustawienia hasła nie są blokowane (bezpieczne wdrożenie polityki). Przy okazji naprawiono latentny bug porównania dat (naive vs aware) w blokadzie konta.
3. **N-07: automatyczny backup + PITR** — ⚠️ *tylko procedura ręczna.* Powód: to element wdrożenia/infrastruktury. **Rekomendacja:** dodać cron z `mysqldump` (gotowy snippet w przewodniku) — opcjonalnie włączyć binlog dla PITR.
4. **N-12: formalna retencja logów 12 mies.** — ⚠️ *brak polityki.* Powód: dane i tak są trzymane bezterminowo. **Rekomendacja:** dopisać politykę retencji (wystarczy zapis w dokumentacji + ewentualny job czyszczący starsze wpisy).

### B. Świadomie pominięte (COULD HAVE — NIE są wymagane do kompletności)
- C‑F2 Packing, C‑F3 Partie/FEFO, C‑F4 Zwroty, C‑F5 Multi‑warehouse — opcje rozwojowe zgodne z MoSCoW „Could”. Brak ich realizacji jest **zgodny z zakresem MVP**.

### C. Uwagi projektowe (nie są brakami)
- Uproszczenie PZ (przyjęcie bezpośrednio na lokalizację docelową) — decyzja UX; pełny tor put‑away nadal dostępny.

---

## 7. Podsumowanie

Wszystkie wymagania **MUST HAVE** (15 funkcjonalnych + 9 niefunkcjonalnych) są zrealizowane i zweryfikowane. **SHOULD HAVE** obejmują m.in. **N-04 (rotacja haseł co 180 dni)**; częściowe pozostają dwa elementy infrastrukturalne (automatyczny backup i formalna retencja logów — do konfiguracji na serwerze produkcyjnym). Z **COULD HAVE** zrealizowano PDF; pozostałe to opcje rozwojowe. **WON'T HAVE** poprawnie poza zakresem. Aplikacja działa end‑to‑end dla wszystkich ról. W repozytorium jest uruchamialny pakiet **26 testów pytest** (RBAC/403, atomowość PZ→RW, polityka haseł) oraz **3 testów E2E Playwright** (logowanie/walidacja), obok 53 testów jednostkowych frontu.
