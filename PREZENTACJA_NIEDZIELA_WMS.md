# Prezentacja na niedzielę — WMS (wersja statusowa)

## Slajd 1 — Agenda

1. Problem i potrzeba biznesowa  
2. Rozwiązanie WMS (web + mobilka)  
3. Demo działania i wyniki testów  
4. Technologie i architektura  
5. Harmonogram i przebieg prac  
6. Ryzyka i plan redukcji  
7. Roadmapa „DO ZROBIENIA”  
8. Podsumowanie sprzedażowe

## Slajd 2 — Ogólna wizja

- Jeden system dla magazynu: planowanie, dokumenty, zadania, audyt.
- Dwa kanały pracy:
  - panel web (kadra, zarządzanie, raporty),
  - aplikacja mobilna (operacje na hali).
- Cel biznesowy: mniej błędów, szybsza realizacja, lepsza kontrola.

## Slajd 3 — Co działa (status na dziś)

- Backend + frontend + worker mobilny połączone i przetestowane.
- Kluczowe scenariusze dokumentów działają: PZ/MM/RW.
- Zadania i stany magazynowe odświeżają się po operacjach.
- Role i uprawnienia działają (ADMIN/FOREMAN/WORKER).
- Test smoke API: 18/18 OK, brak błędów krytycznych.

> Wstaw screeny z `e2e_tests/screens/`.

## Slajd 4 — Demo web

- Dashboard i kluczowe zakładki.
- MM -> zadania MOVE.
- Rezerwacja ilości (BLOCKED) ze stanu.
- Przykład ograniczeń uprawnień dla ról.

## Slajd 5 — Demo mobilka

- Logowanie i utrzymanie sesji.
- Zadania + filtr Picking/Move.
- Skaner kodów i wprowadzanie danych.
- RW z podpowiedziami odbiorcy.

> Wstaw mobilne screeny + krótki film 20-40 s z realnej pracy.

## Slajd 6 — Technologie i narzędzia

- Backend: FastAPI + SQLAlchemy + MySQL
- Frontend: React + TypeScript + MUI
- Mobilka: Flutter
- Testy: skrypty E2E (API i Playwright), UAT per rola
- Dystrybucja iOS: TestFlight

## Slajd 7 — Harmonogram i przebieg prac

- Etap 1: architektura i model danych
- Etap 2: dokumenty i stany magazynowe
- Etap 3: mobilka i skaner
- Etap 4: testy E2E, role, raporty
- Etap 5: przygotowanie release/demo

## Slajd 8 — Co nie działa / co jest niedomknięte

- Wysyłka maili "must-have" (F15: link do ustawienia hasła) - niedomknięta.
- i18n (PL/EN) - częściowo, wymaga domknięcia warstwy słowników.
- TestFlight iOS - instrukcja gotowa, pipeline release do dokończenia.
- HTTPS produkcyjne - do konfiguracji na środowisku wdrożeniowym.
- Backupy/retencja logów/benchmarki wydajności - do domknięcia operacyjnie.

## Slajd 9 — Ryzyka i plan monitorowania

- Ryzyka techniczne i komunikacyjne (plik: `RYZYKA_I_PLAN_MONITOROWANIA_WMS.md`).
- Plan monitorowania i testów (API + UI + UAT po rolach).
- Kryteria GO/NO-GO i checklista przed release.

## Slajd 10 — DO ZROBIENIA (roadmapa)

### Priorytet P1 (najbliżej produkcji)
- Domknięcie F15: wysyłka e-mail + link ustawienia hasła.
- UAT z użytkownikiem końcowym i poprawki użyteczności.
- Dopięcie pipeline TestFlight i checklisty release.
- Dopracowanie i18n i spójności UI (font/nazewnictwo).

### Priorytet P2
- Benchmarki wydajności i monitoring SLO.
- Procedura backup/restore i retencja logów.
- Materiały demo sprzedażowego: film + animacje procesu.

## Slajd 11 — Podsumowanie sprzedażowe

- WMS jest gotowy do pilotażu: działa E2E i ma kontrolę ról.
- Już dziś ogranicza błędy operacyjne i skraca czas realizacji.
- Kolejny krok: domknąć F15 + TestFlight, uruchomić pilotaż i szybkie iteracje.

---

## Materiały wizualne (grafiki/animacje/filmiki)

1. **Grafiki**
   - architektura systemu (backend-web-mobile),
   - mapa procesu PZ/MM/RW.
2. **Animacje**
   - przejście dokumentu przez statusy,
   - przepływ zadania od utworzenia do wykonania.
3. **Filmik demo**
   - 60-90 sekund: web + mobilka + efekt końcowy na stanie.

## Skrypt wypowiedzi (60 sekund)

"Pokazujemy WMS, który łączy zarządzanie webowe z pracą mobilną magazyniera.  
Przeszliśmy pełne testy E2E, scenariusze biznesowe i testy ról.  
System już realizuje kluczowe procesy PZ/MM/RW i kontroluje uprawnienia.  
Na dziś rekomendujemy wdrożenie pilotażowe oraz domknięcie backlogu UX i dystrybucji iOS przez TestFlight."
