import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config.dart';
import '../models/models.dart';

const Duration _kHttpTimeout = Duration(seconds: 20);

Future<http.Response> _httpT(Future<http.Response> f) => f.timeout(_kHttpTimeout);

/// Publiczny endpoint (bez JWT) — test połączenia z backendem.
Future<({bool ok, String? database, String? version})> pingBackendHealth() async {
  final base = kApiBase.endsWith('/') ? kApiBase.substring(0, kApiBase.length - 1) : kApiBase;
  final uri = Uri.parse('$base/api/health');
  try {
    final res = await _httpT(http.get(uri));
    if (res.statusCode != 200) {
      return (ok: false, database: null, version: null);
    }
    final m = jsonDecode(res.body) as Map<String, dynamic>;
    return (
      ok: (m['status'] as String?) == 'ok',
      database: m['database'] as String?,
      version: m['version'] as String?,
    );
  } catch (_) {
    return (ok: false, database: null, version: null);
  }
}

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
    final res = await _httpT(
      http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'login': login5, 'password': password}),
      ),
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
    final res = await _httpT(http.get(_u('/auth/me'), headers: _headers()));
    _throwIfBad(res);
    return UserInfo.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<List<TaskItem>> fetchTasks({int page = 1, int pageSize = 30}) async {
    final res = await _httpT(
      http.get(
        _u('/tasks', {'page': '$page', 'page_size': '$pageSize'}),
        headers: _headers(),
      ),
    );
    _throwIfBad(res);
    final m = jsonDecode(res.body) as Map<String, dynamic>;
    final items = m['items'] as List<dynamic>;
    return items.map((e) => TaskItem.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<TaskItem> startTask(int id) async {
    final res = await _httpT(
      http.post(
        _u('/tasks/$id/start'),
        headers: _headers(),
      ),
    );
    _throwIfBad(res);
    return TaskItem.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<TaskItem> completeTask(int id) async {
    final res = await _httpT(
      http.post(
        _u('/tasks/$id/complete'),
        headers: _headers(),
      ),
    );
    _throwIfBad(res);
    return TaskItem.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<List<Supplier>> listSuppliers({int page = 1, int pageSize = 100}) async {
    final res = await _httpT(
      http.get(
        _u('/suppliers', {'page': '$page', 'page_size': '$pageSize'}),
        headers: _headers(),
      ),
    );
    _throwIfBad(res);
    final m = jsonDecode(res.body) as Map<String, dynamic>;
    final items = m['items'] as List<dynamic>;
    return items.map((e) => Supplier.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Product>> searchProducts(String query, {int? supplierId}) async {
    final q = <String, String>{
      'page': '1',
      'page_size': '20',
      'search': query,
    };
    if (supplierId != null && supplierId > 0) {
      q['supplier_id'] = '$supplierId';
    }
    final res = await _httpT(http.get(_u('/products', q), headers: _headers()));
    _throwIfBad(res);
    final m = jsonDecode(res.body) as Map<String, dynamic>;
    final items = m['items'] as List<dynamic>;
    return items.map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<DocumentHeader>> listDocuments({required String docType, int page = 1}) async {
    final res = await _httpT(
      http.get(
        _u('/documents', {'page': '$page', 'page_size': '30', 'doc_type': docType}),
        headers: _headers(),
      ),
    );
    _throwIfBad(res);
    final m = jsonDecode(res.body) as Map<String, dynamic>;
    final items = m['items'] as List<dynamic>;
    return items.map((e) => DocumentHeader.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<DocumentHeader>> listDocumentsPz({int page = 1}) => listDocuments(docType: 'PZ', page: page);

  Future<DocumentHeader> createPz({
    required int supplierId,
    required List<Map<String, dynamic>> items,
  }) async {
    final res = await _httpT(
      http.post(
        _u('/documents/pz'),
        headers: _headers(jsonBody: true),
        body: jsonEncode({'supplier_id': supplierId, 'items': items}),
      ),
    );
    _throwIfBad(res);
    return DocumentHeader.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<DocumentHeader> pzStart(int documentId) async {
    final res = await _httpT(
      http.post(
        _u('/documents/$documentId/pz/start'),
        headers: _headers(),
      ),
    );
    _throwIfBad(res);
    return DocumentHeader.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<DocumentHeader> pzComplete(int documentId) async {
    final res = await _httpT(
      http.post(
        _u('/documents/$documentId/pz/complete'),
        headers: _headers(),
      ),
    );
    _throwIfBad(res);
    return DocumentHeader.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  /// Lokalizacje — API ogranicza `page_size` do 100; przy większej liczbie rekordów pobiera kolejne strony.
  Future<List<LocationItem>> fetchLocations({String search = '', int pageSize = 100}) async {
    final size = pageSize.clamp(1, 100);
    final all = <LocationItem>[];
    for (var page = 1; page <= 50; page++) {
      final res = await _httpT(
        http.get(
          _u('/locations', {'page': '$page', 'page_size': '$size', 'search': search}),
          headers: _headers(),
        ),
      );
      _throwIfBad(res);
      final m = jsonDecode(res.body) as Map<String, dynamic>;
      final raw = m['items'] as List<dynamic>;
      for (final e in raw) {
        all.add(LocationItem.fromJson(e as Map<String, dynamic>));
      }
      final total = m['total'] is int ? m['total'] as int : int.tryParse('${m['total']}') ?? 0;
      if (page * size >= total || raw.isEmpty) break;
    }
    return all;
  }

  Future<List<StockRow>> fetchStock({String search = '', int pageSize = 30}) async {
    final res = await _httpT(
      http.get(
        _u('/stock', {'page': '1', 'page_size': '$pageSize', 'search': search}),
        headers: _headers(),
      ),
    );
    _throwIfBad(res);
    final m = jsonDecode(res.body) as Map<String, dynamic>;
    final items = m['items'] as List<dynamic>;
    return items.map((e) => StockRow.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<DocumentHeader> createMm({
    required int fromLocationId,
    required int toLocationId,
    required List<Map<String, dynamic>> items,
  }) async {
    final res = await _httpT(
      http.post(
        _u('/documents/mm'),
        headers: _headers(jsonBody: true),
        body: jsonEncode({
          'from_location_id': fromLocationId,
          'to_location_id': toLocationId,
          'items': items,
        }),
      ),
    );
    _throwIfBad(res);
    return DocumentHeader.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<DocumentHeader> submitToTasks(int documentId) async {
    final res = await _httpT(
      http.post(
        _u('/documents/$documentId/submit-to-tasks'),
        headers: _headers(),
      ),
    );
    _throwIfBad(res);
    return DocumentHeader.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<DocumentHeader> createRw({
    required String recipient,
    required List<Map<String, dynamic>> items,
  }) async {
    final res = await _httpT(
      http.post(
        _u('/documents/rw'),
        headers: _headers(jsonBody: true),
        body: jsonEncode({'recipient': recipient, 'items': items}),
      ),
    );
    _throwIfBad(res);
    return DocumentHeader.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<StockRow> changeStockStatus({
    required int stockId,
    required String status,
    required int version,
    double? quantity,
  }) async {
    final payload = <String, dynamic>{'status': status, 'version': version};
    if (quantity != null) {
      payload['quantity'] = quantity;
    }
    final res = await _httpT(
      http.patch(
        _u('/stock/$stockId/status'),
        headers: _headers(jsonBody: true),
        body: jsonEncode(payload),
      ),
    );
    _throwIfBad(res);
    return StockRow.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  void _throwIfBad(http.Response res) {
    if (res.statusCode >= 200 && res.statusCode < 300) return;
    throw ApiException(res.statusCode, WmsApi._errBody(res.body));
  }
}
