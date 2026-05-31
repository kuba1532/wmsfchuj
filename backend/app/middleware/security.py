"""Middleware bezpieczeństwa: nagłówki ochronne + prosty limiter żądań.

Celowo bez dodatkowych zależności (działa na czystym Starlette/FastAPI),
żeby nie zwiększać powierzchni ataku ani listy bibliotek do audytu.
"""
from __future__ import annotations

import time
from collections import defaultdict, deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Dodaje standardowe nagłówki bezpieczeństwa do każdej odpowiedzi.

    Zakres pokrywa kontrolki sprawdzane przez darmowe skanery
    (securityheaders.com, Mozilla Observatory).
    """

    def __init__(self, app, *, hsts_enabled: bool = False, hsts_max_age: int = 31536000):
        super().__init__(app)
        self._hsts_enabled = hsts_enabled
        self._hsts_max_age = hsts_max_age

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault(
            "Permissions-Policy",
            "geolocation=(), microphone=(), camera=(), payment=()",
        )
        # Nowoczesne przeglądarki: wyłączamy stary, problematyczny filtr XSS
        response.headers.setdefault("X-XSS-Protection", "0")
        # Brak cache dla odpowiedzi API z danymi (ochrona przed wyciekiem z cache)
        response.headers.setdefault("Cache-Control", "no-store")

        path = request.url.path
        # CSP dla JSON API; pomijamy interaktywne /api/docs (Swagger ładuje skrypty z CDN)
        if not path.startswith("/api/docs") and not path.startswith("/api/redoc"):
            response.headers.setdefault(
                "Content-Security-Policy",
                "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
            )

        if self._hsts_enabled:
            response.headers.setdefault(
                "Strict-Transport-Security",
                f"max-age={self._hsts_max_age}; includeSubDomains",
            )

        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Bardzo prosty limiter (sliding window) na IP — ochrona przed bruteforce/floodem.

    Działa w pamięci procesu (wystarczające dla pojedynczej instancji / demo).
    Dla wielu workerów użyj limitera współdzielonego (np. Redis).
    """

    def __init__(self, app, *, limit_per_minute: int = 0):
        super().__init__(app)
        self._limit = limit_per_minute
        self._window = 60.0
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        if self._limit <= 0:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.monotonic()
        bucket = self._hits[client_ip]

        while bucket and (now - bucket[0]) > self._window:
            bucket.popleft()

        if len(bucket) >= self._limit:
            retry_after = max(1, int(self._window - (now - bucket[0])))
            return JSONResponse(
                status_code=429,
                content={"detail": "Zbyt wiele żądań. Spróbuj ponownie za chwilę."},
                headers={"Retry-After": str(retry_after)},
            )

        bucket.append(now)
        return await call_next(request)
