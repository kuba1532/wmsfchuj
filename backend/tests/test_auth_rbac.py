"""Testy uwierzytelniania i RBAC (egzekwowanie ról po stronie serwera, N-03)."""

import app.models.models as m


def test_login_success_returns_token(make_user, client):
    make_user("00001", m.RoleEnum.ADMIN, "Haslo123")
    r = client.post("/api/v1/auth/login", json={"login": "00001", "password": "Haslo123"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["user"]["role"] == "ADMIN"


def test_login_wrong_password_is_generic_401(make_user, client):
    make_user("00001", m.RoleEnum.ADMIN, "Haslo123")
    r = client.post("/api/v1/auth/login", json={"login": "00001", "password": "zleHaslo9"})
    assert r.status_code == 401
    # Komunikat generyczny — nie ujawnia czy konto istnieje
    assert "Nieprawidlowy" in r.json()["detail"]


def test_login_unknown_user_401(client):
    r = client.post("/api/v1/auth/login", json={"login": "99999", "password": "Haslo123"})
    assert r.status_code == 401


def test_account_locks_after_max_attempts(make_user, client):
    make_user("00001", m.RoleEnum.ADMIN, "Haslo123")
    for _ in range(5):
        client.post("/api/v1/auth/login", json={"login": "00001", "password": "bledne12"})
    # Po przekroczeniu limitu nawet poprawne hasło daje 401 (konto zablokowane czasowo)
    r = client.post("/api/v1/auth/login", json={"login": "00001", "password": "Haslo123"})
    assert r.status_code == 401


def test_worker_cannot_list_users_403(make_user, client, auth_header):
    make_user("00002", m.RoleEnum.WORKER, "Haslo123")
    r = client.get("/api/v1/users", headers=auth_header("00002"))
    assert r.status_code == 403


def test_worker_cannot_access_inventory_403(make_user, client, auth_header):
    make_user("00002", m.RoleEnum.WORKER, "Haslo123")
    r = client.get("/api/v1/inventory", headers=auth_header("00002"))
    assert r.status_code == 403


def test_no_token_is_rejected(client):
    # HTTPBearer bez nagłówka Authorization → 403 (brak poświadczeń)
    r = client.get("/api/v1/users")
    assert r.status_code == 403


def test_invalid_token_is_rejected(client):
    r = client.get("/api/v1/users", headers={"Authorization": "Bearer not-a-valid-token"})
    assert r.status_code == 401


def test_admin_can_list_users_200(make_user, client, auth_header):
    make_user("00001", m.RoleEnum.ADMIN, "Haslo123")
    r = client.get("/api/v1/users", headers=auth_header("00001"))
    assert r.status_code == 200
    assert "items" in r.json()


def test_foreman_can_access_inventory_200(make_user, client, auth_header):
    # FOREMAN ma poziom OPERATIONAL dla inventory → dostęp
    make_user("00003", m.RoleEnum.FOREMAN, "Haslo123")
    r = client.get("/api/v1/inventory", headers=auth_header("00003"))
    assert r.status_code == 200
