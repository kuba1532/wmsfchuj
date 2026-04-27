# Plan testów automatycznych WMS

## Cel

Zapewnić szybkie, powtarzalne sprawdzenie, że:
- backend, frontend i mobilka są spójne,
- kluczowe procesy biznesowe działają,
- uprawnienia ról nie są naruszone,
- UI nie ma regresji na głównych ścieżkach.

## Zestaw testów i uzasadnienie

1. **`api_scenarios.mjs` (API smoke + core flow)**
   - **Dlaczego ten test**: najtańszy i najszybszy sposób wykrycia regresji kontraktu API.
   - **Co łapie**: błędy loginu, listowań, tworzenia MM, auto-zadań, blokowania stanu.
   - **Ryzyko, które redukuje**: „aplikacja działa wizualnie, ale logika backendu jest zepsuta”.

2. **`round2_uat_api.mjs` (UAT scenariusze biznesowe)**
   - **Dlaczego ten test**: mapuje realne procesy magazynowe (PZ/MM/RW), nie tylko techniczne statusy.
   - **Co łapie**: złe przejścia statusów dokumentów, błędną walidację stanów, brak efektu biznesowego.
   - **Ryzyko, które redukuje**: błędne procesy operacyjne podczas demo i pilotażu.

3. **`round3_roles_api.mjs` (macierz uprawnień API)**
   - **Dlaczego ten test**: bezpieczeństwo i separacja ról to warunek produkcyjny.
   - **Co łapie**: przypadki, gdzie rola ma za szeroki lub za wąski dostęp.
   - **Ryzyko, które redukuje**: incydenty bezpieczeństwa / naruszenie zasad dostępu.

4. **`run_tabs_chrome.mjs` (regresja UI zakładek)**
   - **Dlaczego ten test**: szybki smoke UI + screenshot evidence do prezentacji.
   - **Co łapie**: błędy routingu, błędy JS, nieudane requesty API w UI.
   - **Ryzyko, które redukuje**: „biały ekran” lub niedziałająca zakładka na demo.

5. **`round3_roles_webshots.mjs` (UI per rola)**
   - **Dlaczego ten test**: wizualna walidacja tego, co API wymusza uprawnieniami.
   - **Co łapie**: błędne redirecty, widoczność obszarów niedozwolonych.
   - **Ryzyko, które redukuje**: niespójność „API zabrania, UI pokazuje”.

## Jak uruchomić

W katalogu `e2e_tests`:

```bash
npm run test:all
```

Pojedynczo:

```bash
npm run test:api:smoke
npm run test:api:uat2
npm run test:api:roles
npm run test:web:tabs
npm run test:web:roles
```

## Kryteria zaliczenia

- Wszystkie kroki `test:all` kończą się kodem `0`.
- Brak krytycznych błędów 5xx.
- Role mają oczekiwane 403 na niedozwolonych obszarach.
- Screenshoty i raporty są zapisane w `e2e_tests/screens`.
