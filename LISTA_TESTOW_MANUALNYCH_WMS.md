# Lista testów manualnych WMS (do prezentacji)

## Instrukcja użycia

- Każdy test wykonaj ręcznie i uzupełnij wynik: `PASS` / `FAIL` / `BLOCKED`.
- Dodaj krótki komentarz i ewentualny numer screena.
- W przypadku `FAIL` opisz dokładnie krok i oczekiwany wynik.

## Testy manualne

1. **LOG-01 — logowanie ADMIN (web)**
   - Kroki: otwórz aplikację web, zaloguj `00001 / Admin1234`.
   - Oczekiwane: przejście na dashboard, brak błędu.

2. **LOG-02 — logowanie WORKER (mobilka)**
   - Kroki: uruchom worker, zaloguj `00002 / Demo1234`.
   - Oczekiwane: wejście do głównego shella, widoczne zakładki.

3. **SES-01 — utrzymanie sesji mobilnej po restarcie**
   - Kroki: zaloguj się, zamknij aplikację, uruchom ponownie.
   - Oczekiwane: sesja odtworzona (bez ponownego logowania).

4. **DOC-01 — PZ create -> start -> complete**
   - Kroki: utwórz PZ, uruchom `start`, zakończ `complete`.
   - Oczekiwane: status dokumentu końcowo `COMPLETED`.

5. **DOC-02 — MM create -> confirm**
   - Kroki: utwórz MM i zatwierdź.
   - Oczekiwane: status `IN_PROGRESS`, powstają zadania MOVE.

6. **DOC-03 — RW reguła kompletacji**
   - Kroki: utwórz RW bez wymaganych stanów picking zone i spróbuj confirm.
   - Oczekiwane: blokada operacji z czytelnym komunikatem.

7. **STK-01 — rezerwacja ilości (BLOCKED)**
   - Kroki: na mobilce `Stan`, kliknij `Rezerwuj` i podaj ilość częściową.
   - Oczekiwane: część ilości przechodzi do `BLOCKED`.

8. **TSK-01 — filtr Picking + Move (mobilka)**
   - Kroki: zakładka `Zadania`, wybierz filtr `Picking + Move`.
   - Oczekiwane: widoczne tylko zadania PICKING i MOVE.

9. **LOC-01 — standaryzacja kodu lokalizacji**
   - Kroki: w MM wpisz kod z małych liter/spacjami.
   - Oczekiwane: system normalizuje/akceptuje prawidłowy format albo odrzuca błędny.

10. **REC-01 — podpowiedzi odbiorcy RW**
    - Kroki: utwórz RW z odbiorcą, wróć do formularza RW.
    - Oczekiwane: odbiorca widoczny na liście podpowiedzi.

11. **ROL-01 — brak dostępu FOREMAN do users**
    - Kroki: zaloguj FOREMAN, przejdź na `/users`.
    - Oczekiwane: brak dostępu/redirect.

12. **ROL-02 — brak dostępu WORKER do audit-log**
    - Kroki: zaloguj WORKER, przejdź na `/audit-log`.
    - Oczekiwane: brak dostępu/redirect.

13. **UI-01 — przejście wszystkich głównych zakładek web**
    - Kroki: dashboard, products, locations, stock, documents, tasks, reports, settings.
    - Oczekiwane: brak crasha i brak błędów blokujących.

14. **SYNC-01 — auto-refresh web**
    - Kroki: otwórz listę (np. tasks), wykonaj zmianę z drugiej sesji, odczekaj interwał.
    - Oczekiwane: dane odświeżają się automatycznie.

15. **SYNC-02 — auto-refresh mobilka**
    - Kroki: otwórz `Zadania`/`Stan`, wykonaj zmianę po stronie web, odczekaj interwał.
    - Oczekiwane: widok aktualizuje dane bez ręcznego refresh.
