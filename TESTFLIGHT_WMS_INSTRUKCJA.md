# Wdrożenie aplikacji mobilnej WMS Worker — instrukcja krok po kroku

> Dokument opisuje **3 sposoby** dostarczenia aplikacji na telefon testera/promotora:
> 1. **TestFlight** (oficjalny kanał Apple do testów — zalecany do prezentacji)
> 2. **Ad-Hoc** (instalacja bezpośrednia, bez recenzji Apple — szybki backup)
> 3. **Android APK** (najprostszy — wystarczy przesłać plik)
>
> Na końcu jest sekcja **„Jak tester pobiera aplikację"** oraz **wyniki weryfikacji aplikacji Flutter i skanera**.

---

## 0. Realne dane tego projektu (już skonfigurowane)

Wartości odczytane z repozytorium — używaj ich, nie wymyślaj nowych:

| Parametr | Wartość | Gdzie ustawione |
|---|---|---|
| Nazwa wyświetlana | `WMS` | `ios/Runner/Info.plist` → `CFBundleDisplayName` |
| Bundle Identifier (iOS) | `pl.wms.wmsWorker` | `ios/Runner.xcodeproj/project.pbxproj` |
| Apple Developer Team ID | `V5RP52B9UP` | `project.pbxproj` → `DEVELOPMENT_TEAM` |
| Podpisywanie | `Automatic` | `CODE_SIGN_STYLE = Automatic` |
| Wersja / build | `1.0.0+1` | `pubspec.yaml` → `version: 1.0.0+1` |
| Uprawnienie kamery | ustawione | `Info.plist` → `NSCameraUsageDescription` |
| Sieć lokalna (http) | dozwolona | `Info.plist` → `NSAllowsLocalNetworking` |

> Team `V5RP52B9UP` oznacza, że konto Apple Developer jest już podpięte i podpisywanie działa automatycznie — to najtrudniejszy etap, który macie z głowy.

---

## 1. Czym jest TestFlight i jak to działa (w skrócie)

TestFlight to aplikacja Apple, przez którą wysyła się **wersje testowe** aplikacji do nawet 100 testerów wewnętrznych i 10 000 zewnętrznych — **bez publikacji w App Store**.

Przepływ:

```
Mac (Xcode/Flutter)  →  Archive (.ipa)  →  App Store Connect  →  TestFlight  →  iPhone testera
       budowanie          paczka            chmura Apple          dystrybucja      instalacja
```

Tester instaluje darmową appkę **TestFlight** ze sklepu, dostaje zaproszenie (e-mail lub link), klika „Install" — i ma aplikację jak każdą inną. Build wygasa po **90 dniach**.

---

## 2. Wymagania wstępne (jednorazowo)

- ✅ Konto **Apple Developer Program** (99 USD/rok) — macie (Team `V5RP52B9UP`).
- ✅ **Mac z Xcode** (najnowszy stabilny) — `xcode-select --install` jeśli brak narzędzi.
- ✅ **Flutter + CocoaPods**:
  ```bash
  flutter doctor          # wszystko na zielono w sekcji iOS/Xcode
  sudo gem install cocoapods   # jeśli brak
  ```
- ✅ Aplikacja utworzona w **App Store Connect** (patrz krok 5.1).

---

## 3. ⚠️ NAJWAŻNIEJSZE: adres backendu (API) dla buildu testowego

Aplikacja na telefonie testera **nie widzi** `http://127.0.0.1:8000` ani `localhost`. Masz dwie opcje:

### Opcja 3A — Backend publiczny przez HTTPS (zalecane dla TestFlight/promotora)
Tester może być w dowolnej sieci. Wymaga wystawienia backendu pod publiczny adres HTTPS
(patrz `WDROZENIE_CHMURA_WMS.md` — Docker Compose + Caddy z automatycznym HTTPS).
Adres wbudowujesz na stałe w build:

```bash
flutter build ipa --release \
  --dart-define=WMS_API_BASE=https://api.twoja-domena.pl
```

### Opcja 3B — Backend w sieci lokalnej (demo na tym samym Wi‑Fi)
Tester i komputer z backendem są w **tej samej sieci Wi‑Fi**. Aplikacja ma w ekranie
logowania pole **„Adres API"** — tester wpisuje np. `http://192.168.0.10:8000`, klika
**„Zapisz adres serwera"** i loguje się. `Info.plist` ma już `NSAllowsLocalNetworking`,
więc http w LAN jest dozwolony. IP komputera sprawdzisz: `ipconfig getifaddr en0`.

> Dla prezentacji obronnej najbezpieczniej: **3A (publiczny HTTPS)**. Backend w LAN bywa
> blokowany przez sieci uczelniane/gościnne.

---

## 4. Podbicie numeru wersji/buildu

App Store Connect odrzuci upload z **już istniejącym** numerem buildu. Przed każdym
wysłaniem zwiększ build number w `pubspec.yaml`:

```yaml
# było: version: 1.0.0+1
version: 1.0.0+2      # 1.0.0 = wersja widoczna; +2 = numer buildu (rośnie zawsze)
```

