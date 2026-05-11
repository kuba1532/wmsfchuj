# Demo WMS — uruchomienie

## Backend (musi nasłuchiwać na `0.0.0.0`, żeby był widoczny z telefonu w Wi‑Fi)

**Opcja A — Docker (MySQL + API)**

```bash
cd backend
# Skopiuj .env: użyj pliku .env.example i ustaw DATABASE_URL pod Docker (poniżej).
docker compose up --build
```

W `.env` dla Compose ustaw m.in.:

- `DATABASE_URL=mysql+mysqldb://root:password@db:3306/wms_db`
- `ADMIN_PASSWORD` — silne hasło (min. 8 znaków, litera + cyfra), nie domyślne z walidatora
- `JWT_SECRET_KEY` — min. 32 znaki (`openssl rand -hex 32`)

**Opcja B — lokalnie (MySQL na hoście)**

```bash
cd backend
# Migracje i seed wykonują się przy starcie aplikacji
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Sprawdzenie: w przeglądarce `http://localhost:8000/api/health` oraz `http://localhost:8000/api/docs`.

---

## Konta po pierwszym uruchomieniu (czysta baza)

| Rola        | Kod logowania (5 cyfr) | Hasło (domyślnie / z `.env`)   |
|------------|-------------------------|--------------------------------|
| Administrator | `00001` (z logów startowych, jeśli inny — patrz konsola) | `ADMIN_PASSWORD` z `.env` |
| Magazynier (demo) | `00002`              | `Demo1234` lub `DEMO_WORKER_PASSWORD` |

Zadania demonstracyjne są przypisywane do **magazyniera** (`magazynier@demo.wms`), żeby na telefonie od razu widać listę zadań dla roli WORKER.

**Jeśli baza była używana wcześniej** i zadania już istniały, seed zadań się nie uruchomi ponownie — magazynier może nie mieć zadań. Na demo: pusta baza (`docker compose down -v` przy Dockerze) albo nowa baza / ręczne przypisanie zadań w panelu.

---

## Frontend web (Vite) z innego urządzenia w sieci

1. Skopiuj `frontend/.env.example` → `frontend/.env.local`.
2. Ustaw adres API (IP komputera z backendem w LAN), np.:

   `VITE_API_URL=http://192.168.0.10:8000/api/v1`

3. Uruchom z nasłuchem na wszystkich interfejsach:

   `npm run dev -- --host 0.0.0.0`

4. Na telefonie / tablecie wejdź w `http://<IP_KOMPUTERA>:5173`.

CORS dla adresów `192.168.x.x` i `10.x.x.x` jest włączony flagą `CORS_ALLOW_LAN` (domyślnie `true` w ustawieniach).

---

## Aplikacja Flutter (`wms_worker`)

```bash
cd wms_worker
flutter run --dart-define=WMS_API_BASE=http://<IP_KOMPUTERA_W_LAN>:8000
```

Na fizycznym iPhonie **nie** używaj `127.0.0.1` — to adres samego telefonu.

Logowanie demo magazyniera: **`00002`** / **`Demo1234`** (o ile nie zmieniono `DEMO_WORKER_PASSWORD`).

---

## Reset przed pokazem („świeży” flow)

Jeden skrypt (Docker + cache Vite + `flutter clean`; **nie usuwa** Dockera jeśli nie masz go w PATH):

```bash
bash scripts/reset_demo_stack.sh
```

- **Backend:** `docker compose down -v` kasuje wolumen MySQL → przy kolejnym `up` baza jest pusta i seed z `main.py` znów utworzy konta (`00001`, `00002`) i dane demo.
- **Frontend:** usuwa cache Vite; w przeglądarce warto **wylogować się** lub wyczyścić `localStorage` dla originu frontu.
- **Mobilka:** po `flutter clean` odinstaluj apkę z urządzenia / usuń dane aplikacji — token JWT jest w `SharedPreferences`.

---

## Pokaz — kolejność kroków (web + mobilka, jeden scenariusz)

**Założenie:** świeża baza po `scripts/reset_demo_stack.sh`, backend `http://127.0.0.1:8000`, konta z `DEMO.md`.

### A. Panel web (np. obrona na projektorze)

1. Uruchom frontend: `cd frontend && npm run dev` (lub `-- --host` z LAN).
2. Zaloguj się adminem (`00001` + hasło z `.env`).
3. Opcjonalnie: **Produkty / Lokalizacje** — pokaż, że słowniki są załadowane (seed).
4. **Przyjęcia PZ:** utwórz PZ (dostawca SUP-001, pozycja, miejsce odłożenia np. STO-01) → **Zarejestruj** — towar na buforze, zadania PUTAWAY.
5. **Zadania** (web): pokaż listę + start/complete albo wyjaśnij, że robi to magazynier na telefonie.
6. **Stany / Ledger** — potwierdzenie ruchu magazynowego (opcjonalnie).

### B. Aplikacja Flutter (magazynier)

1. `cd wms_worker && flutter run -d macos` (lub telefon z `WMS_API_BASE=http://<IP>:8000`).
2. Logowanie **`00002`** / **`Demo1234`**.
3. **Zadania** — filtr „Odłożenie (PZ)”; **Biorę zadanie** → **Potwierdź (skan miejsca)** — wpisz kod regału (np. STO-01).
4. **PZ** — drugi wątek: nowe przyjęcie z **„Skanuj kod”** (SKU) jak w teście integracyjnym (`integration_test/wms_flow_golden_test.dart`).
5. Pełna automatyczna ścieżka zrzutów do PPTX: `flutter test integration_test/wms_flow_golden_test.dart -d macos` → `python3 scripts/build_flutter_flow_pptx.py`.

---

## Typowe problemy

| Problem | Działanie |
|--------|-----------|
| CORS w przeglądarce | Upewnij się, że `VITE_API_URL` wskazuje ten sam host co w pasku adresu (IP, nie `localhost` z telefonu). |
| Biały ekran w Flutterze | Zły `WMS_API_BASE`; wyczyść dane aplikacji lub odinstaluj apkę i zaloguj ponownie. |
| Brak zadań u magazyniera | Baza nie była „świeża”; reset wolumenu DB lub nowe zadania z panelu. |
