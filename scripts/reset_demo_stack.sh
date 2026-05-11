#!/usr/bin/env bash
# Reset środowiska demo przed pokazem „świeżego” flow (backend z seedem, bez starej historii).
# Użycie: z katalogu głównego repo:  bash scripts/reset_demo_stack.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== 1. Backend (Docker Compose + czysta baza MySQL) ==="
if command -v docker >/dev/null 2>&1; then
  cd "$ROOT/backend"
  docker compose down -v
  docker compose up -d --build
  echo "Czekam na health backendu (do ~90 s)..."
  for i in $(seq 1 30); do
    if curl -sf "http://127.0.0.1:8000/api/health" >/dev/null; then
      echo "OK: http://127.0.0.1:8000/api/health"
      break
    fi
    sleep 3
  done
else
  echo "Docker nie jest w PATH — pomiń lub uruchom ręcznie:"
  echo "  cd backend && docker compose down -v && docker compose up -d --build"
  echo "Albo (bez Dockera) usuń/zresetuj bazę MySQL i uruchom ponownie uvicorn + migracje."
fi

echo ""
echo "=== 2. Frontend (cache Vite; sesja w przeglądarce) ==="
rm -rf "$ROOT/frontend/node_modules/.vite" 2>/dev/null || true
echo "Usunięto frontend/node_modules/.vite (opcjonalnie w przeglądarce: wyloguj / wyczyść localStorage dla localhost)."

echo ""
echo "=== 3. Flutter (build cache; sesja w aplikacji) ==="
if command -v flutter >/dev/null 2>&1; then
  (cd "$ROOT/wms_worker" && flutter clean)
else
  echo "Flutter nie w PATH — pominięto flutter clean."
fi
echo "Sesja mobilki: odinstaluj aplikację z symulatora/telefonu LUB usuń dane aplikacji,"
echo "albo uruchom build od zera — token jest w SharedPreferences (klucze wms_*)."

echo ""
echo "Gotowe. Kolejność kroków pokazu: DEMO.md → sekcja „Pokaz — kolejność kroków”."
