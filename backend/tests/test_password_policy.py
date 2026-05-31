"""Testy polityki haseł (N-04): złożoność + wymuszanie zmiany co 180 dni."""

from datetime import datetime, timedelta, timezone

import app.models.models as m
from app.core.security import validate_password_policy, is_password_expired


# ── Złożoność hasła (jednostkowo) ──

def test_policy_rejects_too_short():
    ok, msg = validate_password_policy("Abc1")
    assert ok is False
    assert "8" in msg


def test_policy_rejects_no_digit():
    ok, _ = validate_password_policy("OnlyLetters")
    assert ok is False


def test_policy_rejects_no_letter():
    ok, _ = validate_password_policy("12345678")
    assert ok is False


def test_policy_accepts_valid():
    ok, msg = validate_password_policy("Haslo123")
    assert ok is True
    assert msg == ""


# ── Wygasanie hasła (jednostkowo) ──

def test_expiry_disabled_when_max_age_zero():
    assert is_password_expired(datetime(2000, 1, 1, tzinfo=timezone.utc), 0) is False


def test_expiry_null_set_at_is_not_expired():
    # Konta sprzed wdrożenia polityki nie są blokowane.
    assert is_password_expired(None, 180) is False


def test_expiry_recent_password_not_expired():
    recent = datetime.now(timezone.utc) - timedelta(days=10)
    assert is_password_expired(recent, 180) is False


def test_expiry_old_password_is_expired():
    old = datetime.now(timezone.utc) - timedelta(days=200)
    assert is_password_expired(old, 180) is True


# ── Wygasanie hasła przy logowaniu (integracyjnie) ──

def test_login_blocked_when_password_expired(make_user, client):
    make_user(
        "00010",
        m.RoleEnum.WORKER,
        "Haslo123",
        password_set_at=datetime.now(timezone.utc) - timedelta(days=200),
    )
    r = client.post("/api/v1/auth/login", json={"login": "00010", "password": "Haslo123"})
    assert r.status_code == 403
    assert "PASSWORD_EXPIRED" in r.json()["detail"]


def test_login_ok_when_password_fresh(make_user, client):
    make_user(
        "00011",
        m.RoleEnum.WORKER,
        "Haslo123",
        password_set_at=datetime.now(timezone.utc) - timedelta(days=5),
    )
    r = client.post("/api/v1/auth/login", json={"login": "00011", "password": "Haslo123"})
    assert r.status_code == 200


def test_login_ok_when_set_at_null(make_user, client):
    make_user("00012", m.RoleEnum.WORKER, "Haslo123", password_set_at=None)
    r = client.post("/api/v1/auth/login", json={"login": "00012", "password": "Haslo123"})
    assert r.status_code == 200


def test_rotate_expired_password_then_login(make_user, client):
    make_user(
        "00013",
        m.RoleEnum.WORKER,
        "StareHaslo1",
        password_set_at=datetime.now(timezone.utc) - timedelta(days=200),
    )
    # Logowanie zablokowane (wygasłe)
    assert client.post(
        "/api/v1/auth/login", json={"login": "00013", "password": "StareHaslo1"}
    ).status_code == 403

    # Rotacja wygasłego hasła (bez tokenu, ale ze znajomością starego hasła)
    r = client.post(
        "/api/v1/auth/change-expired-password",
        json={
            "login": "00013",
            "current_password": "StareHaslo1",
            "new_password": "NoweHaslo9",
        },
    )
    assert r.status_code == 200, r.text

    # Nowe hasło → logowanie działa
    assert client.post(
        "/api/v1/auth/login", json={"login": "00013", "password": "NoweHaslo9"}
    ).status_code == 200
    # Stare hasło → odrzucone
    assert client.post(
        "/api/v1/auth/login", json={"login": "00013", "password": "StareHaslo1"}
    ).status_code == 401


def test_rotate_rejects_same_password(make_user, client):
    make_user(
        "00014",
        m.RoleEnum.WORKER,
        "Haslo1234",
        password_set_at=datetime.now(timezone.utc) - timedelta(days=200),
    )
    r = client.post(
        "/api/v1/auth/change-expired-password",
        json={
            "login": "00014",
            "current_password": "Haslo1234",
            "new_password": "Haslo1234",
        },
    )
    assert r.status_code == 400


def test_change_password_enforces_policy_and_difference(make_user, client, auth_header):
    make_user("00015", m.RoleEnum.WORKER, "Haslo123")
    headers = auth_header("00015")

    # Za słabe nowe hasło → 400 (walidacja Pydantic/policy)
    weak = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "Haslo123", "new_password": "short"},
        headers=headers,
    )
    assert weak.status_code in (400, 422)

    # Takie samo jak obecne → 400
    same = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "Haslo123", "new_password": "Haslo123"},
        headers=headers,
    )
    assert same.status_code == 400

    # Poprawna zmiana → 200
    ok = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "Haslo123", "new_password": "NoweHaslo7"},
        headers=headers,
    )
    assert ok.status_code == 200
