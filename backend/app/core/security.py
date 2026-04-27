import secrets
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext


pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


# ─────────────────────────────
# PASSWORD
# ─────────────────────────────

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# ─────────────────────────────
# JWT TOKENS
# ─────────────────────────────

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    from app.core.config import get_settings
    settings = get_settings()

    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta
        else timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})

    return jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_refresh_token(data: dict) -> str:
    from app.core.config import get_settings
    settings = get_settings()

    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
    )
    to_encode.update({"exp": expire, "type": "refresh"})

    return jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_token(token: str) -> Optional[dict]:
    from app.core.config import get_settings
    settings = get_settings()

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError:
        return None


# ─────────────────────────────
# PASSWORD POLICY
# ─────────────────────────────

def validate_password_policy(password: str) -> tuple[bool, str]:
    if len(password) < 8:
        return False, "Haslo musi miec co najmniej 8 znakow."
    if not any(c.isalpha() for c in password):
        return False, "Haslo musi zawierac co najmniej jedna litere."
    if not any(c.isdigit() for c in password):
        return False, "Haslo musi zawierac co najmniej jedna cyfre."
    return True, ""


# ─────────────────────────────
# LOGIN CODE GENERATOR
# ─────────────────────────────

def generate_login_code(existing_codes: set[str]) -> str:
    while True:
        code = f"{secrets.randbelow(100000):05d}"
        if code not in existing_codes:
            return code


def hash_setup_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_setup_token(token: str, token_hash: str) -> bool:
    return hmac.compare_digest(hash_setup_token(token), token_hash)