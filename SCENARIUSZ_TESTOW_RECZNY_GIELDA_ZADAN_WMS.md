# Scenariusz testów ręcznych WMS (po poprawce „giełda zadań”)

Ten dokument jest przygotowany pod:
1) ręczne wykonanie testów i wpisanie wyników do Excela,  
2) szybkie pokazanie promotorowi realnego stanu projektu.

**Arkusz Excel do wypełnienia:** `SCENARIUSZ_TESTOW_RECZNY_GIELDA_ZADAN_WMS.xlsx`

---

## 1. Cel testów (po zmianie logiki zadań)

Najważniejsza zmiana: zadania po dokumentach PZ/MM/RW trafiają do puli (`NEW`, bez przypisania), a magazynier „bierze” je do realizacji (`start` przypisuje zadanie do użytkownika).

W praktyce chcemy potwierdzić:
- brak blokady procesu, gdy dokument tworzy kierownik/admin,
- widoczność zadań na mobilce WORKER,
- poprawne przypisywanie przy rozpoczęciu zadania,
- spójność stanów i historii (stock/ledger/audit).

---

## 2. Warunki wejściowe (przed testem)

- Backend działa (`/api/health` = 200).
- Frontend działa (`/dashboard` dostępny).
- Mobilka działa i ma poprawny adres API (LAN IP komputera).
- Dane testowe: min. 1 produkt, lokalizacje aktywne, min. 1 odbiorca.
- Konta:
  - ADMIN (`00001`)
  - WORKER (`00002`)
  - opcjonalnie FOREMAN

---

## 3. Scenariusze manualne do wykonania (wypełnisz w Excelu)

## M1 — Logowanie i sesja
1. Zaloguj się jako ADMIN (web).
2. Wyloguj i zaloguj jako WORKER (web lub mobilka).
3. Na mobilce sprawdź logowanie WORKER.
**Oczekiwane:** logowanie działa dla obu kont, sesja stabilna.

## M2 — PZ tworzone przez ADMIN, wykonanie przez WORKER
1. Jako ADMIN utwórz PZ i kliknij `Zarejestruj`.
2. Jako WORKER na mobilce wejdź w Zadania.
3. Znajdź nowe zadanie PUTAWAY (status `NEW`, bez przypisania).
4. Kliknij `Rozpocznij pracę`.
**Oczekiwane:** zadanie było widoczne dla WORKER, po `start` przypisało się do WORKER.

## M3 — MM z puli zadań
1. Jako ADMIN utwórz i zatwierdź MM.
2. Jako WORKER sprawdź listę zadań.
3. Rozpocznij i zakończ zadanie MOVE.
**Oczekiwane:** MOVE tworzy się jako `NEW` w puli i jest wykonalne przez WORKER.

## M4 — RW z puli zadań
1. Jako ADMIN utwórz RW (lokalizacja pobrania + odbiorca z listy).
2. Zatwierdź RW / wygeneruj zadania.
3. Jako WORKER znajdź i rozpocznij PICKING.
**Oczekiwane:** zadanie PICKING widoczne w puli, po starcie przypisane do WORKER.

## M5 — Uprawnienia i brak blokad personalnych
1. Potwierdź, że WORKER nie ma dostępu do `/users`.
2. Potwierdź, że WORKER widzi zadania `NEW` i swoje.
3. Potwierdź, że WORKER nie może zakończyć cudzego zadania `IN_PROGRESS`.
**Oczekiwane:** RBAC działa, ale pula zadań usuwa ryzyko „jednej osoby”.

## M6 — Spójność danych po wykonaniu zadań
1. Po PUTAWAY/MOVE/PICKING sprawdź `/stock`.
2. Sprawdź wpisy w `/ledger`.
3. Sprawdź wpisy w `/audit-log`.
**Oczekiwane:** stany i historia są spójne z wykonanymi krokami.

## M7 — Test negatywny RW (brak stanu)
1. Utwórz RW dla pozycji bez wystarczającego stanu.
2. Spróbuj zatwierdzić/generować zadania.
**Oczekiwane:** czytelny błąd, brak nieprawidłowego ruchu.

## M8 — Responsywność i mobilny UX
1. Otwórz kluczowe ekrany na 360px i 1366px.
2. Sprawdź na mobilce listę zadań, filtry i akcje.
**Oczekiwane:** brak „rozjazdów” UI uniemożliwiających obsługę.

---

## 4. Jak raportować wynik

Wynik na krok:
- `PASS` — działa zgodnie z oczekiwaniem,
- `FAIL` — nie działa,
- `CZĘŚCIOWO` — działa z ograniczeniami,
- `BLOK` — nie da się wykonać (brak danych/środowiska),
- `N/D` — nie dotyczy zakresu.

Do każdego FAIL/BLOK dopisz:
- dokładny krok,
- komunikat błędu,
- screen/log.

---

## 5. Co pokazać promotorowi (15 min) + co przygotować

## Punkt 1 (0:00-2:00): Status projektu
**Pokazać:**
- 1 slajd: Gotowe / Prawie gotowe / Blockery.

**Przygotować:**
- liczba scenariuszy manualnych wykonanych,
- ostatni status automatów (PASS/FAIL),
- lista 3 głównych ryzyk.

## Punkt 2 (2:00-8:00): Live demo najciekawsze
**Pokazać:**
1. Web (ADMIN): utworzenie i rejestracja PZ,
2. Mobilka (WORKER): zadanie PUTAWAY z puli -> start -> complete,
3. Web: stock + ledger/audit po wykonaniu.

**Przygotować:**
- konto ADMIN i WORKER zalogowane,
- dane (produkt, lokalizacje) gotowe,
- sprawdzony internet/LAN i adres API na mobilce.

## Punkt 3 (8:00-11:00): Testy i jakość
**Pokazać:**
- podział testów: manualne + automaty (API/UI/unit/mobilka),
- 1 slajd z wynikami i pokryciem.

**Przygotować:**
- plik wyników automatów (`run_all_tests`),
- wypełniony Excel manualny (min. kluczowe M1-M6),
- 3-5 screenshotów dowodowych.

## Punkt 4 (11:00-14:00): Co zostało + termin obrony
**Pokazać:**
- tabela prac do domknięcia:
  - security baseline,
  - deployment,
  - finalne testy i raport.

**Przygotować:**
- estymacja w dniach (optymistyczna i realistyczna),
- plan działań i właściciel każdego obszaru.

## Punkt 5 (14:00-15:00): Decyzja
**Pokazać / powiedzieć:**
- „Czy przy tym planie i buforze akceptujemy cel obrony na [data realistyczna]?”

**Przygotować:**
- konkretną datę realistyczną,
- argumenty: co jest gotowe vs co jest ryzykiem.

---

## 6. Najważniejsze zdanie do obrony

"Po poprawce modelu zadań przeszliśmy z przypisywania do osoby tworzącej dokument na pulę zadań (`NEW`), dzięki czemu proces nie blokuje się przy nieobecności jednej osoby. Kierownik uruchamia proces, a magazynierzy pobierają i realizują zadania operacyjne."
