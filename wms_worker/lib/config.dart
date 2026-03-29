/// Bazowy URL API (bez końcowego `/`).
/// Emulator Android: `flutter run --dart-define=WMS_API_BASE=http://10.0.2.2:8000`
/// iOS symulator / desktop: domyślnie localhost.
const String kApiBase = String.fromEnvironment(
  'WMS_API_BASE',
  defaultValue: 'http://127.0.0.1:8000',
);

const String kApiPrefix = '/api/v1';
