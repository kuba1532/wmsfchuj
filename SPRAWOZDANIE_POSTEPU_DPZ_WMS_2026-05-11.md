# Sprawozdanie postępu prac — Dyplomowy Projekt Zespołowy (WMS)

**Data:** 11.05.2026  
**Projekt:** System WMS (panel web + aplikacja mobilna Flutter)  
**Zespół:** projekt zespołowy DPZ

---

## 1. Ryzyka projektowe wraz z planem mitygacji

| ID | Ryzyko | Prawdopodobieństwo | Wpływ | Poziom | Plan mitygacji | Właściciel | Status |
|---|---|---|---|---|---|---|---|
| R1 | Niespójność danych między web i mobilką przy równoległej pracy | Średnie | Wysoki | Wysoki | Auto-refresh, odświeżanie po operacjach, testy UAT multi-device | Backend + Frontend | Monitorowane |
| R2 | Błędy procesu RW (brak stanu w lokalizacji pobrania / strefie kompletacji) | Średnie | Wysoki | Wysoki | Walidacje backend, testy negatywne, czytelne komunikaty błędów | Backend | Zmitygowane częściowo |
| R3 | Luki w RBAC (role i uprawnienia w edge-case'ach) | Niskie/Średnie | Wysoki | Średni | Testy per rola (ADMIN/MANAGER/FOREMAN/WORKER), regresja po zmianach API | QA + Backend | Monitorowane |
| R4 | Ryzyko dystrybucji iOS (certyfikaty, provisioning) | Średnie | Średni | Średni | Wczesne testy na fizycznym urządzeniu, checklista release | Mobilka | Aktywne |
| R5 | Rozjazd oczekiwań interesariuszy względem zakresu demo | Średnie | Średni | Średni | Cotygodniowy sync, protokół decyzji, priorytety Must/Should/Could | PM/Analityk | Monitorowane |
| R6 | Niedostępność środowiska demo (sieć, IP, CORS) | Średnie | Średni/Wysoki | Średni | Instrukcja uruchomień, fallback lokalny, test dnia prezentacji | DevOps/Backend | Aktywne |

**Uwagi:**  
- Szczegółowa tabela ryzyk i monitorowania: `RYZYKA_I_PLAN_MONITOROWANIA_WMS.md` oraz `RYZYKA_I_PLAN_MONITOROWANIA_WMS.xlsx`.  
- Ryzyka są przeglądane cyklicznie przed demo/release.

---

## 2. Harmonogram prac (wykres Gantta)

### 2.1. Zakres czasowy
Harmonogram obejmuje okres marzec–maj 2026 (iteracyjna realizacja backlogu).

### 2.2. Gantt (tekstowy)

Legenda: `██` realizacja, `▒▒` utrzymanie/iteracje, `--` brak prac w danym etapie.

| Obszar / Etap | Marzec (T1-T2) | Kwiecień (T3-T4) | Maj (T5-T6) | Status na 11.05 |
|---|---|---|---|---|
| Analiza wymagań, model procesu | ██ | -- | -- | Zakończone |
| Architektura i model danych | ██ | ▒▒ | -- | Zakończone |
| Backend (API, auth, dokumenty PZ/MM/RW, migracje) | ██ | ██ | ▒▒ | Wysoki poziom gotowości |
| Frontend web (moduły operacyjne + raporty) | ██ | ██ | ▒▒ | Wysoki poziom gotowości |
| Mobilka Flutter (worker flow, skaner, API) | -- | ██ | ██ | Aktywne / finalizacja |
| Testy (API, E2E, UAT, role) | -- | ██ | ██ | Aktywne |
| Materiały końcowe (dokumentacja, demo, prezentacje) | -- | ▒▒ | ██ | Aktywne / finalizacja |

### 2.3. Kamienie milowe

| Milestone | Plan | Realizacja | Status |
|---|---|---|---|
| M1: MVP backend + logowanie + słowniki | koniec marca | zrealizowane | Zamknięty |
| M2: Procesy PZ/MM/RW na web | połowa kwietnia | zrealizowane (iterowane) | Zamknięty |
| M3: Integracja mobilki z API | koniec kwietnia | zrealizowane | Zamknięty |
| M4: Testy przekrojowe i role | początek maja | w toku (wysokie pokrycie scenariuszy) | Otwarty |
| M5: Pakiet oddaniowy (dokument, prezentacja, demo) | 11.05.2026 | realizacja bieżąca | Otwarty |

---

## 3. Plan monitorowania jakości wraz z formatką scenariusza testowego

### 3.1. Plan monitorowania jakości

**Warstwy testowe:**
1. Smoke testy techniczne (health, auth, podstawowe endpointy/listy).
2. Testy integracyjne API (PZ/MM/RW, zadania, walidacje biznesowe).
3. UAT per rola (RBAC + dostęp do modułów i akcji).
4. Regresja UI (web + mobilka, scenariusze operacyjne end-to-end).

**Częstotliwość:**
- przed każdym demo/release: smoke + ścieżki krytyczne,
- po zmianach backend: regresja API + reguły biznesowe,
- po zmianach mobilki: logowanie, sesja, zadania, skaner.

**KPI jakości:**
- krytyczne błędy 5xx: **0**,
- krytyczne regresje flow PZ/MM/RW: **0**,
- nieautoryzowany dostęp (zamiast oczekiwanego 403): **0**,
- skuteczność wykonania scenariuszy UAT: **>=95%**.

### 3.2. Formatka scenariusza testowego (szablon)

| Pole | Opis |
|---|---|
| ID scenariusza | Unikalny identyfikator (np. UAT-RW-01) |
| Obszar | Moduł (Auth / PZ / MM / RW / Inventory / RBAC) |
| Cel testu | Co weryfikujemy biznesowo i technicznie |
| Precondition | Dane wejściowe, konto, stan systemu |
| Kroki wykonania | Numerowana lista działań użytkownika/testera |
| Oczekiwany rezultat | Efekt biznesowy + techniczny (UI/API/DB) |
| Wynik | PASS / FAIL / CZĘŚCIOWO / BLOK / N/D |
| Dowód | Zrzut, log, link do raportu |
| Uwagi | Obserwacje i rekomendacje |
| Odpowiedzialny | Osoba wykonująca test |
| Data | Data wykonania |

### 3.3. Przykład (RW)

| Pole | Wartość przykładowa |
|---|---|
| ID scenariusza | UAT-RW-01 |
| Cel testu | Utworzenie RW z lokalizacją pobrania i odbiorcą ze słownika |
| Precondition | Produkt na stanie AVAILABLE w wybranej lokalizacji, konto z uprawnieniem `documents` |
| Kroki | 1) Wejdź w RW 2) Wybierz lokalizację pobrania 3) Wybierz odbiorcę 4) Dodaj pozycję 5) Utwórz 6) Zatwierdź |
| Oczekiwany rezultat | Dokument RW utworzony i zatwierdzony, stan maleje, ślad w ledger |
| Wynik | PASS/FAIL |

