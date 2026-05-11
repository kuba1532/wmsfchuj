#!/usr/bin/env python3
"""Generuje RYZYKA_I_PLAN_MONITOROWANIA_WMS.xlsx — ryzyka, plan monitorowania, audyt (openpyxl)."""

from __future__ import annotations

from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "RYZYKA_I_PLAN_MONITOROWANIA_WMS.xlsx"

HEADER_FILL = PatternFill("solid", fgColor="1F4E79")
HEADER_FONT = Font(bold=True, color="FFFFFF")
SUB_FILL = PatternFill("solid", fgColor="D6DCE4")
THIN = Side(style="thin", color="FFAAAAAA")


def style_header_row(ws, row: int, ncols: int) -> None:
    for c in range(1, ncols + 1):
        cell = ws.cell(row=row, column=c)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(wrap_text=True, vertical="center")
        cell.border = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)


def autosize_columns(ws, max_width: float = 55) -> None:
    for col in range(1, ws.max_column + 1):
        letter = get_column_letter(col)
        best = 10
        for row in range(1, min(ws.max_row + 1, 200)):
            v = ws.cell(row=row, column=col).value
            if v is not None:
                best = max(best, min(max_width, len(str(v)) * 1.05 + 2))
        ws.column_dimensions[letter].width = best


def add_validation_list(ws, col_letter: str, start_row: int, end_row: int, formula: str) -> None:
    dv = DataValidation(type="list", formula1=formula, allow_blank=True)
    ws.add_data_validation(dv)
    dv.add(f"{col_letter}{start_row}:{col_letter}{end_row}")


