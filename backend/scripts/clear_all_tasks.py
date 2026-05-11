"""Usuwa wszystkie zadania (tasks) — lista w aplikacji mobilnej / panelu będzie pusta.

Uwaga: dokumenty PZ/MM/RW mogą pozostać w statusie „W trakcie”, jeśli były
powiązane z niedokończonymi zadaniami — to nie cofa ruchów magazynowych ani stocku.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text

from app.db.database import SessionLocal


def main() -> None:
    db = SessionLocal()
    try:
        n = db.execute(text("SELECT COUNT(*) FROM tasks")).scalar() or 0
        db.execute(text("DELETE FROM tasks"))
        db.commit()
        print(f"OK: usunięto {n} zadań. Tabela tasks jest pusta.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
