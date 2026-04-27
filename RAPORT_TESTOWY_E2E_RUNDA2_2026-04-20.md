# Raport testowy E2E WMS — Runda 2 (2026-04-20)

## Zakres rundy 2

Runda 2 objęła rozszerzone scenariusze biznesowe UAT:

1. PZ: utworzenie dokumentu, start procesu przyjęcia, zakończenie przyjęcia.
2. MM: utworzenie przesunięcia, zatwierdzenie, weryfikacja auto-generowania zadań MOVE.
3. RW: utworzenie dokumentu i weryfikacja reguły biznesowej blokującej potwierdzenie bez stanu w strefie kompletacji.
4. Przegląd UI po operacjach (zrzuty ekranów kluczowych zakładek).
5. Dodatkowy zrzut aplikacji mobilnej Flutter worker.

## Wynik rundy 2

- Status ogólny: **PASS**
- Scenariusze API UAT: **10 OK / 0 FAIL**
- Zakładki web po operacjach: wykonane, screeny zapisane.
- Worker Flutter: dostępny i zrzut ekranu wykonany.

## Wyniki scenariuszy API (krok po kroku)

- `login`: OK (`00001`)
- `snapshot`: OK
- `pz_create`: OK (`PZ/2026/010`)
- `pz_start`: OK (`IN_PROGRESS`)
- `pz_complete`: OK (`COMPLETED`)
- `mm_create`: OK (`MM/2026/017`)
- `mm_confirm`: OK (`IN_PROGRESS`)
- `mm_task_autogen`: OK (`MOVE before=12 after=13`)
- `rw_create`: OK (`RW/2026/006`)
- `rw_confirm_business_rule`: OK (poprawna blokada RW przy braku stanu w strefie kompletacji)

## Artefakty

- Raport API runda 2:
  - `e2e_tests/screens/round2_uat_api_report.json`
- Screeny web runda 2:
  - katalog: `e2e_tests/screens/round2_web_1776697771199`
  - indeks: `e2e_tests/screens/round2_web_1776697771199/report.json`
- Screen worker Flutter runda 2:
  - `e2e_tests/screens/flutter_worker_round2.png`

## Uwagi końcowe

- Dla dokumentów PZ poprawna ścieżka procesu to: `pz/start` -> `pz/complete` (a nie `documents/{id}/confirm`).
- Dla RW system poprawnie egzekwuje regułę dostępności towaru w strefie kompletacji.