def main() -> None:
    wb = Workbook()

    # --- Instrukcja ---
    ws0 = wb.active
    ws0.title = "Instrukcja"
    lines = [
        ("Ryzyka projektowe WMS + plan monitorowania + audyt (Excel)", True),
        ("Plik do przekazania weryfikatorowi (np. kolega z zespołu).", False),
        ("", False),
        ("Jak wypełniać:", True),
        ("• Arkusz „Ryzyka” — kolumny F–I (weryfikacja) uzupełnia osoba sprawdzająca; D–E to propozycja zespołu.", False),
        ("• Arkusz „Plan monitorowania” — checklisty cykliczne; kolumny „Wykonano / Data / Uwagi” wypełnia wykonawca lub reviewer.", False),
        ("• Arkusz „Audyt techniczny” — punkt po punkcie zweryfikować środowisko (web + API + mobilka); status: OK / DO POPRAWY / N/D.", False),
        ("", False),
        ("Źródło opisowe (Markdown): RYZYKA_I_PLAN_MONITOROWANIA_WMS.md", False),
        ("Regeneracja: python scripts/generate_risks_monitoring_xlsx.py", False),
        ("", False),
        ("Wersja dokumentu / data generacji:", False),
        ("Środowisko testów (URL backendu, build mobilki):", False),
        ("Osoba przekazująca plik:", False),
    ]
    for i, (text, bold) in enumerate(lines, start=1):
        c = ws0.cell(row=i, column=1, value=text)
        c.font = Font(bold=bold)
        c.alignment = Alignment(wrap_text=True, vertical="top")
    ws0.column_dimensions["A"].width = 92

    # --- Ryzyka ---
    ws_r = wb.create_sheet("Ryzyka", 1)
    risk_headers = [
        "ID",
        "Ryzyko",
        "Typ",
        "Poziom ryzyka (szac. zespołu)",
        "Prawdopodobieństwo",
        "Wpływ",
        "Mitigacja (działania)",
        "Weryfikacja: czy mitigacja wystarczająca? (TAK/NIE/CZĘŚCIOWO/N/D)",
        "Uwagi weryfikatora",
        "Data weryfikacji",
        "Weryfikator (imię / e-mail)",
    ]
    for col, h in enumerate(risk_headers, start=1):
        ws_r.cell(row=1, column=col, value=h)
    style_header_row(ws_r, 1, len(risk_headers))

    risks_rows: list[tuple[str, ...]] = [
        (
            "R1",
            "Niespójność danych między aplikacją web a mobilną przy równoległej pracy użytkowników",
            "Techniczne",
            "Wysoki",
            "Średnie",
            "Wysoki",
            "Auto-refresh list, spójne parametry API (np. omit_terminal), ten sam model #id zadań; UAT multi-device; po operacji odświeżenie.",
            "",
            "",
            "",
            "",
        ),
        (
            "R2",
            "Błędy procesu RW / kompletacji przy niewystarczającym stanie w lokalizacji źródłowej",
            "Techniczne",
            "Wysoki",
            "Średnie",
            "Wysoki",
            "Walidacja backend; scenariusze negatywne; komunikaty zrozumiałe dla operatora; test regresji przed demo.",
            "",
            "",
            "",
            "",
        ),
        (
            "R3",
            "Luki lub niespójności macierzy ról (ADMIN / MANAGER / FOREMAN / WORKER)",
            "Techniczne",
            "Średni",
            "Niskie",
            "Wysoki",
            "Testy per rola; dokumentacja oczekiwanego 403; regresja po zmianach auth.",
            "",
            "",
            "",
            "",
        ),
        (
            "R4",
            "Dystrybucja iOS (certyfikaty, provisioning, App Store / TestFlight)",
            "Techniczne",
            "Średni",
            "Średnie",
            "Średni",
            "Pipeline buildów; checklista release; dry-run przed pokazem zewnętrznym.",
            "",
            "",
            "",
            "",
        ),
        (
            "R5",
            "Rozjazd oczekiwań interesariuszy względem realnego zakresu (demo vs produkcja)",
            "Komunikacyjne",
            "Średni",
            "Średnie",
            "Średni",
            "Cotygodniowy sync; protokół decyzji; jawna lista Must/Should/Could; „co działa dziś” vs roadmapa.",
            "",
            "",
            "",
            "",
        ),
        (
            "R6",
            "Nadmierne obietnice funkcji „na demo” bez pokrycia testami",
            "Komunikacyjne",
            "Średni",
            "Średnie",
            "Wysoki",
            "Artefakty testowe (raporty, screeny); tylko scenariusze ze statusem PASS wchodzą na pokaz krytyczny.",
            "",
            "",
            "",
            "",
        ),
        (
            "R7",
            "Utrata spójności danych po migracjach bazy lub ręcznych zmianach seed",
            "Techniczne",
            "Średni",
            "Niskie",
            "Średni",
            "Alembic head na każdym środowisku; backup przed migracją; seed tylko na dev/demo.",
            "",
            "",
            "",
            "",
        ),
        (
            "R8",
            "Sesja / tokeny JWT — wygaśnięcie w trakcie długiej sesji demo",
            "Techniczne",
            "Niski",
            "Średnie",
            "Średni",
            "Refresh token; komunikat w UI; krótkie przerwy na ponowne logowanie w scenariuszu.",
            "",
            "",
            "",
            "",
        ),
        (
            "R9",
            "Testy E2E zależne od selektorów UI — fałszywe negatywy po refaktorze frontu",
            "Techniczne",
            "Średni",
            "Średnie",
            "Średni",
            "Równolegle testy API; stabilne identyfikatory; przegląd po większych zmianach layoutu.",
            "",
            "",
            "",
            "",
        ),
    ]
    for r_i, row in enumerate(risks_rows, start=2):
        for c_i, val in enumerate(row, start=1):
            cell = ws_r.cell(row=r_i, column=c_i, value=val)
            cell.alignment = Alignment(wrap_text=True, vertical="top")
            cell.border = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
    add_validation_list(ws_r, "H", 2, 1 + len(risks_rows), '"TAK,NIE,CZĘŚCIOWO,N/D"')
    autosize_columns(ws_r)

    # --- Plan monitorowania ---
    ws_m = wb.create_sheet("Plan monitorowania", 2)
    m_headers = [
        "Warstwa / obszar",
        "Opis",
        "Częstotliwość (propozycja)",
        "Odpowiedzialny (rola)",
        "Wykonano (TAK/NIE/CZĘŚCIOWO)",
        "Data ostatniego wykonania",
        "Uwagi / link do raportu",
    ]
    for col, h in enumerate(m_headers, start=1):
        ws_m.cell(row=1, column=col, value=h)
    style_header_row(ws_m, 1, len(m_headers))

    monitoring_rows = [
        (
            "Smoke techniczny",
            "Health backend (/api/health), docs OpenAPI, logowanie, podstawowe GET list (produkty, lokalizacje, zadania).",
            "Przed każdym demo/release; po deployu",
            "DevOps / dev",
            "",
            "",
            "",
        ),
        (
            "Testy integracyjne API",
            "PZ / MM / RW; generowanie zadań; start/complete task; walidacje negatywne (brak stanu, zły kod lokalizacji).",
            "Po większych zmianach backendu",
            "Backend dev / QA",
            "",
            "",
            "",
        ),
        (
            "UAT per rola",
            "ADMIN, MANAGER, FOREMAN, WORKER — dostęp do zakładek i endpointów zgodnie z macierzą.",
            "Przed pokazem; po zmianach uprawnień",
            "QA / właściciel produktu",
            "",
            "",
            "",
        ),
        (
            "Regresja UI (web + mobilka)",
            "Kluczowe ekrany: dokumenty, zadania, skan, stany; spójność #id zadań i etykiet.",
            "Po zmianach frontu lub Flutter",
            "QA",
            "",
            "",
            "",
        ),
        (
            "Mobilka — skaner",
            "Skan SKU, EAN, kodu lokalizacji; ścieżki potwierdzenia miejsca przy complete.",
            "Przed demo z udziałem mobilki",
            "Tester z urządzeniem",
            "",
            "",
            "",
        ),
        (
            "KPI jakości (próg)",
            "0 krytycznych 5xx w scenariuszach demo; 0 regresji PZ/MM/RW; 0 błędów auth poza oczekiwanym 403; UAT ≥ 95% PASS.",
            "Podsumowanie po rundzie testów",
            "Lead QA",
            "",
            "",
            "",
        ),
    ]
    for r_i, row in enumerate(monitoring_rows, start=2):
        for c_i, val in enumerate(row, start=1):
            cell = ws_m.cell(row=r_i, column=c_i, value=val)
            cell.alignment = Alignment(wrap_text=True, vertical="top")
            cell.border = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
    add_validation_list(ws_m, "E", 2, 1 + len(monitoring_rows), '"TAK,NIE,CZĘŚCIOWO"')
    autosize_columns(ws_m)

    # --- Audyt techniczny (do sprawdzenia przez kolegę) ---
    ws_a = wb.create_sheet("Audyt techniczny", 3)
    a_headers = [
        "ID",
        "Obszar",
        "Pytanie / kryterium",
        "Jak sprawdzić (krótko)",
        "Status (OK / DO POPRAWY / N/D)",
        "Uwagi / dowód (link, screen, commit)",
    ]
    for col, h in enumerate(a_headers, start=1):
        ws_a.cell(row=1, column=col, value=h)
    style_header_row(ws_a, 1, len(a_headers))

    audit_rows = [
        (
            "A1",
            "Spójność web ↔ mobilka",
            "Czy ta sama lista aktywnych zadań jest widoczna przy tym samym użytkowniku i roli (porównanie #id)?",
            "Zaloguj WORKER na web i mobilce; filtr aktywnych; porównaj numery zadań.",
            "",
            "",
        ),
        (
            "A2",
            "API zadania",
            "Czy web używa tych samych parametrów co mobilka dla listy „aktywnych” (np. omit_terminal)?",
            "DevTools sieć / log mobilki; porównaj query do GET /tasks.",
            "",
            "",
        ),
        (
            "A3",
            "Dokumenty MM/RW",
            "Czy zatwierdzenie dokumentu działa dla roli magazyniera (403 vs sukces) zgodnie z polityką?",
            "WORKER: Zatwierdź MM/RW na webie; ten sam flow na mobilce.",
            "",
            "",
        ),
        (
            "A4",
            "PZ",
            "Czy po rejestracji PZ powstają zadania odłożenia i widać je pod tym samym #id na obu klientach?",
            "Utwórz PZ → Zarejestruj → sprawdź Zadania i powiązania w podglądzie dokumentu.",
            "",
            "",
        ),
        (
            "A5",
            "Stany magazynowe",
            "Czy ilości i lokalizacje zgadzają się między web / mobilka po operacji MM lub PZ complete?",
            "Porównaj ekran Stanów i kartę zadania przed/po.",
            "",
            "",
        ),
        (
            "A6",
            "Uprawnienia",
            "Czy WORKER nie widzi modułów zarezerwowanych dla wyższych ról (np. użytkownicy, audyt)?",
            "Przejdź po URL lub menu; oczekuj braku dostępu lub pustej listy zgodnie z projektem.",
            "",
            "",
        ),
        (
            "A7",
            "Bezpieczeństwo",
            "Czy wrażliwe dane nie trafiają do logów frontu; czy JWT nie jest w URL?",
            "Przegląd konsoli i żądań sieciowych podczas logowania.",
            "",
            "",
        ),
        (
            "A8",
            "Backup i migracje",
            "Czy środowisko demo ma spójną wersję migracji Alembic (head)?",
            "alembic current / historia deployu.",
            "",
            "",
        ),
        (
            "A9",
            "Artefakty testowe",
            "Czy istnieją aktualne raporty UAT / E2E lub zrzuty potwierdzające kluczowe scenariusze?",
            "Katalog e2e_tests, RAPORT*.md lub Excel scenariusza.",
            "",
            "",
        ),
        (
            "A10",
            "Demo — materiały pomocnicze",
            "Czy kody kreskowe (produkty / lokalizacje) odpowiadają danym w bazie po seedzie prezentacyjnym?",
            "Otwórz barcodes_*.html; zeskanuj; porównaj z listą w WMS.",
            "",
            "",
        ),
    ]
    for r_i, row in enumerate(audit_rows, start=2):
        for c_i, val in enumerate(row, start=1):
            cell = ws_a.cell(row=r_i, column=c_i, value=val)
            cell.alignment = Alignment(wrap_text=True, vertical="top")
            cell.border = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
    add_validation_list(ws_a, "E", 2, 1 + len(audit_rows), '"OK,DO POPRAWY,N/D"')
    autosize_columns(ws_a)

    wb.save(OUT)
    print(f"Zapisano: {OUT}")


if __name__ == "__main__":
    main()
