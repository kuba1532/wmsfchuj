"""
Katalog demo (czytelne nazwy) + siatka stanów: każdy produkt × każda lokalizacja.

Uruchamiane przy starcie aplikacji gdy SEED_DEMO_TASKS=true (po seed_demo_tasks).
Powtarzalne „losowe” ilości: random.Random(42).
"""

from __future__ import annotations

import logging
import random
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.models import Location, LocationTypeEnum, Product, Stock, StockStatusEnum

logger = logging.getLogger(__name__)

# SKU zgodne z generatorami kodów kreskowych (barcodes_produkty_stan.html).
DEMO_PRODUCTS: list[dict[str, str]] = [
    {
        "sku": "PRD-0001",
        "name": "Gwizdek alarmowy 120 dB — obudowa żółta",
        "ean12": "590000100001",
    },
    {
        "sku": "PRD-0002",
        "name": "Pasta termoprzewodząca — tubka 3 g, srebrna",
        "ean12": "590000100002",
    },
    {
        "sku": "PRD-1001",
        "name": "Karton wysyłkowy — 400×300×250 mm, 5-warstwowy",
        "ean12": "590000100003",
    },
    {
        "sku": "PRD-1002",
        "name": "Folia bąbelkowa — rolka 50 cm × 10 m",
        "ean12": "590000100004",
    },
]

# Kody jak w barcodes_lokalizacje.html; typy sensowne pod MM / PZ.
DEMO_LOCATIONS: list[tuple[str, LocationTypeEnum]] = [
    ("BUF-01", LocationTypeEnum.BUFFER),
    ("STO-01", LocationTypeEnum.STORAGE),
    ("PICK-01", LocationTypeEnum.PICKING_ZONE),
    ("REC-01", LocationTypeEnum.BUFFER),
    ("STO-A-01", LocationTypeEnum.STORAGE),
    ("PICK-A-01", LocationTypeEnum.PICKING_ZONE),
]


def _ean13_from_12(n12: str) -> str:
    if len(n12) != 12 or not n12.isdigit():
        raise ValueError("Wymagane 12 cyfr podstawy EAN-13")
    digits = [int(c) for c in n12]
    total = sum(d * (3 if i % 2 else 1) for i, d in enumerate(digits))
    check = (10 - (total % 10)) % 10
    return n12 + str(check)


def seed_presentation_inventory(db: Session) -> None:
    rng = random.Random(42)

    loc_by_code: dict[str, Location] = {}
    for code, loc_type in DEMO_LOCATIONS:
        loc = db.query(Location).filter(Location.code == code).first()
        if not loc:
            loc = Location(code=code, type=loc_type, is_active=True)
            db.add(loc)
            db.flush()
            logger.info("Prezentacja: dodano lokalizację %s (%s).", code, loc_type.value)
        elif loc.type != loc_type:
            loc.type = loc_type
        loc_by_code[code] = loc

    products: list[Product] = []
    for spec in DEMO_PRODUCTS:
        sku = spec["sku"]
        ean = _ean13_from_12(spec["ean12"])
        p = db.query(Product).filter(Product.sku == sku).first()
        if not p:
            p = Product(sku=sku, name=spec["name"], ean=ean, unit="szt", is_active=True)
            db.add(p)
            db.flush()
            logger.info("Prezentacja: dodano produkt %s.", sku)
        else:
            p.name = spec["name"]
            p.ean = ean
            p.is_active = True
        products.append(p)

    for p in products:
        for loc in loc_by_code.values():
            qty_val = Decimal(str(rng.randint(18, 220)))
            row = (
                db.query(Stock)
                .filter(
                    Stock.product_id == p.id,
                    Stock.location_id == loc.id,
                    Stock.status == StockStatusEnum.AVAILABLE,
                )
                .first()
            )
            if row:
                row.quantity = qty_val
            else:
                db.add(
                    Stock(
                        product_id=p.id,
                        location_id=loc.id,
                        quantity=qty_val,
                        status=StockStatusEnum.AVAILABLE,
                    )
                )

    db.commit()
    logger.info(
        "Prezentacja: zaktualizowano katalog (4 produkty) i stany %s × %s lokalizacji.",
        len(products),
        len(loc_by_code),
    )


def run_presentation_seed_if_enabled(settings) -> None:
    if not getattr(settings, "SEED_DEMO_TASKS", False):
        return
    from app.db.database import SessionLocal

    db = SessionLocal()
    try:
        seed_presentation_inventory(db)
    except Exception:
        db.rollback()
        logger.exception("Blad seedu prezentacyjnego (katalog + stany).")
        raise
    finally:
        db.close()
