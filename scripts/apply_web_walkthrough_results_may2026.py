#!/usr/bin/env python3
"""Wypełnia kolumny Wynik/Uwagi w SCENARIUS_TESTOW_RECZNY_WYMAGANIA.xlsx po przejściu web (lokalne demo)."""

from __future__ import annotations

from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / "SCENARIUS_TESTOW_RECZNY_WYMAGANIA.xlsx"

# Klucz: wiersz w arkuszu „Scenariusz” (nagłówek = 1); wartości z sesji 2026-05-06 (Chrome MCP, admin 00001).
ROW_RESULTS: dict[int, tuple[str, str]] = {
    2: ("PASS", "Pola login (5 cyfr) + hasło. Zrzut: wyniki_scenariusza_auto/screenshots/A1_login_strona.png"),
    3: (
        "CZĘŚCIOWO",
        "Komunikat błędu pojawia się (toast); mógł zniknąć przed zrzutem. A2_po_blednym_hasle_toast_minal.png",
    ),
    4: ("PASS", "Dashboard po 00001. A3_dashboard_po_logowaniu.png"),
    5: ("N/D", "Logowanie Flutter wymaga aplikacji mobilnej — nie w tej sesji przeglądarki."),
    6: ("PASS", "Użytkownicy (5 rek.) + Ustawienia. K_uzytkownicy.png, L_ustawienia.png"),
    7: ("BLOK", "Brak sesji WORKER w przeglądarce — sprawdź ręcznie lub w kolejnej sesji."),
    8: ("BLOK", "Jak B2."),
    9: ("BLOK", "Brak sesji FOREMAN w przeglądarce."),
    10: ("BLOK", "Brak sesji MANAGER w przeglądarce."),
    11: ("PASS", "API: GET /api/v1/users z tokenem WORKER → 403 (zgodnie z oczekiwaniem)."),
    12: (
        "CZĘŚCIOWO",
        "Lista produktów OK (8 poz., C1_Produkty_lista.png). Dodawanie nowego SKU nie wykonane w sesji.",
    ),
    13: ("BLOK", "Edycja produktu — nie wykonano."),
    14: (
        "CZĘŚCIOWO",
        "Lista i kolumny OK; pełne wyszukiwanie po SKU nie udokumentowane testem.",
    ),
    15: (
        "CZĘŚCIOWO",
        "Widok lokalizacji (8, m.in. BUFFER). D_lokalizacje.png. Nowa hierarchia nie dodawana.",
    ),
    16: ("PASS", "Lista spójna z demo. D_lokalizacje.png"),
    17: ("PASS", "Stany: E_stany.png"),
    18: ("BLOK", "Bez nowego dokumentu PZ/MM w tej sesji — regresja stanów nie testowana."),
    19: ("PASS", "26 wpisów w rejestrze. F_rejestr_ruchow.png"),
    20: ("CZĘŚCIOWO", "Brak jawnej próby edycji/usunięcia wpisu — UI wygląda na tylko do odczytu."),
    21: ("CZĘŚCIOWO", "Lista PZ (14 dokumentów). G_PZ_lista.png. Pełny workflow utworzenia nie wykonany."),
    22: ("BLOK", "Jak G1 — tylko podgląd listy."),
    23: ("BLOK", "Jak G1."),
    24: ("BLOK", "Put-away / Rozmieszczanie — nie wykonano ścieżki operacyjnej."),
    25: ("BLOK", "—"),
    26: ("BLOK", "MM — nie wykonano w UI."),
    27: ("BLOK", "—"),
    28: ("BLOK", "RW / picking — nie wykonano."),
    29: ("BLOK", "—"),
    30: ("BLOK", "—"),
    31: ("BLOK", "Inwentaryzacja — nie wykonano."),
    32: ("BLOK", "—"),
    33: (
        "CZĘŚCIOWO",
        "Okno 1440×900 w MCP: nadal układ z dolną nawigacją (jak mobile). L1_dashboard_1440px.png, wcześniej L1_dashboard_szeroki.png",
    ),
    34: ("PASS", "ADMIN: /settings, /users, słowniki przez menu — potwierdzone dla ustawień i użytkowników."),
    35: ("PASS", "Layout responsywny (dolny pasek, karty). Nawigacja z /tasks itd."),
    36: ("PASS", "Zadania: czytelna karta (typ Przesunięcie). H_zadania_aktywne_Przesuniecie.png"),
    37: ("BLOK", "Sesja na koncie ADMIN; widok zadań nie z perspektywy WORKER."),
    38: (
        "CZĘŚCIOWO",
        "Widoczne zadanie typu przesunięcie; pełna weryfikacja filtrów typów — ograniczona.",
    ),
    39: ("BLOK", "Zadanie nie dokończone w sesji (brak potwierdzenia zmiany statusu)."),
    40: ("BLOK", "Tworzenie konta — nie wykonane."),
    41: ("BLOK", "—"),
    42: ("BLOK", "—"),
    43: (
        "CZĘŚCIOWO",
        "Na liście zadań widać m.in. „Przesunięcie” (MOVE) — sugeruje generowanie po dokumentach; pełna ścieżka PZ→zadanie nie przeszła.",
    ),
    44: ("BLOK", "Zmiana statusu zapasu — nie testowano."),
    45: ("BLOK", "—"),
    46: ("PASS", "Raporty: stany 5 rek., historia ruchów 26 rek. J_raporty.png"),
    47: (
        "CZĘŚCIOWO",
        "Przyciski CSV/XLSX widoczne w UI; faktyczne pobranie pliku niezweryfikowane w sesji.",
    ),
    48: (
        "CZĘŚCIOWO",
        "Dziennik: 283 wpisy (m.in. LOGIN). I_audit_log.png. Osobny krok „zmiana produktu → wpis” nie izolowany.",
    ),
    49: ("BLOK", "FOREMAN vs WORKER — brak porównania sesji."),
    50: ("N/D", "Poza zakresem integracji sklepu."),
    51: ("N/D", "Opcjonalne COULD — nie testowano."),
    52: ("N/D", "—"),
    53: ("N/D", "—"),
    54: ("N/D", "—"),
    55: ("N/D", "—"),
    56: ("BLOK", "Weryfikacja kolumny hasła w DB poza sesją UI."),
    57: ("PASS", "Logowanie tylko z poprawnym hasłem (por. A2/A3)."),
    58: ("N/D", "Produkcja/staging — nie to środowisko."),
    59: ("PASS", "http://localhost na dev (zgodnie z instrukcją MD)."),
    60: ("PASS", "Patrz wiersz B6 — 403 na API."),
    61: (
        "CZĘŚCIOWO",
        "Subiektywnie listy ładują się szybko; brak 10 powtórzeń ze stoperem.",
    ),
    62: ("BLOK", "Load test poza sesją."),
    63: ("BLOK", "Wymaga kopii bazy i symulacji błędu."),
    64: ("PASS", "Patrz M-F13 — responsywność potwierdzona."),
    65: ("PASS", "Audit log z datą, akcją, user id. I_audit_log.png"),
    66: ("BLOK", "Uruchomienie ruff/eslint poza sesją przeglądarki."),
    67: ("PASS", "Scenariusz w Chrome (Cursor browser MCP)."),
    68: ("N/D", "Firefox — nie testowano w tej sesji."),
    69: ("N/D", "Edge — nie testowano w tej sesji."),
    70: (
        "CZĘŚCIOWO",
        "Ustawienia: min. długość hasła 8 + opis N01a. Pełna rotacja 180 dni — niewidoczna w UI.",
    ),
    71: ("N/D", "Backup — procedura ops, nie aplikacja."),
    72: ("BLOK", "Liczba ekranów do końca zadania — nie mierzono."),
    73: ("CZĘŚCIOWO", "Subiektywnie spójny dark theme; pełny przegląd modułów nie zamknięty."),
    74: ("BLOK", "Retencja 12 mies. — nie weryfikowano konfiguracji."),
    75: ("PASS", "Repo: dokumentacja startu (README, Docker) — potwierdzenie poza przeglądarką."),
    76: ("PASS", "docker compose używany w projekcie (dev)."),
    77: ("N/D", "Tryb offline mobilki — poza sesją web."),
}


def main() -> None:
    wb = load_workbook(XLSX)
    ws = wb["Scenariusz"]
    for row, (wynik, uwagi) in ROW_RESULTS.items():
        ws.cell(row=row, column=7, value=wynik)
        ws.cell(row=row, column=8, value=uwagi)

    pod = wb["Podsumowanie"]
    pod.cell(row=3, column=2, value="2026-05-06")
    pod.cell(row=4, column=2, value="localhost: frontend :5173, API :8000; konto admin 00001 + dane demo")
    pod.cell(row=8, column=2, value="Szczegóły: wyniki_scenariusza_auto/RAPORT.md oraz folder screenshots/")

    wb.save(XLSX)
    print(f"Zaktualizowano: {XLSX}")


if __name__ == "__main__":
    main()
