#!/usr/bin/env python3
"""
Pobiera z MySQL aktywne SKU, EAN i kody lokalizacji (opcjonalnie numery dokumentów)
i generuje plik HTML z kodami kreskowymi (JsBarcode) do testów skanera Flutter.

Uruchomienie (z venv backendu, gdzie jest mysqlclient):
  cd backend && source .venv/bin/activate  # lub: poetry shell / pip venv
  python ../scripts/generate_scanner_barcodes_html.py

Domyślnie czyta backend/.env (DATABASE_URL). Host „db” z Docker Compose jest
zamieniany na 127.0.0.1:3307. Możesz nadpisać: --host 127.0.0.1 --port 3307

Bez bazy zapisze kody z seeda demo (PRD-1001, BUF-01, …).

Dodatkowo zawsze zapisuje dwa osobne pliki:
  - barcodes_produkty_stan.html — tylko produkty mające rekord w tabeli stock (SKU + EAN)
  - barcodes_lokalizacje.html — kody aktywnych lokalizacji
  (oraz kopie w frontend/public/ pod Vite).
"""

from __future__ import annotations

import argparse
import html
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND_ENV = ROOT / "backend" / ".env"
DEFAULT_OUT = ROOT / "barcodes_skaner_test.html"
JSBARCODE_VENDOR = ROOT / "scripts" / "vendor" / "JsBarcode.all.min.js"
FRONTEND_PUBLIC_VENDOR = ROOT / "frontend" / "public" / "vendor" / "JsBarcode.all.min.js"

# SKU z demo-zadań + typowe z PZ (Northwind); unikaj tylko PRD-100* jeśli w bazie są głównie PRD-000*.
FALLBACK_PRODUCTS: list[tuple[str, str | None]] = [
    ("PRD-0001", None),
    ("PRD-0002", None),
    ("PRD-1001", None),
    ("PRD-1002", None),
]
FALLBACK_LOCATIONS = ["BUF-01", "STO-01", "PICK-01", "REC-01", "STO-A-01", "PICK-A-01"]


def load_database_url(path: Path) -> str | None:
    if not path.is_file():
        return None
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("DATABASE_URL=") and not line.startswith("#"):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def parse_database_url(url: str) -> dict[str, str | int]:
    # mysql+mysqldb://user:pass@host:port/dbname
    if "://" not in url:
        raise ValueError("Niepoprawny DATABASE_URL")
    _, rest = url.split("://", 1)
    if "@" in rest:
        auth, hostpart = rest.rsplit("@", 1)
        user, sep, password = auth.partition(":")
        if not sep:
            password = ""
    else:
        user, password = "root", ""
        hostpart = rest
    hostpart = hostpart.split("?", 1)[0]
    if "/" not in hostpart:
        raise ValueError("Brak nazwy bazy w DATABASE_URL")
    hostport, database = hostpart.split("/", 1)
    if ":" in hostport:
        host, port_s = hostport.rsplit(":", 1)
        port = int(port_s)
    else:
        host, port = hostport, 3306
    if host == "db":
        host = "127.0.0.1"
        port = 3307
    return {
        "user": user,
        "password": password,
        "host": host,
        "port": port,
        "database": database,
    }


def ean13_checksum_ok(code: str) -> bool:
    if len(code) != 13 or not code.isdigit():
        return False
    body = [int(c) for c in code[:12]]
    check = int(code[12])
    total = sum(d * (3 if i % 2 else 1) for i, d in enumerate(body))
    return (10 - (total % 10)) % 10 == check


def fetch_from_mysql(
    cfg: dict[str, str | int],
) -> tuple[list[tuple[str, str | None]], list[tuple[str, str | None]], list[str], list[str]]:
    try:
        import MySQLdb  # type: ignore[import-untyped]
    except ImportError:
        raise RuntimeError(
            "Brak pakietu mysqlclient (MySQLdb). Uruchom skrypt w venv backendu: pip install -r requirements.txt"
        ) from None

    conn = MySQLdb.connect(
        host=str(cfg["host"]),
        port=int(cfg["port"]),
        user=str(cfg["user"]),
        passwd=str(cfg["password"]),
        db=str(cfg["database"]),
        charset="utf8mb4",
    )
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT sku, ean FROM products WHERE is_active = 1 ORDER BY id ASC",
        )
        products_all = [(str(r[0]), str(r[1]).strip() if r[1] else None) for r in cur.fetchall()]
        cur.execute(
            """
            SELECT DISTINCT p.sku, p.ean
            FROM products p
            INNER JOIN stock s ON s.product_id = p.id
            WHERE p.is_active = 1
            ORDER BY p.id ASC
            """,
        )
        products_on_stock = [(str(r[0]), str(r[1]).strip() if r[1] else None) for r in cur.fetchall()]
        cur.execute("SELECT code FROM locations WHERE is_active = 1 ORDER BY id ASC")
        locations = [str(r[0]) for r in cur.fetchall()]
        doc_numbers: list[str] = []
        try:
            cur.execute(
                "SELECT number FROM documents ORDER BY id DESC LIMIT 15",
            )
            doc_numbers = [str(r[0]) for r in cur.fetchall()]
        except Exception:
            pass
        return products_all, products_on_stock, locations, doc_numbers
    finally:
        conn.close()


