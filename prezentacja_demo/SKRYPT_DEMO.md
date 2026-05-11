# WMS — Demo na żywo (10–12 min)

> **Plik prezentacji:** `WMS_demo_prezentacja.pptx`
> **Folder zrzutów:** `zrzuty/`
> **Hard refresh w przeglądarce przed startem:** `Cmd + Shift + R`

---

## ✅ Sprawdzone na żywo (5 minut przed prezentacją)

| Krok | Wynik |
|---|---|
| Backend `/auth /products /locations /stock /tasks /documents /audit-log` | HTTP 200 |
| PZ end-to-end: utworzenie → Zarejestruj → 3 kroki PUTAWAY → status **Zakończony** | ✓ działa |
| Ledger pokazuje natychmiast operacje **Przyjęcie + Rozmieszczenie** | ✓ działa |
| Audit Log: 418 zdarzeń, każdy klik zapisany | ✓ działa |
| Wszystkie 14 stron frontu | HTTP 200 |

---

## 🎬 Krok po kroku

### 1. Logowanie (slajd 2)
- URL: **http://localhost:5173**
- Kod: **00001**, hasło: **MojeHasloAdmina2026!WMS**
- → klik **Zaloguj się**

### 2. Pulpit (slajd 3)
- Pokaż liczniki: produkty, zadania, dokumenty, blokady
- Wytłumacz: auto-refresh, motyw jasny/ciemny

### 3. Lista PZ (slajd 4)
- Menu **Operacje → Przyjęcia (PZ)** (lub URL `/documents/pz`)
- Pokaż statusy + akcje w wierszach (Zarejestruj / Rozmieść / Podgląd)

### 4. Tworzenie nowego PZ (slajd 5)
- Klik **+ Nowe przyjęcie**
- Dostawca: **SUP-001 — Northwind Supplies**
- Produkt: **PRD-0001 (Moduł podstawowy X)**
- Odłożenie: **STO-01**
- Ilość: **1**
- → **Utwórz dokument**

### 5. PZ „Nowy” (slajd 6)
- Pokaż, że na liście pojawia się **PZ/2026/0XX** ze statusem **Nowy**
- Pokaż przycisk **Zarejestruj** w wierszu

### 6. Rejestracja na buforze (slajd 7)
- Klik **Zarejestruj** → status zmienia się na **W trakcie**
- W tle: stock zaksięgowany na REC-01 + utworzone zadanie PUTAWAY

### 7. Lista zadań rozmieszczania (slajd 8)
- Klik **Rozmieść** lub menu **Operacje → Rozmieszczanie**
- Pokaż pierwsze zadanie u góry: 1 szt PRD-0001 REC-01 → STO-01

### 8. Stepper (slajd 9)
- Klik **Rozpocznij** → **Następny krok** → **Następny krok** → **Zakończ**
- Wytłumacz 3 kroki: Pobierz / Przenieś / Potwierdź

### 9. PZ zamknięty (slajd 10)
- Wróć na **Operacje → Przyjęcia (PZ)**
- Pokaż, że dokument ma status **Zakończony** ✓

### 10. MM — Przesunięcie (slajd 11)
- Menu **Operacje → Przesunięcia (MM)**
- Klik **+ Nowe przesunięcie**
- Z lokalizacji: **STO-A-01** → Do: **PICK-A-01**
- Produkt: PRD-0001, ilość 1 → **Utwórz**
- W wierszu: **Zatwierdź** → **Wygeneruj zadania**
- Menu **Zadania** → wykonaj MOVE (Rozpocznij + Zakończ)

### 11. RW — Wydanie (slajd 12)
- Menu **Operacje → Wydania (RW)**
- Klik **+ Nowe wydanie**
- Odbiorca: **Demo Klient**
- Produkt: PRD-0001, ilość 1 → **Utwórz**
- W wierszu: **Zatwierdź** → **Wygeneruj zadania**
- Menu **Zadania** → wykonaj PICKING

### 12. Stany magazynowe (slajd 13)
- Menu **Operacje → Stany**
- Pokaż lokalizacje + ilości + statusy

### 13. Rejestr ruchów (slajd 14)
- Menu **Operacje → Rejestr ruchów**
- Pokaż wpisy **Przyjęcie / Rozmieszczenie / Wydanie / Przesunięcie** dla świeżych dokumentów

### 14. Audit log (slajd 15)
- Menu **Więcej → Dziennik zdarzeń**
- 400+ zdarzeń, kto/kiedy/co

### 15. Raporty (slajd 16)
- Menu **Więcej → Raporty**
- Pokaż 4 raporty + przyciski CSV / XLSX
- Opcjonalnie: pobierz **Stany — XLSX**, otwórz w Excelu

### 16. Użytkownicy (slajd 17)
- Menu **Więcej → Użytkownicy**
- Pokaż listę 15 kont z rolami
- Wspomnij: **+ Utwórz konto** wysyła mail z linkiem do ustawienia hasła

---

## ⚠️ Drobiazgi, o których musisz wiedzieć (nie blokery)

1. **MM/RW po zadaniu zostają w statusie „W trakcie”** (nie zamykają się jak PZ). Powiedz: „dokument może mieć wiele linii — operator zamyka świadomie”.
2. **RW wymaga towaru w strefie pickingowej** (`PICK-*`). Gdy pokazujesz na świeżych danych: zrób MM **STO-A-01 → PICK-A-01** zanim zaczniesz RW.
3. **Stary „zablokowany” stock** na liście — historyczne dane z fazy beta, nic nie psują.
4. **Hard reload** (`Cmd+Shift+R`) przed prezentacją — gwarantuje świeży frontend.

---

## 🎤 Pytania, na które warto być przygotowanym

| Pytanie | Odpowiedź |
|---|---|
| „Co się dzieje, gdy dwóch operatorów jednocześnie ruszy ten sam stock?” | Optimistic locking + version column → drugi operator dostaje 409 i widzi błąd. |
| „Skąd masz pewność, że stan się zgadza?” | Każdy ruch = wpis w Stock Ledger (immutable). Można zrekonstruować stan na dowolny moment. |
| „Co z rolami?” | Magazynier widzi tylko swoje zadania, Brygadzista wszystkie, Kierownik + Admin mają reporty. |
| „A mobilka?” | Ten sam backend, ten sam stock. Skaner kodów + offline-first cache zadań. |
| „Czy są maile?” | Tak, SMTP (Gmail App Password) — przy zakładaniu konta wysyła link do ustawienia hasła. |
| „Czemu MM/RW nie zamyka się samo?” | Świadoma decyzja — dokumenty mogą mieć wiele linii i operator może chcieć dopisać kolejną. |
