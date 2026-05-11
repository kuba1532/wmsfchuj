# WMS Worker (Flutter)

Lekka aplikacja dla magazyniera: **zadania** (`/api/v1/tasks`) oraz **przyjęcie PZ** z **skanowaniem kodu** (EAN/SKU → wyszukanie produktu → pozycje dokumentu).

## Wymagania

- Flutter SDK (stable)
- Działający backend WMS pod znanym adresem IP/portem

## Konfiguracja API

Domyślnie: `http://127.0.0.1:8000`.

- **Android Emulator** — host to `10.0.2.2`:

```bash
flutter run --dart-define=WMS_API_BASE=http://10.0.2.2:8000
```

- **iOS Simulator** — zwykle wystarczy localhost:

```bash
flutter run --dart-define=WMS_API_BASE=http://127.0.0.1:8000
```

- **Telefon w tej samej sieci Wi‑Fi** — ustaw IP komputera z backendem, np.:

```bash
flutter run --dart-define=WMS_API_BASE=http://192.168.1.10:8000
```

Backend musi akceptować połączenia z tej sieci (firewall, `host` w Dockerze).

## Logowanie

Kod logowania: **5 cyfr** (pole `login` w API), hasło jak w systemie WWW.

Rola **WORKER** powinna mieć: `tasks` → wykonanie, `documents` → operacyjnie (tworzenie PZ), `dictionaries` → odczyt (wyszukiwanie produktów).

### Demo (świeża baza, seed w backendzie)

| Konto        | Kod  | Hasło (domyślnie) |
|-------------|------|-------------------|
| Magazynier  | `00002` | `Demo1234` (lub `DEMO_WORKER_PASSWORD` w `.env` backendu) |
| Administrator | `00001` | jak w `ADMIN_PASSWORD` w `.env` |

Szczegóły: plik **[DEMO.md](../DEMO.md)** w katalogu głównym repozytorium.

## Funkcje

| Ekran | API |
|--------|-----|
| Zadania | `GET /tasks`, `POST /tasks/{id}/start`, `POST /tasks/{id}/complete` |
| Przyjęcie PZ | `GET /products?search=`, `POST /documents/pz`, `GET /documents?doc_type=PZ` |
| Sesja | `POST /auth/login`, `GET /auth/me` |

Skaner używa `mobile_scanner` (kamera).

## Analiza

```bash
cd wms_worker && dart analyze lib
```

## Zrzuty ekranu + prezentacja przepływu (macOS)

Automatyczny test przechodzi **pełny proces operacyjny**: logowanie (00002), lista zadań, **nowe PZ** (dostawca Northwind, „skan” **PRD-1001**, ilość, odłożenie **STO-01**, utworzenie dokumentu, **Zarejestruj**), potem **zadanie odłożenia**: „Biorę zadanie” → **Potwierdź** z kodem **STO-01** → podgląd zakończonych. PNG trafiają do `build/integration_screenshots/` (`wms_ops_*.png`).

Wymagania: działający backend na `http://127.0.0.1:8000`, profil **Debug** macOS (sandbox wyłączony tylko w debug — umożliwia zapis plików z testu; dodane `network.client` w Release).

```bash
cd wms_worker
flutter test integration_test/wms_flow_golden_test.dart -d macos
```

Z repo głównego — skrypt + PPTX:

```bash
./scripts/run_flutter_flow_screenshots.sh
python3 scripts/build_flutter_flow_pptx.py
```

Wynik: `prezentacja_demo/WMS_Flutter_przeplyw_mobilka.pptx` (układ pod obronę: okładka, agenda, cel, architektura, scenariusz, 15 slajdów z dużym ekranem, podsumowanie; notatki dla mówcy). Po zmianie kodu UI warto ponownie wygenerować PNG (`pixelRatio` zrzutu: 3).
