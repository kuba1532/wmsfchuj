# Scenariusz testów ręcznych WMS wg wymagań (PDF „Wymagania_WMS_pelne_z_brygadzista”)

**Arkusz Excel (wypełnianie):** [`SCENARIUS_TESTOW_RECZNY_WYMAGANIA.xlsx`](./SCENARIUS_TESTOW_RECZNY_WYMAGANIA.xlsx) — trzy arkusze: *Instrukcja*, *Scenariusz* (lista rozwijana „Wynik”), *Podsumowanie*. Ponowna generacja: `backend/.venv/bin/python scripts/generate_scenario_xlsx.py` (wymaga pakietu `openpyxl`).

**Jak używać:** wykonuj kroki po kolei. W kolumnie **Wynik** wpisuj: `PASS` / `FAIL` / `CZĘŚCIOWO` / `N/D` (nie dotyczy zakresu) / `BLOK` (brak danych lub dostępu). W **Uwagi** krótko: co zepsute, jaki ekran, komunikat.

**Role w PDF → role w aplikacji (sprawdź w panelu użytkowników / seed):**

| PDF              | Typowa rola w kodzie |
|------------------|----------------------|
| Administrator    | `ADMIN`              |
| Kierownik        | `MANAGER`            |
| Brygadzista      | `FOREMAN`            |
| Magazynier       | `WORKER`             |

**Przygotowanie:** backend + baza + frontend (lub mobilka) działają; masz konta co najmniej: **ADMIN**, opcjonalnie **MANAGER**, **FOREMAN**, **WORKER** oraz dane demo (produkty, lokalizacje).

---

## A. Wymagania funkcjonalne — MUST HAVE

### M-F1 — Uwierzytelnianie (login 5 cyfr + hasło)

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| A1 | Wejdź na stronę logowania web | Pola: login (5 cyfr) i hasło | | |
| A2 | Wpisz błędne hasło 2× | Czytelny komunikat błędu, bez ujawniania „czy user istnieje” | | |
| A3 | Zaloguj poprawnie (np. `00001` + hasło admina z bazy) | Przekierowanie na pulpit / panel główny | | |
| A4 | (Mobilka) To samo dla magazyniera | Logowanie kod + hasło, wejście do aplikacji | | |

### M-F2 — RBAC (macierz uprawnień)

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| B1 | Jako **ADMIN**: wejdź w **Użytkownicy**, **Ustawienia** | Dostęp | | |
| B2 | Jako **WORKER**: spróbuj otworzyć URL **Użytkownicy** ręcznie (np. `/users`) | Brak dostępu / przekierowanie | | Por. macierz: Magazynier = brak |
| B3 | Jako **WORKER**: **Ustawienia** (`/settings`) | Brak lub tylko to, co dla roli | | Macierz: Magazynier = brak konfiguracji |
| B4 | Jako **FOREMAN**: **Użytkownicy** | Brak pełnego jak admin (macierz: brak) | | |
| B5 | Jako **MANAGER** (jeśli masz konto): słowniki vs użytkownicy zgodnie z macierzą | Kierownik: użytkownicy = odczyt (wg PDF) | | Sprawdź zachowanie w UI |
| B6 | Wywołaj operację API „za wysoka” (np. Postman z tokenem WORKER na endpoint tylko ADMIN) | HTTP **403** / odmowa | | M-F2 + N-03 |

### M-F3 — Kartoteka produktów (SKU)

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| C1 | **Produkty**: dodaj produkt (SKU, nazwa, jednostka) | Zapis, widoczny na liście | | |
| C2 | Edytuj produkt (np. nazwa / opis) | Zapis, historia spójna | | |
| C3 | Podgląd / szczegóły / wyszukiwanie po SKU | Działa | | |

### M-F4 — Topologia magazynu (lokalizacje hierarchiczne)

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| D1 | **Lokalizacje**: dodaj strukturę (np. rząd → regał → półka) zgodnie z modelem | Zapis bez błędu | | |
| D2 | Drzewo / lista pokazuje hierarchię | Logiczna prezentacja | | |

### M-F5 — Prezentacja stanów (ilość per lokalizacja)

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| E1 | **Stany magazynowe**: wybierz produkt + lokalizację | Widać ilość zgodną z operacjami | | |
| E2 | Po ruchu magazynowym (PZ / MM) stan się zmienia | Zgodność z oczekiwaniem | | |

### M-F6 — Rejestr ruchów (Stock Ledger)

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| F1 | **Rejestr ruchów**: po zatwierdzeniu PZ/MM pojawia się wpis | Typ, czas, użytkownik, ilość | | |
| F2 | Spróbuj „usunąć” lub edytować wpis z poziomu UI | Brak takiej możliwości (nieedytowalna historia) | | |