def build_items(
    products: list[tuple[str, str | None]],
    locations: list[str],
    doc_numbers: list[str],
) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    seen: set[str] = set()

    def add(label: str, value: str, fmt: str) -> None:
        value = value.strip()
        if not value or value in seen:
            return
        seen.add(value)
        items.append({"label": label, "value": value, "format": fmt})

    for sku, ean in products:
        add("Produkt — SKU (Code 128)", sku, "CODE128")
        if ean:
            fmt = "EAN13" if ean13_checksum_ok(ean) else "CODE128"
            add(f"Produkt — EAN ({sku})", ean, fmt)

    for code in locations:
        add("Lokalizacja (Code 128)", code, "CODE128")

    for num in doc_numbers:
        # numery dokumentów często alfanumeryczne — tylko Code 128
        add("Numer dokumentu (Code 128)", num, "CODE128")

    return items


def build_product_stock_items(products: list[tuple[str, str | None]]) -> list[dict[str, str]]:
    """Tylko produkty z pozycją w stock (SKU + opcjonalnie EAN)."""
    items: list[dict[str, str]] = []
    seen: set[str] = set()

    def add(label: str, value: str, fmt: str) -> None:
        value = value.strip()
        if not value or value in seen:
            return
        seen.add(value)
        items.append({"label": label, "value": value, "format": fmt})

    for sku, ean in products:
        add("Produkt na stanie — SKU (Code 128)", sku, "CODE128")
        if ean:
            fmt = "EAN13" if ean13_checksum_ok(ean) else "CODE128"
            add(f"Produkt na stanie — EAN ({sku})", ean, fmt)
    return items


