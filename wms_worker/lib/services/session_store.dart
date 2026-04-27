import 'package:shared_preferences/shared_preferences.dart';

class SessionStore {
  static const _kAccess = 'wms_access_token';
  static const _kRefresh = 'wms_refresh_token';
  static const _kRecipients = 'wms_recent_recipients';

  Future<void> saveTokens({required String access, String? refresh}) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_kAccess, access);
    if (refresh != null) {
      await p.setString(_kRefresh, refresh);
    }
  }

  Future<String?> readAccessToken() async {
    final p = await SharedPreferences.getInstance();
    return p.getString(_kAccess);
  }

  Future<void> clear() async {
    final p = await SharedPreferences.getInstance();
    await p.remove(_kAccess);
    await p.remove(_kRefresh);
  }

  Future<List<String>> readRecentRecipients() async {
    final p = await SharedPreferences.getInstance();
    return p.getStringList(_kRecipients) ?? <String>[];
  }

  Future<void> saveRecentRecipient(String value) async {
    final normalized = value.trim();
    if (normalized.isEmpty) return;
    final p = await SharedPreferences.getInstance();
    final current = p.getStringList(_kRecipients) ?? <String>[];
    final next = <String>[normalized, ...current.where((e) => e.toLowerCase() != normalized.toLowerCase())];
    await p.setStringList(_kRecipients, next.take(8).toList());
  }
}
