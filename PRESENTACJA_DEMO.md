# Prezentacja Demo WMS

## Status uruchomienia

- Backend API: `http://127.0.0.1:8000`
- Frontend web lokalnie: `http://localhost:5173`
- Frontend web w sieci: `http://172.20.10.2:5173`
- Mobilka iPhone: urządzenie `Test (wireless)`
- API dla mobilki: `http://172.20.10.2:8000`

## Konta do logowania

### Administrator

- login: `00001`
- hasło: `Admin1234`
- rola: `ADMIN`

### Magazynier do mobilki i weba

- login: `00002`
- hasło: `Demo1234`
- rola: `WORKER`

### Kierownik

- login: `07821`
- hasło: `Demo1234`
- rola: `MANAGER`

### Brygadzista

- login: `40476`
- hasło: `Demo1234`
- rola: `FOREMAN`

## Dane przygotowane w systemie

### Produkty

- `DEMO-001` - Towar demo - skrzynki
- `DEMO-002` - Towar demo - palety
- `DEMO-010` - Karton wysylkowy M
- `DEMO-020` - Folia stretch 2kg
- `DEMO-030` - Etykieta logistyczna

### Lokalizacje

- `BUF-DEMO` - strefa buforowa
- `STO-DEMO` - lokalizacja skladowania
- `PICK-DEMO` - strefa kompletacji
- `BUF-01` - dodatkowy bufor
- `STO-A-01` - skladowanie A-01
- `STO-A-02` - skladowanie A-02
- `PICK-01` - kompletacja 01

### Dostawca

- `DEMO-SUP` - Dostawca demonstracyjny

### Zadania przypisane do `00002`

- `#10` - `PUTAWAY` - produkt `DEMO-001`, ilosc `4`, lokalizacja docelowa `BUF-DEMO`
- `#11` - `MOVE` - produkt `DEMO-001`, ilosc `2`, `BUF-DEMO -> STO-DEMO`
- `#12` - `PICKING` - produkt `DEMO-001`, ilosc `1`, `STO-DEMO -> PICK-DEMO`
- `#13` - `INVENTORY` - produkt `DEMO-001`, lokalizacja `STO-DEMO`

## Najlepszy scenariusz prezentacji

### 1. Wstep

Powiedz:

- system sklada sie z backendu FastAPI, panelu webowego React i aplikacji mobilnej Flutter
- web sluzy do zarzadzania magazynem, a mobilka do wykonywania operacji przez pracownika
- wszystkie dane trafiaja do jednego API i jednej bazy

### 2. Logowanie na webie

Zaloguj sie jako:

- login: `00001`
- haslo: `Admin1234`

### 3. Pokaz slownikow

Pokaz kolejno:

- `Uzytkownicy`
- `Produkty`
- `Lokalizacje`

Powiedz:

- uzytkownicy maja role i uprawnienia
- produkty to kartoteka SKU
- lokalizacje odwzorowuja fizyczny magazyn

### 4. Pokaz stanow magazynowych

Pokaz zakladke:

- `Stany magazynowe`

Powiedz:

- tutaj widac aktualny zapas z podzialem na lokalizacje i statusy
- stan w systemie jest podstawa do raportow i realizacji zadan

### 5. Pokaz raportow

Pokaz zakladke:

- `Raporty`

Pokaz karty:

- `Stany magazynowe`
- `Historia ruchow`
- `Realizacja zadan`
- `Analiza przyjec/wydan`

Powiedz:

- raporty korzystaja z aktualnych danych systemowych
- dane mozna eksportowac do `CSV` i `XLSX`

### 6. Pokaz dokumentow

Pokaz zakladki:

- `PZ`
- `MM`
- `RW`

Powiedz:

- dokumenty opisują operacje magazynowe
- z dokumentow moga wynikac zadania dla pracownikow

### 7. Pokaz listy zadan na webie

Pokaz zakladke:

- `Zadania`

Powiedz:

- zadania sa przypisywane do pracownika
- pracownik na mobilce widzi tylko swoje operacje

### 8. Pokaz mobilki

Zaloguj sie jako:

- login: `00002`
- haslo: `Demo1234`

Pokaz:

1. liste zadan
2. zadanie `PUTAWAY`
3. kliknij `Start`
4. kliknij `Zakoncz`
5. potem zadanie `MOVE` i analogicznie `Start` / `Zakoncz`

### 9. Wroc na web

Po wykonaniu zadania na telefonie wroc do:

- `Zadania`
- albo `Raporty`
- albo `Historia ruchow`

Powiedz:

- operacja wykonana na telefonie aktualizuje centralny system
- to pokazuje spojny przeplyw web + mobile + backend

## Przykladowe dane do recznego wpisywania

### Nowy uzytkownik

- imie: `Anna`
- nazwisko: `Nowak`
- email: `anna.nowak.demo@wms.pl`
- rola: `WORKER`
- haslo: `Demo1234`

### Nowy produkt

- SKU: `DEMO-040`
- EAN: `5901234123463`
- nazwa: `Tasma pakowa transparentna`
- jednostka: `szt`

### Nowa lokalizacja

- kod: `STO-B-01`
- typ: `STORAGE`
- rzad: `B`
- regal: `01`
- polka: `01`

### Przykladowe PZ

- dostawca: `Dostawca demonstracyjny`
- produkt: `DEMO-001`
- ilosc: `2`

### Przykladowe MM

- z lokalizacji: `BUF-DEMO`
- do lokalizacji: `STO-DEMO`
- produkt: `DEMO-001`
- ilosc: `1`

### Przykladowe RW

- odbiorca: `Zamowienie DEMO/002`
- produkt: `DEMO-001`
- ilosc: `1`

### Przykladowa inwentaryzacja

- pozycja 1: stan systemowy `10`, stan rzeczywisty `9`
- pozycja 2: stan systemowy `2`, stan rzeczywisty `2`

## Plan awaryjny na pokaz

Jesli czasu jest malo, pokaz tylko:

1. logowanie do weba `00001`
2. `Produkty`
3. `Lokalizacje`
4. `Stany magazynowe`
5. `Raporty`
6. logowanie do mobilki `00002`
7. wykonanie jednego zadania
8. powrot do weba i pokazanie efektu

## Krotki opis "co sie skad bierze"

- administrator tworzy uzytkownikow, produkty i lokalizacje
- dokumenty magazynowe opisują przyjecia, przesuniecia i wydania
- zadania sa przypisywane do pracownikow
- magazynier wykonuje zadania na telefonie
- system zapisuje wynik w stanach, historii i raportach