### M-F7 — Przyjęcia zewnętrzne (PZ)

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| G1 | **PZ**: utwórz dokument, pozycje, dostawę do strefy przyjęć | Zapis szkicu / workflow zgodny z aplikacją | | |
| G2 | „Start” / przyjęcie na strefę buforową (wg procesu w UI) | Stan zmienia się, stany rosną | | |
| G3 | Zakończenie procesu PZ | Dokument w statusie końcowym, stany spójne | | |

### M-F8 — Put-away (rozmieszczenie)

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| H1 | Z poziomu **Rozmieszczanie** lub zadania: przenieś z bufora na docelową lokalizację | Stan maleje w buforze, rośnie na docelowej | | |
| H2 | Wpis w rejestrze ruchów | Widoczny | | |

### M-F9 — Przesunięcia (MM)

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| I1 | **MM**: utwórz, wybierz źródło i cel | Walidacja (np. ten sam produkt / ilość) | | |
| I2 | Zatwierdź MM | Stany się przesuwają, ewentualnie zadania MOVE | | |

### M-F10 — Wydania / picking (RW)

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| J1 | **RW**: utwórz, kompletacja z lokalizacji (strefa picking) | Proces zgodny z regułami (np. blokada bez stanu) | | |
| J2 | Po kompletacji stan maleje | Zgodnie z ilością | | |
| J3 | **Kompletacja** (web): lista / operacje | Spójne z dokumentem | | |

### M-F11 — Inwentaryzacja

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| K1 | **Inwentaryzacja**: wprowadź faktyczny stan vs systemowy | Widoczne różnice | | |
| K2 | Zatwierdź korekty (wg roli — macierz: tylko wyższe role, nie Magazynier) | Stany po zatwierdzeniu = faktyczne | | |

### M-F12 — Interfejs zarządczy (desktop)

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| L1 | Otwórz aplikację na **laptopie** w oknie szerokim | Sidebar / układ „desktop”, nie tylko mobile | | |
| L2 | Konfiguracja (ustawienia, użytkownicy, słowniki) dostępna dla ADMIN | Tak | | |

### M-F13 — Interfejs mobilny (responsywny)

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| M1 | Zmniejsz okno przeglądarki lub użyj telefonu | Układ się adaptuje, duże przyciski, czytelne napisy | | |
| M2 | Kluczowe akcje (zadania, skan) bez poziomego scrolla chaosu | Użyteczne | | |

### M-F14 — Lista zadań (magazynier)

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| N1 | Zaloguj jako **WORKER** | Widzisz **Zadania** | | |
| N2 | Filtry / typy: put-away, move, picking, inwentaryzacja | Zgodne z dokumentami w systemie | | |
| N3 | Otwórz zadanie i dokończ kroki | Status zadania się zmienia | | |

### M-F15 — Tworzenie kont przez administratora (e-mail, kod 5 cyfr, link hasła)

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| O1 | Jako ADMIN: **dodaj użytkownika** z e-mailem | Konto powstaje, login = 5 cyfr | | |
| O2 | (Jeśli SMTP wyłączone w dev) | Czy jest ścieżka testowa / komunikat? | | PDF wymaga maila — oznacz N/D lub FAIL jeśli brak |
| O3 | Link ustawienia hasła | Działa przy włączonym SMTP | | |

---

## B. SHOULD HAVE (funkcjonalne)

### S-F1 — Generowanie zadań z dokumentów

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| P1 | Po zatwierdzeniu PZ pojawia się zadanie typu „odłóż” / put-away | Tak (lub workflow równoważny) | | |

### S-F3 — Statusy zapasu (np. Dostępny / Zablokowany)

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| Q1 | Na **stanach** lub mobilce: zmiana statusu jakościowego | Widoczna na liście / filtrach | | |
| Q2 | Sprawdź wpis w ledger / audit | Ślad operacji | | |

### S-F4 — Raportowanie i eksport

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| R1 | **Raporty**: zestawienia stanów / ruchów | Dane sensowne | | |
| R2 | Eksport (CSV/PDF – jeśli jest) | Plik pobierany | | |

### S-F5 — Dziennik zdarzeń (Audit Log)

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| S1 | Zmień atrybut produktu (np. nazwa) | Wpis w **Dzienniku zdarzeń**: kto, kiedy | | |
| S2 | Dostęp wg roli (FOREMAN vs WORKER) | Zgodnie z macierzą „Raporty i historia” | | |

### WF1 — Brak integracji e-commerce

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| | Nie testuj integracji WooCommerce/Shopify | W zakresie = brak | **N/D** | |

---

## C. COULD HAVE (funkcjonalne) — opcjonalnie

