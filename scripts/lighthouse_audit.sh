#!/usr/bin/env bash
# Audyt Lighthouse (silnik Google DevTools) z linii poleceń — generuje raporty HTML.
# Wymaga zainstalowanego Node.js + Chrome. Lighthouse pobierze się przez npx.
#
# Użycie:
#   ./scripts/lighthouse_audit.sh                      # domyślnie http://localhost:5173
#   ./scripts/lighthouse_audit.sh http://localhost:5173/login
#
# Wynik: katalog wyniki_lighthouse/ z raportami HTML (otwórz w przeglądarce).

set -euo pipefail

URL="${1:-http://localhost:5173}"
OUT_DIR="wyniki_lighthouse"
STAMP="$(date +%Y%m%d_%H%M%S)"
mkdir -p "$OUT_DIR"

echo "==> Audyt Lighthouse dla: $URL"
echo "==> Kategorie: Performance, Accessibility, Best Practices, SEO"

npx --yes lighthouse "$URL" \
  --output=html \
  --output-path="$OUT_DIR/raport_${STAMP}.html" \
  --chrome-flags="--headless --no-sandbox" \
  --only-categories=performance,accessibility,best-practices,seo \
  --quiet

echo "==> Gotowe. Raport: $OUT_DIR/raport_${STAMP}.html"
echo "    Otwórz w przeglądarce, żeby zobaczyć wyniki i rekomendacje."
