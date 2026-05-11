#!/usr/bin/env bash
# Uruchamia test integracyjny Flutter (macOS) generujący PNG w build/integration_screenshots/
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/wms_worker"
echo "Backend: upewnij się że działa http://127.0.0.1:8000 (konto 00002 / Demo1234)"
flutter test integration_test/wms_flow_golden_test.dart -d macos
echo "Zrzuty: $ROOT/wms_worker/build/integration_screenshots/"
echo "PPTX:  python3 $ROOT/scripts/build_flutter_flow_pptx.py"
