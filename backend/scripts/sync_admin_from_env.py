"""Jednorazowo: zsynchronizuj konto admina (email z .env) z ADMIN_PASSWORD z .env.
Użyteczne gdy zmienisz hasło w .env, a użytkownik już istnieje w bazie (seed tego nie nadpisuje)."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.database import SessionLocal
from app.models.models import User


def main() -> None:
    settings = get_settings()
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if not u:
            print(f"Brak użytkownika {settings.ADMIN_EMAIL} — uruchom backend (seed_admin).")
            sys.exit(1)
        u.password_hash = hash_password(settings.ADMIN_PASSWORD)
        u.is_active = True
        u.must_set_password = False
        u.failed_login_attempts = 0
        u.locked_until = None
        db.commit()
        print(f"OK: admin zsynchronizowany — login_code={u.login_code}, email={u.email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
