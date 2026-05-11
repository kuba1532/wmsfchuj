# Ryzyka projektowe i plan monitorowania WMS

**Excel (do przekazania koledze / weryfikatorowi):** [`RYZYKA_I_PLAN_MONITOROWANIA_WMS.xlsx`](./RYZYKA_I_PLAN_MONITOROWANIA_WMS.xlsx) — arkusze: *Instrukcja*, *Ryzyka*, *Plan monitorowania*, *Audyt techniczny*. Ponowna generacja: `python scripts/generate_risks_monitoring_xlsx.py` (wymaga `openpyxl`).

## 1. Ryzyka projektowe (techniczne i komunikacyjne)

| ID | Ryzyko | Typ | Poziom | Prawd. | Wpływ | Poziom investigacji | Mitigacja |
|---|---|---|---|---|---|---|---|
| R1 | Niespójność danych między web i mobilką przy równoległej pracy | Techniczne | Wysoki | Średnie | Wysoki | Wysoki | Auto-refresh (2-3 min), odświeżanie po każdej operacji, UAT multi-device |
| R2 | Błędy procesu RW przy braku stanu w strefie kompletacji | Techniczne | Wysoki | Średnie | Wysoki | Wysoki | Walidacja backend + scenariusze negatywne + komunikat użytkowy |
| R3 | Niepełne role/uprawnienia w edge-case'ach | Techniczne | Średni | Niskie | Wysoki | Średni | Testy per rola (ADMIN/FOREMAN/WORKER), regresja po release |
| R4 | Problemy dystrybucji iOS (certyfikaty, provisioning, review) | Techniczne | Średni | Średnie | Średni | Średni | TestFlight pipeline, checklista release, wcześniejszy dry-run |
| R5 | Rozjazd oczekiwań promotora/zespołu i zakresu demo | Komunikacyjne | Średni | Średnie | Średni | Średni | Cotygodniowy sync, protokół decyzji, jawna roadmapa Must/Should |
| R6 | Nadmierna obietnica funkcji sprzedażowych na demo | Komunikacyjne | Średni | Średnie | Wysoki | Średni | Rozdzielić „działa teraz” od „roadmapa”, pokazywać dowody testowe |

## 2. Plan monitorowania (testy i przebieg testów)

### 2.1. Warstwy testowe

1. **Smoke techniczny**
   - health backend, docs API, logowanie, podstawowe listowania.
2. **Integracyjne API**
   - PZ/MM/RW, generowanie zadań, zmiany stanów, walidacje negatywne.
3. **UAT per rola**
   - ADMIN/FOREMAN/WORKER, dostęp do zakładek i endpointów.
4. **Regresja UI web + mobilka**
   - kluczowe zakładki, operacje, screenshot evidence.

### 2.2. Częstotliwość i odpowiedzialność

- Przed każdym demo/release: pełna paczka smoke + UAT.
- Po większych zmianach backend: testy API + role matrix.
- Po zmianach mobilki: smoke mobilny + test skanera + sesja.

### 2.3. KPI jakości

- Krytyczne błędy 5xx: **0**
- Krytyczne regresje flow PZ/MM/RW: **0**
- Błędy autoryzacji poza oczekiwanym 403 dla ról ograniczonych: **0**
- Sukces scenariuszy UAT: **>= 95%**

## 3. Scenariusze testowe do prezentacji

### Scenariusz A (happy path)
1. Logowanie admina (web).
2. Utworzenie MM i przekazanie do zadań.
3. Weryfikacja zadań MOVE.
4. Podgląd stanu i rezerwacja części ilości.
5. Pokaz mobilki: logowanie + zadania + skan.

### Scenariusz B (reguła biznesowa)
1. Utworzenie RW bez towaru w strefie kompletacji.
2. Próba confirm.
3. Oczekiwany wynik: blokada + czytelny komunikat.

### Scenariusz C (uprawnienia)
1. Logowanie FOREMAN.
2. Wejście na `/users` (blokada / redirect).
3. Logowanie WORKER i blokada `audit-log`/`inventory`.

## 4. Artefakty monitorowania

- Raporty rund: `RAPORT_TESTOWY_E2E_2026-04-20.md`, `RAPORT_TESTOWY_E2E_RUNDA2_2026-04-20.md`, `RAPORT_TESTOWY_E2E_RUNDA3_ROLE_GO-NO-GO_2026-04-20.md`
- Raport zbiorczy: `RAPORT_ZBIORCZY_E2E_WMS_GO-NO-GO_2026-04-20.md`
- Screeny: katalog `e2e_tests/screens/`
