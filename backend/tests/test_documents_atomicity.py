"""Testy atomowości operacji magazynowych (N-06): PZ → RW.

Sprawdzamy, że niepowodzenie w środku operacji (np. brak stanu na jedną z
pozycji RW) NIE pozostawia częściowych zmian — stan i rejestr ruchów pozostają
spójne (transakcja jest wycofywana w całości).
"""

import app.models.models as m


def test_pz_then_rw_happy_path(seed_warehouse, client, auth_header, stock_qty, ledger_count):
    w = seed_warehouse
    h = auth_header_admin(client, auth_header)

    # PZ: przyjęcie 10 szt p1 i 5 szt p2 na lokalizację STORAGE
    r = client.post(
        "/api/v1/documents/pz",
        json={
            "supplier_id": w.supplier_id,
            "to_location_id": w.location_id,
            "items": [
                {"product_id": w.product1_id, "quantity": 10},
                {"product_id": w.product2_id, "quantity": 5},
            ],
        },
        headers=h,
    )
    assert r.status_code == 201, r.text
    pz_id = r.json()["id"]

    r = client.post(f"/api/v1/documents/{pz_id}/pz/complete", headers=h)
    assert r.status_code == 200, r.text

    assert stock_qty(w.product1_id, w.location_id) == 10
    assert stock_qty(w.product2_id, w.location_id) == 5
    assert ledger_count(m.MovementTypeEnum.RECEIPT) == 2

    # RW: wydanie 4 szt p1 z tej lokalizacji
    r = client.post(
        "/api/v1/documents/rw",
        json={
            "from_location_id": w.location_id,
            "recipient": "Odbiorca testowy",
            "items": [{"product_id": w.product1_id, "quantity": 4}],
        },
        headers=h,
    )
    assert r.status_code == 201, r.text
    rw_id = r.json()["id"]

    r = client.post(f"/api/v1/documents/{rw_id}/confirm", headers=h)
    assert r.status_code == 200, r.text

    assert stock_qty(w.product1_id, w.location_id) == 6
    assert ledger_count(m.MovementTypeEnum.PICK) == 1


def test_rw_insufficient_stock_is_atomic(seed_warehouse, client, auth_header, stock_qty, ledger_count):
    """RW z dwiema pozycjami: pierwsza wystarczy, druga nie — całość ma się wycofać."""
    w = seed_warehouse
    h = auth_header_admin(client, auth_header)

    # Najpierw PZ, by mieć stan: 6 szt p1, 1 szt p2
    r = client.post(
        "/api/v1/documents/pz",
        json={
            "supplier_id": w.supplier_id,
            "to_location_id": w.location_id,
            "items": [
                {"product_id": w.product1_id, "quantity": 6},
                {"product_id": w.product2_id, "quantity": 1},
            ],
        },
        headers=h,
    )
    assert r.status_code == 201, r.text
    client.post(f"/api/v1/documents/{r.json()['id']}/pz/complete", headers=h)

    assert stock_qty(w.product1_id, w.location_id) == 6
    assert stock_qty(w.product2_id, w.location_id) == 1
    pick_before = ledger_count(m.MovementTypeEnum.PICK)

    # RW: p1=2 (OK), p2=999 (za mało) → operacja musi się wycofać w całości
    r = client.post(
        "/api/v1/documents/rw",
        json={
            "from_location_id": w.location_id,
            "recipient": "Odbiorca testowy",
            "items": [
                {"product_id": w.product1_id, "quantity": 2},
                {"product_id": w.product2_id, "quantity": 999},
            ],
        },
        headers=h,
    )
    assert r.status_code == 201, r.text
    rw_id = r.json()["id"]

    r = client.post(f"/api/v1/documents/{rw_id}/confirm", headers=h)
    assert r.status_code == 400, r.text

    # Atomowość: stan p1 NIE został pomniejszony (brak częściowego wydania)
    assert stock_qty(w.product1_id, w.location_id) == 6
    assert stock_qty(w.product2_id, w.location_id) == 1
    # Żaden nowy ruch PICK nie został zapisany
    assert ledger_count(m.MovementTypeEnum.PICK) == pick_before


def auth_header_admin(client, auth_header):
    """Tworzy admina (jeśli trzeba) i zwraca nagłówek autoryzacji.

    Konto admina tworzymy bez fixtury make_user, by ten plik był samowystarczalny
    przy seedowaniu magazynu.
    """
    from tests.conftest import TestingSessionLocal
    from app.core.security import hash_password

    s = TestingSessionLocal()
    try:
        if not s.query(m.User).filter(m.User.login_code == "00001").first():
            s.add(
                m.User(
                    login_code="00001",
                    email="admin@test.pl",
                    password_hash=hash_password("Haslo123"),
                    first_name="Admin",
                    last_name="Test",
                    role=m.RoleEnum.ADMIN,
                )
            )
            s.commit()
    finally:
        s.close()
    return auth_header("00001", "Haslo123")
