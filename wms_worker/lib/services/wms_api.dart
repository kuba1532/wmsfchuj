import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config.dart';
import '../models/models.dart';

class ApiException implements Exception {
  ApiException(this.statusCode, this.message);
  final int statusCode;
  final String message;

  @override
  String toString() => 'HTTP $statusCode: $message';
}

class WmsApi {
  WmsApi(this._token);

  String? _token;

  void setToken(String? t) => _token = t;

  Uri _u(String path, [Map<String, String>? query]) {
    final base = kApiBase.endsWith('/') ? kApiBase.substring(0, kApiBase.length - 1) : kApiBase;
    return Uri.parse('$base$kApiPrefix$path').replace(queryParameters: query);
  }

  Map<String, String> _headers({bool jsonBody = false}) {
    final h = <String, String>{
      if (_token != null) 'Authorization': 'Bearer $_token',
      if (jsonBody) 'Content-Type': 'application/json',
    };
    return h;
  }

  static Future<({String access, String refresh, UserInfo user})> login({
    required String login5,
    required String password,
  }) async {
    final base = kApiBase.endsWith('/') ? kApiBase.substring(0, kApiBase.length - 1) : kApiBase;
    final uri = Uri.parse('$base$kApiPrefix/auth/login');
    final res = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'login': login5, 'password': password}),
    );
    if (res.statusCode != 200) {
      throw ApiException(res.statusCode, _errBody(res.body));
    }
    final m = jsonDecode(res.body) as Map<String, dynamic>;
    final access = m['access_token'] as String;
    final refresh = m['refresh_token'] as String;
    final user = UserInfo.fromJson(m['user'] as Map<String, dynamic>);
    return (access: access, refresh: refresh, user: user);
  }

  static String _errBody(String body) {
    try {
      final m = jsonDecode(body) as Map<String, dynamic>;
      final d = m['detail'];
      if (d is String) return d;
      if (d is List && d.isNotEmpty) {
        final first = d.first;
        if (first is Map && first['msg'] != null) return first['msg'].toString();
      }
    } catch (_) {}
    return body.isEmpty ? 'Błąd serwera' : body;
  }

  Future<UserInfo> fetchMe() async {
    final res = await http.get(_u('/auth/me'), headers: _headers());
    _throwIfBad(res);
    return UserInfo.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<List<TaskItem>> fetchTasks({int page = 1, int pageSize = 30}) async {
    final res = await http.get(
      _u('/tasks', {'page': '$page', 'page_size': '$pageSize'}),
      headers: _headers(),
    );
    _throwIfBad(res);
    final m = jsonDecode(res.body) as Map<String, dynamic>;
    final items = m['items'] as List<dynamic>;
    return items.map((e) => TaskItem.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<TaskItem> startTask(int id) async {
    final res = await http.post(
      _u('/tasks/$id/start'),
      headers: _headers(),
    );
    _throwIfBad(res);
    return TaskItem.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<TaskItem> completeTask(int id) async {
    final res = await http.post(
      _u('/tasks/$id/complete'),
      headers: _headers(),
    );
    _throwIfBad(res);
    return TaskItem.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<List<Product>> searchProducts(String query) async {
    final res = await http.get(
      _u('/products', {'page': '1', 'page_size': '20', 'search': query}),
      headers: _headers(),
    );
    _throwIfBad(res);
    final m = jsonDecode(res.body) as Map<String, dynamic>;
    final items = m['items'] as List<dynamic>;
    return items.map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<DocumentHeader>> listDocumentsPz({int page = 1}) async {
    final res = await http.get(
      _u('/documents', {'page': '$page', 'page_size': '30', 'doc_type': 'PZ'}),
      headers: _headers(),
    );
    _throwIfBad(res);
    final m = jsonDecode(res.body) as Map<String, dynamic>;
    final items = m['items'] as List<dynamic>;
    return items.map((e) => DocumentHeader.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<DocumentHeader> createPz({
    required String supplier,
    required List<Map<String, dynamic>> items,
  }) async {
    final res = await http.post(
      _u('/documents/pz'),
      headers: _headers(jsonBody: true),
      body: jsonEncode({'supplier': supplier, 'items': items}),
    );
    _throwIfBad(res);
    return DocumentHeader.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  void _throwIfBad(http.Response res) {
    if (res.statusCode >= 200 && res.statusCode < 300) return;
    throw ApiException(res.statusCode, WmsApi._errBody(res.body));
  }
}