def build_location_items_only(locations: list[str]) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    for code in locations:
        c = code.strip()
        if not c or c in seen:
            continue
        seen.add(c)
        items.append({"label": "Lokalizacja (Code 128)", "value": c, "format": "CODE128"})
    return items


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>__HTML_TITLE__</title>
  <script src="__JSBARCODE_SRC__"></script>
  <style>
    body { font-family: "Segoe UI", system-ui, sans-serif; margin: 0; padding: 20px; background: #f4f6f8; color: #1e293b; }
    h1 { font-size: 1.35rem; }
    .meta { color: #64748b; font-size: 0.9rem; margin-bottom: 20px; }
    .grid { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
    .card {
      background: #fff; border-radius: 12px; padding: 16px 20px; box-shadow: 0 1px 3px rgba(0,0,0,.08);
      min-width: 260px; max-width: 360px; text-align: center;
    }
    .card h2 { font-size: 0.85rem; font-weight: 600; margin: 0 0 8px; color: #475569; text-transform: uppercase; letter-spacing: .03em; }
    .value { font-family: ui-monospace, monospace; font-size: 1.1rem; font-weight: 700; margin-bottom: 12px; word-break: break-all; }
    .barcode-wrap { display: flex; justify-content: center; margin-top: 8px; }
    .barcode-wrap canvas, .barcode-wrap svg { max-width: 100%; height: auto; }
    .hint { margin-top: 24px; padding: 16px; background: #e0f2fe; border-radius: 8px; font-size: 0.9rem; max-width: 720px; }
  </style>
</head>
<body>
  <h1>__H1__</h1>
  <p class="meta">Wygenerowano: __GENERATED_AT____SOURCE_LINE__</p>
  <div class="grid" id="grid"></div>
  <div class="hint">
    __HINT_BODY__
  </div>
  <script>
    const items = __ITEMS_JSON__;
    const grid = document.getElementById("grid");

    function jsBarcodeFormat(f) {
      if (f === "EAN13") return "EAN13";
      return "CODE128";
    }

    items.forEach(function (item, i) {
      const card = document.createElement("div");
      card.className = "card";

      const h2 = document.createElement("h2");
      h2.textContent = item.label;
      card.appendChild(h2);

      const val = document.createElement("div");
      val.className = "value";
      val.textContent = item.value;
      card.appendChild(val);

      const wrap = document.createElement("div");
      wrap.className = "barcode-wrap";

      const canvas = document.createElement("canvas");
      wrap.appendChild(canvas);
      card.appendChild(wrap);
      grid.appendChild(card);

      try {
        if (typeof JsBarcode === "undefined") {
          throw new Error(
            "JsBarcode nie załadował się — otwórz stronę przez serwer Vite (np. /barcodes_skaner_test.html) " +
            "albo plik barcodes_skaner_test.html z katalogu głównego projektu (obok folderu scripts/)."
          );
        }
        const fmt = jsBarcodeFormat(item.format);
        JsBarcode(canvas, item.value, {
          format: fmt,
          width: fmt === "EAN13" ? 1.8 : 2,
          height: 72,
          displayValue: true,
          margin: 10,
          background: "#ffffff",
        });
      } catch (e) {
        val.textContent =
          item.value + " (błąd: " + (e && e.message ? e.message : String(e)) + ")";
        console.warn(e);
      }
    });
  </script>
</body>
</html>
"""

HINT_COMBINED = """<strong>Wskazówka:</strong> Skaner zwraca ten sam ciąg znaków, który widzisz pod kodem.
    Jeśli EAN w bazie ma złą sumę kontrolną, wygenerowano Code 128 zamiast EAN-13.
    Pełny zestaw (produkty, lokalizacje, dokumenty) — osobno: <code>barcodes_produkty_stan.html</code> i <code>barcodes_lokalizacje.html</code>."""

HINT_PRODUCTS_STOCK = """<strong>Produkty na stanie:</strong> Lista pochodzi z zapytań SQL z JOIN do tabeli <code>stock</code> (tylko towar faktycznie zapisany w magazynie).
    Skanuj SKU lub EAN tak jak w aplikacji. Przy pustej liście wykonaj przyjęcie (PZ) albo seed bazy."""

HINT_LOCATIONS = """<strong>Lokalizacje:</strong> Kody aktywnych lokalizacji z bazy — Code 128, ten sam format co przy skanie miejsca w zadaniach."""


def fill_html_page(
    *,
    items: list[dict[str, str]],
    html_title: str,
    h1: str,
    generated_at: str,
    source_note: str,
    hint_body: str,
    js_src: str,
) -> str:
    browse = " · Otwórz w przeglądarce, powiększ lub wydrukuj."
    src = f" · Źródło danych: {source_note}" if source_note else ""
    page = HTML_TEMPLATE.replace("__HTML_TITLE__", html.escape(html_title))
    page = page.replace("__H1__", html.escape(h1))
    page = page.replace("__GENERATED_AT__", html.escape(generated_at))
    page = page.replace("__SOURCE_LINE__", html.escape(browse + src))
    page = page.replace("__HINT_BODY__", hint_body)
    page = page.replace("__ITEMS_JSON__", json.dumps(items, ensure_ascii=False))
    page = page.replace("__JSBARCODE_SRC__", js_src)
    return page


def main() -> int:
    parser = argparse.ArgumentParser(description="Generuj HTML z kodami kreskowymi z bazy WMS.")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=DEFAULT_OUT,
        help=f"Plik wyjściowy (domyślnie {DEFAULT_OUT})",
    )
    parser.add_argument("--host", help="Nadpisanie hosta MySQL")
    parser.add_argument("--port", type=int, help="Nadpisanie portu MySQL")
    parser.add_argument("--user", help="Nadpisanie użytkownika MySQL")
    parser.add_argument("--password", help="Nadpisanie hasła MySQL")
    parser.add_argument("--database", help="Nadpisanie nazwy bazy")
    args = parser.parse_args()

    products_all: list[tuple[str, str | None]] = []
    products_on_stock: list[tuple[str, str | None]] = []
    locations: list[str] = []
    doc_numbers: list[str] = []
    source = "baza danych MySQL"
    source_stock = "baza danych MySQL (produkty z tabelą stock)"
    from_mysql = False

    raw_url = load_database_url(BACKEND_ENV)
    cfg: dict[str, str | int] | None = None
    if raw_url:
        try:
            cfg = parse_database_url(raw_url)
        except ValueError as e:
            print(f"Ostrzeżenie: {e}", file=sys.stderr)

    cli_mysql = any(
        [
            args.host is not None,
            args.port is not None,
            args.user is not None,
            args.password is not None,
            args.database is not None,
        ]
    )
    if cfg is None and cli_mysql:
        cfg = {
            "user": "root",
            "password": "password",
            "host": "127.0.0.1",
            "port": 3307,
            "database": "wms_db",
        }

    if cfg is not None:
        if args.host is not None:
            cfg["host"] = args.host
        if args.port is not None:
            cfg["port"] = args.port
        if args.user is not None:
            cfg["user"] = args.user
        if args.password is not None:
            cfg["password"] = args.password
        if args.database is not None:
            cfg["database"] = args.database

    if cfg is not None:
        try:
            products_all, products_on_stock, locations, doc_numbers = fetch_from_mysql(cfg)
            from_mysql = True
        except Exception as e:
            print(f"Nie udało się połączyć z bazą ({e}). Używam kodów demo.", file=sys.stderr)
            products_all = FALLBACK_PRODUCTS
            products_on_stock = FALLBACK_PRODUCTS
            locations = FALLBACK_LOCATIONS
            doc_numbers = []
            source = "fallback (seed demo — uruchom MySQL i spróbuj ponownie)"
            source_stock = source

    if not products_all and not locations:
        products_all = FALLBACK_PRODUCTS
        products_on_stock = FALLBACK_PRODUCTS
        locations = FALLBACK_LOCATIONS
        source = "fallback (brak rekordów lub błąd — seed demo)"
        source_stock = source

    items = build_items(products_all, locations, doc_numbers)
    if not items:
        items = build_items(FALLBACK_PRODUCTS, FALLBACK_LOCATIONS, [])

    stock_items = build_product_stock_items(products_on_stock)
    if not stock_items:
        if from_mysql:
            source_stock = f"{source_stock} — brak produktów z rekordem w tabeli stock (lista pusta)"
        else:
            stock_items = build_product_stock_items(FALLBACK_PRODUCTS)
            source_stock = source

    loc_items = build_location_items_only(locations)
    if not loc_items:
        loc_items = build_location_items_only(FALLBACK_LOCATIONS)

    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    root_src = "scripts/vendor/JsBarcode.all.min.js"
    base_html = fill_html_page(
        items=items,
        html_title="Kody kreskowe — test skanera WMS",
        h1="Kody z bazy — test skanera (Flutter / aparat)",
        generated_at=generated,
        source_note=source,
        hint_body=HINT_COMBINED,
        js_src=root_src,
    )
    html_products = fill_html_page(
        items=stock_items,
        html_title="WMS — kody produktów na stanie",
        h1="Produkty na stanie (SKU / EAN)",
        generated_at=generated,
        source_note=source_stock,
        hint_body=HINT_PRODUCTS_STOCK,
        js_src=root_src,
    )
    html_locations = fill_html_page(
        items=loc_items,
        html_title="WMS — kody lokalizacji",
        h1="Lokalizacje magazynowe",
        generated_at=generated,
        source_note=source,
        hint_body=HINT_LOCATIONS,
        js_src=root_src,
    )

    if not JSBARCODE_VENDOR.is_file():
        print(
            f"Brak {JSBARCODE_VENDOR} — uruchom: "
            "curl -fsSL https://unpkg.com/jsbarcode@3.11.5/dist/JsBarcode.all.min.js "
            f"-o {JSBARCODE_VENDOR}",
            file=sys.stderr,
        )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(base_html, encoding="utf-8")

    out_products = ROOT / "barcodes_produkty_stan.html"
    out_locs = ROOT / "barcodes_lokalizacje.html"
    out_products.write_text(html_products, encoding="utf-8")
    out_locs.write_text(html_locations, encoding="utf-8")

    public_root = ROOT / "frontend" / "public"
    if public_root.is_dir() and JSBARCODE_VENDOR.is_file():
        FRONTEND_PUBLIC_VENDOR.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(JSBARCODE_VENDOR, FRONTEND_PUBLIC_VENDOR)
        pub_js = "/vendor/JsBarcode.all.min.js"
        (public_root / "barcodes_skaner_test.html").write_text(
            base_html.replace(root_src, pub_js), encoding="utf-8"
        )
        (public_root / "barcodes_produkty_stan.html").write_text(
            html_products.replace(root_src, pub_js), encoding="utf-8"
        )
        (public_root / "barcodes_lokalizacje.html").write_text(
            html_locations.replace(root_src, pub_js), encoding="utf-8"
        )

    print(f"Zapisano: {args.output} ({len(items)} kodów, źródło: {source})")
    print(f"Zapisano: {out_products} ({len(stock_items)} kodów)")
    print(f"Zapisano: {out_locs} ({len(loc_items)} kodów)")
    if public_root.is_dir():
        print(f"Kopie pod Vite: {public_root / 'barcodes_skaner_test.html'}, barcodes_produkty_stan.html, barcodes_lokalizacje.html")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
