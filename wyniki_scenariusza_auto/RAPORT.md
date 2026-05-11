# Raport przejścia scenariusza (web, automatyzacja przeglądarki)

**Data:** 2026-05-06  
**Środowisko:** `http://localhost:5173` + API `http://127.0.0.1:8000`  
**Konto:** Administrator `00001` (hasło jak w seedzie / dokumentacji).  
**Narzędzie:** przeglądarka sterowana z Cursor (Chrome MCP).  

## Zrzuty ekranu

| Plik | Co pokazuje |
|------|-------------|
| `screenshots/A1_login_strona.png` | Strona logowania |
| `screenshots/A2_po_blednym_hasle_toast_minal.png` | Po błędnym haśle (toast mógł zniknąć szybko) |
| `screenshots/A3_dashboard_po_logowaniu.png` | Dashboard po zalogowaniu |
| `screenshots/C1_Produkty_lista.png` | Lista produktów (8) |
| `screenshots/D_lokalizacje.png` | Lokalizacje (8) |
| `screenshots/E_stany.png` | Stany magazynowe |
| `screenshots/F_rejestr_ruchow.png` | Rejestr ruchów (26) |
| `screenshots/G_PZ_lista.png` | Lista dokumentów PZ (14) |
| `screenshots/H_zadania_aktywne_Przesuniecie.png` | Zadania, widok aktywnych — przykład „Przesunięcie” |
| `screenshots/I_audit_log.png` | Dziennik zdarzeń (łączna liczba wpisów widoczna w UI, m.in. LOGIN) |
| `screenshots/J_raporty.png` | Raporty (stany + historia ruchów, liczby rekordów) |
| `screenshots/K_uzytkownicy.png` | Użytkownicy (5 rekordów) |
| `screenshots/L_ustawienia.png` | Ustawienia systemu (bezpieczeństwo, MF17/MF19 itd.) |
| `screenshots/L1_dashboard_szeroki.png` | Dashboard przy wcześniejszym rozciągnięciu okna |
| `screenshots/L1_dashboard_1440px.png` | Dashboard przy 1440×900 — nadal widać dolny pasek nawigacji |

## Arkusz Excel

Kolumny **Wynik** i **Uwagi** w `SCENARIUS_TESTOW_RECZNY_WYMAGANIA.xlsx` zaktualizowano skryptem:

`backend/.venv/bin/python scripts/apply_web_walkthrough_results_may2026.py`

## Ograniczenia sesji

- Brak logowania jako **WORKER / FOREMAN / MANAGER** w przeglądarce — kroki B2–B5, N1 oraz część RBAC w UI pozostają **BLOK** do ręcznego domknięcia.
- **Mobilka (A4):** poza zakresem tej sesji (wymaga aplikacji Flutter).
- Pełne workflow **PZ / MM / RW / put-away / inwentaryzacja** i **tworzenie użytkownika** nie były wykonywane krok po kroku — tam wpisano **BLOK** lub **CZĘŚCIOWO** w Excelu z uzasadnieniem.
- Układ **„desktop z sidebar” (L1):** w tej przeglądarce przy szerokim oknie nadal dominował układ z dolną nawigacją — warto powtórzyć test na fizycznym laptopie / zwykłym Chrome.

## API (poza UI)

- **B6:** token roli WORKER — `GET /api/v1/users` → **403** (zgodnie z wymaganiem).
