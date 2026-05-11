/// Bazowy URL API (bez końcowego `/` i bez `/api/v1`).
///
/// Kolejność: `WMS_API_BASE` z builda → zapis w aplikacji (ekran logowania) → domyślnie localhost.
/// Emulator Android: `flutter run --dart-define=WMS_API_BASE=http://10.0.2.2:8000`
/// Fizyczny iPhone: wpisz w aplikacji IP Maca, np. `http://192.168.0.10:8000`, albo:
/// `flutter run --dart-define=WMS_API_BASE=http://192.168.0.10:8000`
const String kApiBaseFromEnvironment = String.fromEnvironment(
  'WMS_API_BASE',
  defaultValue: '',
);

const String kApiPrefix = '/api/v1';

String _resolvedApiBase = 'http://127.0.0.1:8000';

/// Aktualny host API (ustawiany w `main()` i po „Zapisz adres” na logowaniu).
String get kApiBase => _resolvedApiBase;

void setResolvedApiBase(String raw) {
  _resolvedApiBase = normalizeWmsApiBase(raw);
}

/// Normalizacja wpisu użytkownika / zmiennych środowiska.
String normalizeWmsApiBase(String raw) {
  var s = raw.trim();
  if (s.isEmpty) {
    return 'http://127.0.0.1:8000';
  }
  final lower = s.toLowerCase();
  if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
    s = 'http://$s';
  }
  while (s.endsWith('/')) {
    s = s.substring(0, s.length - 1);
  }
  return s;
}
