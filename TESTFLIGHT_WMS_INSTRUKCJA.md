# TestFlight dla WMS Worker — krok po kroku

## 1. Wymagania

- Konto Apple Developer (aktywny abonament)
- Mac + Xcode (zalecane najnowsze stabilne)
- Bundle ID aplikacji (np. `pl.wms.worker`)
- Flutter i CocoaPods skonfigurowane lokalnie

## 2. Konfiguracja projektu iOS

1. Otwórz `wms_worker/ios/Runner.xcworkspace` w Xcode.
2. W `Signing & Capabilities`:
   - ustaw Team,
   - ustaw unikalny Bundle Identifier,
   - włącz automatyczne signing.
3. Ustaw numer wersji i build:
   - `Version` (np. `1.0.0`)
   - `Build` (np. `10`, rośnie przy każdym uploadzie).

## 3. Build Flutter iOS

W katalogu `wms_worker`:

```bash
flutter clean
flutter pub get
flutter build ios --release --dart-define=WMS_API_BASE=https://twoj-backend/api-base
```

> Dla iOS produkcyjnego używaj HTTPS i publicznego adresu API.

## 4. Upload do App Store Connect

Opcja A (z Xcode):
1. Product -> Archive
2. Organizer -> Distribute App
3. App Store Connect -> Upload

Opcja B (Transporter):
1. Wygeneruj `.ipa`
2. Wyślij przez aplikację Transporter.

## 5. Konfiguracja TestFlight

1. W App Store Connect utwórz aplikację i przypisz build.
2. Uzupełnij metadata builda (co testować, znane ograniczenia).
3. Dodaj testerów:
   - **Internal Testing** (zespół) — szybciej, bez review
   - **External Testing** (promotor/demo) — wymaga review Apple
4. Ustaw datę wygaśnięcia i notatki dla testerów.

## 6. Checklista jakości przed wysyłką

- [ ] Logowanie działa
- [ ] Lista zadań i dokumenty ładują się z API
- [ ] Skaner działa na urządzeniu fizycznym
- [ ] Sesja jest utrzymywana po restarcie aplikacji
- [ ] Błędy sieci pokazują czytelne komunikaty

## 7. Najczęstsze problemy

- **Build odrzucony**: brak wymaganych opisów uprawnień (kamera itp.)
- **Brak instalacji na urządzeniu**: niezgodny provisioning/profile
- **Aplikacja nie łączy się z API**: zły `WMS_API_BASE`, brak HTTPS lub blokada sieci

## 8. Dobra praktyka na demo

- Miej 2 buildy:
  - `demo-stable` (pokaz)
  - `beta-dev` (testy zespołu)
- Przed prezentacją zrób dry-run na tym samym Wi‑Fi i tym samym backendzie.
