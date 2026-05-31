"""Tworzy konta MANAGER i FOREMAN do testów E2E (aktywne, z gotowym hasłem).

Uruchom z katalogu backend, z ustawionym DATABASE_URL na lokalną bazę:
    DATABASE_URL=mysql+mysqldb://root@127.0.0.1:3306/wms_db \
        .venv/bin/python ../scripts/seed_roles_e2e.py
"""
from app.db.database import SessionLocal
from app.models.models import User, RoleEnum
from app.core.security import hash_password

ACCOUNTS = [
    {
        "login_code": "00003",
        "email": "kierownik@wms.pl",
        "password": "Demo1234",
        "first_name": "Krystyna",
        "last_name": "Kierownik",
        "role": RoleEnum.MANAGER,
    },
    {
        "login_code": "00004",
        "email": "brygadzista@wms.pl",
        "password": "Demo1234",
        "first_name": "Bartosz",
        "last_name": "Brygadzista",
        "role": RoleEnum.FOREMAN,
    },
]


def main() -> None:
    db = SessionLocal()
    try:
        existing = {c for (c,) in db.query(User.login_code).all()}
        existing_emails = {e for (e,) in db.query(User.email).all()}
        for acc in ACCOUNTS:
            if acc["login_code"] in existing or acc["email"] in existing_emails:
                print(f"[=] {acc['role'].value} ({acc['login_code']}) juz istnieje — pomijam")
                continue
            u = User(
                login_code=acc["login_code"],
                email=acc["email"],
                password_hash=hash_password(acc["password"]),
                first_name=acc["first_name"],
                last_name=acc["last_name"],
                role=acc["role"],
                is_active=True,
                must_set_password=False,
            )
            db.add(u)
            db.commit()
            print(f"[+] Utworzono {acc['role'].value}: login={acc['login_code']} haslo={acc['password']}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