| ID | Temat | Kroki skrótowo | Wynik |
|----|-------|----------------|-------|
| C-F1 | PDF dokumentów | PZ/MM/RW → generuj PDF | |
| C-F2 | Packing | Po picking: ekran weryfikacji paczki | |
| C-F3 | Partie / FEFO | Pola partii na produkcie / ruchach | |
| C-F4 | Zwroty | Proces zwrotu | |
| C-F5 | Wiele magazynów | Wybór magazynu / rozdzielenie stanów | |

---

## D. Wymagania niefunkcjonalne — MUST HAVE

### N-01 — Hasła jako skrót (bcrypt/argon2)

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| T1 | W bazie: kolumna hasła (hash) nie przypomina plaintext | Tylko hash | | Sprawdź tylko na dev |
| T2 | Logowanie działa tylko z poprawnym hasłem | – | | |

### N-02 — HTTPS

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| U1 | Produkcja / staging: adres z `https://` | Certyfikat, bez mixed content | | **Lokalnie `http` — wpisz CZĘŚCIOWO + data środowiska** |
| U2 | Dev lokalny | `http://localhost` akceptowalne na dev | | |

### N-03 — Egzekwowanie ról (także przy obejściu UI)

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| | Patrz B6 | API odmawia | | |

### N-05 — Czas odpowiedzi (≤2 s dla 95% przy ≤10 użytkownikach)

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| V1 | Otwórz listę zadań, dokumenty, stan — **10 razy** z metodą „subiektywnie / stoper” | Większość < 2 s | | Pełny pomiar 95% = osobny load test |
| V2 | Przy większym obciążeniu | Dokumentuj degradację | | Patrz benchmarki w repo jeśli są |

### N-06 — Atomowość dokumentów magazynowych

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| W1 | Symuluj błąd w trakcie zatwierdzania (np. ubij backend / odśwież) — **tylko na kopii bazy** | Brak „połówkowych” stanów lub rollback | | Ostrożnie na dev |

### N-08 — UI mobilny (duże cele, czytelność)

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| | Patrz M1–M2 + mobilka Flutter | | | |

### N-11 — Rejestrowanie działań (logowanie, dokumenty, zmiana stanu)

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| X1 | Zaloguj się, utwórz PZ, zmień stan | Wpis w audit / logach z datą i użytkownikiem | | |

### N-13 — Czytelność kodu / konwencje

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| Y1 | Uruchom linter (np. `ruff`, ESLint) w repo | Raport bez krytycznych odstępstw od zasad projektu | | Ocena zespołowa |

### N-15 — Przeglądarki (Chrome, Firefox, Edge)

| # | Krok | Oczekiwane | Wynik | Uwagi |
|---|------|------------|-------|-------|
| Z1 | Ten sam scenariusz (logowanie + jedna ścieżka) na **Chrome** | OK | | |
| Z2 | **Firefox** | OK | | |
| Z3 | **Edge** | OK | | |

---

## E. SHOULD HAVE (niefunkcjonalne)

| ID | Temat | Jak sprawdzić krótko | Wynik |
|----|-------|----------------------|-------|
| N-04 | Polityka haseł (min. 8 znaków, litery+cyfry, rot co 180 dni) | Formularz zmiany hasła / walidacja przy reset | |
| N-07 | Backup bazy (≥1/dzień, odtwarzanie) | Procedura ops / Docker volume (nie funkcja aplikacji) | |
| N-09 | Max ~5 kroków typowego zadania | Policz ekrany: wybór zadania → zakończenie | |
| N-10 | Spójność UI (nazwy statusów, ikony) | Przejście po modułach — wizualnie | |
| N-12 | Retencja logów 12 mies. + filtry | Ustawienia / zapytania audit z zakresem dat | |
| N-14 | Dokumentacja techniczna | Czy DEMO.md / README / docker opisują start | |

---

## F. COULD HAVE / WON’T HAVE

| ID | Opis | Wynik |
|----|------|-------|
| N-16 | Docker / konteneryzacja | Czy `docker compose` działa |
| N-17 | Brak pełnego offline na mobilce | Włącz tryb samolot → oczekiwana komunikacja o braku sieci |

---

## Podsumowanie po testach

Wypełnij:

- **Data testów:**
- **Środowisko:** (localhost / serwer / docker)
- **Wersja / commit:**
- **Liczba FAIL / BLOK:**
- **Top 3 usterki do naprawy:**

---

*Scenariusz opracowany na podstawie pliku PDF z wymaganiami; mapowanie ról do kodu: `ADMIN`, `MANAGER`, `FOREMAN`, `WORKER`. W razie rozjazdu macierzy PDF z implementacją — zapisz jako defekt i popraw albo dokumentację, albo kod.*