**Artefakty testowe:**  
- `SCENARIUS_TESTOW_RECZNY_WYMAGANIA.md` i `SCENARIUS_TESTOW_RECZNY_WYMAGANIA.xlsx`  
- raporty E2E/UAT w katalogu `e2e_tests/` oraz `wyniki_scenariusza_auto/`

---

## 4. Metodologia pracy

W projekcie zastosowano **iteracyjną metodologię Agile (Scrum/Kanban hybrid)**:

- planowanie sprintowe krótkimi iteracjami (1-2 tygodnie),
- priorytetyzacja backlogu w modelu **Must/Should/Could**,
- codzienna koordynacja zadań i szybkie feedback loop (dev ↔ test ↔ poprawki),
- przeglądy przyrostów funkcjonalnych na demo wewnętrznych,
- domykanie sprintu przez testy regresyjne i checklistę „go/no-go”.

**Praktyki inżynierskie:**
- code review i wspólna weryfikacja zmian,
- „test first for critical flows” dla kluczowych procesów magazynowych,
- utrzymywanie dokumentacji operacyjnej równolegle do implementacji.

---

## 5. Wykorzystywane narzędzia (development + współpraca)

### 5.1. Development
- **Backend:** Python, FastAPI, SQLAlchemy, Alembic, Uvicorn.
- **Frontend:** React + TypeScript + Vite + MUI.
- **Mobilka:** Flutter + Dart.
- **Baza danych:** MySQL (lokalnie / Docker Compose).
- **Testy:** pytest, vitest, testy E2E/UAT, testy integracyjne API.
- **Jakość kodu:** Ruff, ESLint, TypeScript checks, dart analyze.

### 5.2. Współpraca i organizacja
- Git (workflow gałęziowy, commit history, pull-request review),
- wspólna dokumentacja projektowa (repo, scenariusze, raporty, prezentacje),
- narzędzia komunikacji zespołowej (spotkania statusowe, uzgodnienia zakresu).

---

## 6. Stack technologiczny rozwiązania

### 6.1. Architektura
- **Klient web:** SPA (React/TypeScript).
- **Klient mobilny:** Flutter (iOS/Android/macOS test).
- **API:** REST (FastAPI).
- **Persistence:** MySQL + migracje Alembic.
- **Auth:** JWT (access/refresh), RBAC per obszar funkcjonalny.

### 6.2. Kluczowe biblioteki i komponenty

**Backend:**
- `fastapi`, `sqlalchemy`, `alembic`, `python-jose`, `passlib`, `pydantic`.

**Frontend:**
- `react`, `react-router`, `@mui/material`, `@tanstack/react-query`, `axios`, `zod`, `react-hook-form`.

**Mobilka:**
- `http`, `mobile_scanner`, `shared_preferences`.

### 6.3. Interfejsy i integracje
- Endpoints API m.in.: auth, users, products, locations, stock, tasks, documents, reports.
- Eksporty i raportowanie: CSV/XLSX/PDF (w zależności od modułu).

---

## Załączniki i źródła uzupełniające

1. `RYZYKA_I_PLAN_MONITOROWANIA_WMS.xlsx`  
2. `SCENARIUS_TESTOW_RECZNY_WYMAGANIA.xlsx`  
3. `DEMO.md` (instrukcja uruchomienia demo)  
4. `prezentacja_demo/` (materiały demonstracyjne)  
5. `RAPORT*` i `wyniki_scenariusza_auto/` (wyniki testów i walkthrough)

---

## Podsumowanie

Projekt znajduje się na etapie finalizacji i przygotowania do oddania. Kluczowe przepływy magazynowe (PZ/MM/RW), autoryzacja oraz część mobilna są zaimplementowane i testowane. Na ostatnim etapie koncentrujemy się na pełnym domknięciu pakietu jakościowego, dopracowaniu demo i kompletności dokumentacji oddaniowej.