Albo podaj go w komendzie: `--build-name=1.0.0 --build-number=2`.

---

## 5. Budowanie i wysyłka na App Store Connect

### 5.1. Utwórz aplikację w App Store Connect (jednorazowo)
1. Wejdź na <https://appstoreconnect.apple.com> → **Apps** → **+** → **New App**.
2. Platform: **iOS**, Name: `WMS Worker`, Primary Language: Polski.
3. **Bundle ID**: wybierz `pl.wms.wmsWorker` (jeśli go nie ma na liście — utwórz najpierw
   w <https://developer.apple.com/account/resources/identifiers> z tym samym ID).
4. SKU: dowolny unikalny, np. `wms-worker-2026`.

### 5.2. Zbuduj paczkę `.ipa` (terminal — najprościej)

W katalogu `wms_worker`:

```bash
flutter clean
flutter pub get
flutter build ipa --release \
  --dart-define=WMS_API_BASE=https://api.twoja-domena.pl \
  --build-name=1.0.0 --build-number=2
```

Wynik: `wms_worker/build/ios/ipa/wms_worker.ipa`.

### 5.3. Wyślij build do App Store Connect — wybierz JEDEN sposób

**Sposób A — Xcode Organizer (GUI, najczytelniejszy):**
1. `open ios/Runner.xcworkspace`
2. Wybierz schemat **Runner** + target **Any iOS Device (arm64)**.
3. **Product → Archive**.
4. W oknie **Organizer**: zaznacz archiwum → **Distribute App** → **App Store Connect**
   → **Upload** → przejdź dalej (automatic signing) → **Upload**.

**Sposób B — Transporter (gdy masz gotowy `.ipa`):**
1. Pobierz **Transporter** z Mac App Store.
2. Zaloguj się Apple ID, przeciągnij `wms_worker.ipa`, kliknij **Deliver**.

**Sposób C — z linii poleceń (CI/automatyzacja):**
```bash
xcrun altool --upload-app -f build/ios/ipa/wms_worker.ipa \
  -t ios --apiKey <KEY_ID> --apiIssuer <ISSUER_ID>
# (wymaga App Store Connect API Key zamiast hasła)
```

Po uploadzie build pojawi się w App Store Connect po ~5–30 min (status „Processing").

---

## 6. Konfiguracja TestFlight (w App Store Connect)

1. Otwórz aplikację → zakładka **TestFlight**.
2. Gdy build skończy „Processing", uzupełnij **Export Compliance**
   („Does your app use encryption?" → zwykle **No**, jeśli używacie tylko standardowego HTTPS).
3. Dodaj testerów:

   **Internal Testing** (zespół, do 100 osób, **bez recenzji Apple**, dostępne od razu):
   - **Users and Access** → dodaj testera jako użytkownika z rolą.
   - W TestFlight → grupa **App Store Connect Users** → dodaj build i osoby.

   **External Testing** (promotor, do 10 000 osób, **wymaga recenzji Apple** ~1 dzień):
   - Utwórz grupę zewnętrzną → dodaj e-maile testerów lub włącz **Public Link**.
   - Wypełnij „What to Test" i „Beta App Description" → **Submit for Review**.

4. (Opcjonalnie) **Public Link** — generuje URL typu `https://testflight.apple.com/join/XXXXXXXX`,
   który można wysłać komukolwiek.

---

## 7. 📲 Jak tester POBIERA i instaluje aplikację (do opisania w pracy)

Tu jest instrukcja, którą dajesz testerowi/promotorowi:

1. **Zainstaluj „TestFlight"** z App Store (darmowa, od Apple).
2. Otrzymasz **zaproszenie**:
   - **e-mailem** (jeśli dodano Twój Apple ID jako testera) — kliknij **„View in TestFlight"**, lub
   - **linkiem publicznym** `https://testflight.apple.com/join/XXXXXXXX` — otwórz go na iPhonie.
3. W aplikacji TestFlight kliknij przy „WMS Worker" przycisk **„Install"** (albo „Accept" → „Install").
4. Aplikacja pojawi się na ekranie głównym z małą **żółtą kropką** (oznacza wersję testową).
5. Przy pierwszym uruchomieniu zezwól na **dostęp do kamery** (potrzebny do skanera).
6. Jeśli używacie backendu w LAN (Opcja 3B): w ekranie logowania wpisz **adres API**
   (np. `http://192.168.0.10:8000`) → **„Zapisz adres serwera"** → zaloguj się.
7. Aktualizacje: TestFlight powiadomi o nowym buildzie — wystarczy **„Update"**.

> Build TestFlight wygasa po **90 dniach** — przed obroną zrób świeży build, żeby nie wygasł w trakcie.

---

## 8. Alternatywa: instalacja Ad-Hoc (bez recenzji, szybki backup)

Gdy nie chcesz czekać na recenzję External Testing, a tester nie jest w zespole:

1. Dodaj **UDID** urządzenia testera do
   <https://developer.apple.com/account/resources/devices>.
2. Build z profilem Ad-Hoc:
   ```bash
   flutter build ipa --release --export-method ad-hoc \
     --dart-define=WMS_API_BASE=https://api.twoja-domena.pl
   ```
3. Przekaż `.ipa` przez **Apple Configurator**, **Diawi** (diawi.com) lub kabel + Xcode
   (**Window → Devices and Simulators → Install App**).

> Najszybszy wariant „tu i teraz" gdy iPhone jest podłączony kablem do Maca:
> `flutter run --release -d <device_id> --dart-define=WMS_API_BASE=...`

---

## 9. Alternatywa: Android (APK — najprostsze do przesłania)

Jeśli tester ma Androida, dystrybucja to po prostu wysłanie pliku:

```bash
flutter build apk --release --dart-define=WMS_API_BASE=https://api.twoja-domena.pl
# wynik: build/app/outputs/flutter-apk/app-release.apk
```

Tester: prześlij `.apk` (e-mail/dysk), na telefonie zezwól „Instaluj z nieznanych źródeł",
otwórz plik → **Zainstaluj**. Bez konta dewelopera i bez recenzji.

---

## 10. Najczęstsze problemy i rozwiązania

| Objaw | Przyczyna | Rozwiązanie |
|---|---|---|
| Upload odrzucony: „build number already exists" | Nie podbiłeś buildu | Zwiększ `+N` w `pubspec.yaml` (krok 4) |
| „Missing Compliance" w TestFlight | Brak Export Compliance | Odpowiedz na pytanie o szyfrowanie (zwykle „No") |
| Aplikacja nie łączy się z API | Zły `WMS_API_BASE`, brak HTTPS lub LAN | Sprawdź adres; w LAN użyj pola „Adres API" |
| Build odrzucony: brak opisu uprawnień | Brak `NSCameraUsageDescription` | Już jest w `Info.plist` ✅ |
| Skaner pokazuje czarny ekran | Tester nie zezwolił na kamerę | Ustawienia iOS → WMS → Kamera → włącz |
| „Untrusted Developer" (Ad-Hoc) | Profil nie zaufany | Ustawienia → Ogólne → VPN i zarządzanie urządzeniem → Zaufaj |
| Recenzja External trwa długo | Normalne (~1 dzień) | Użyj Internal Testing (bez recenzji) lub Ad-Hoc |

---

## 11. Checklista jakości przed wysyłką (pre-flight)

- [ ] `flutter analyze` → **No issues found** ✅ (zweryfikowane — patrz sekcja 12)
- [ ] `flutter test` → **All tests passed** ✅ (zweryfikowane)
- [ ] Logowanie działa (admin + worker)
- [ ] Lista zadań i dokumenty ładują się z API
- [ ] **Skaner** otwiera kamerę i odczytuje kod na urządzeniu fizycznym
- [ ] Ręczne wpisanie kodu działa jako fallback skanera
- [ ] Sesja utrzymana po restarcie aplikacji (tokeny w SharedPreferences)
- [ ] Błędy sieci pokazują czytelny komunikat
- [ ] Build number podbity względem poprzedniego uploadu

---

## 12. Wynik weryfikacji aplikacji Flutter + skanera (stan na dziś)

Wykonano realną weryfikację kodu i build-toolingu:

**Analiza statyczna i testy**
- `flutter pub get` → OK (zależności pobrane).
- `flutter analyze` → **No issues found!** (0 błędów, 0 ostrzeżeń — naprawiono 4 drobne uwagi `info`).
- `flutter test` → **All tests passed!**
- Wykryto urządzenia: macOS, Chrome oraz **fizyczny iPhone (iOS 26.5)** podłączony bezprzewodowo.

**Skaner kodów (mobile_scanner 7.2.0) — poprawny**
- Widżet `BarcodeScannerPage` (`lib/widgets/barcode_scanner_page.dart`) używa `MobileScanner`
  z callbackiem `onDetect`, zwraca pierwszy poprawny `rawValue` i zabezpiecza przed
  podwójnym odczytem (flaga `_done`).
- Uprawnienie kamery `NSCameraUsageDescription` jest w `Info.plist` — iOS poprawnie poprosi o zgodę.
- Skaner jest wywoływany z dialogu `askCode` (`code_entry_dialog.dart`) przyciskiem **„Skanuj"**,
  z **fallbackiem na ręczne wpisanie** kodu (działa nawet bez zgody na kamerę).
- Używany w ścieżkach PZ / MM / RW / wyszukiwaniu produktów.

**Konfiguracja adresu API — odporna**
- Kolejność rozwiązywania: `--dart-define=WMS_API_BASE` → zapisany adres (SharedPreferences)
  → domyślny `http://127.0.0.1:8000`; edytowalny w ekranie logowania (pole „Adres API").
- Timeout HTTP ustawiony, błędy połączenia komunikowane czytelnie.

> Czego **nie da się** zweryfikować automatycznie: fizyczny odczyt kodu z kamery — to wymaga
> realnego skanu na telefonie (pozycja w checkliście pre-flight, krok 11).
