int _jsonInt(dynamic v) {
  if (v is int) return v;
  if (v is num) return v.toInt();
  return int.parse('$v');
}

int? _jsonIntOpt(dynamic v) {
  if (v == null) return null;
  if (v is int) return v;
  if (v is num) return v.toInt();
  return int.tryParse('$v');
}

String _jsonStr(dynamic v) => v == null ? '' : '$v';

class UserInfo {
  UserInfo({
    required this.id,
    required this.loginCode,
    required this.firstName,
    required this.lastName,
    required this.role,
  });

  final int id;
  final String loginCode;
  final String firstName;
  final String lastName;
  final String role;

  factory UserInfo.fromJson(Map<String, dynamic> j) => UserInfo(
        id: _jsonInt(j['id']),
        loginCode: _jsonStr(j['login_code']),
        firstName: _jsonStr(j['first_name']),
        lastName: _jsonStr(j['last_name']),
        role: _jsonStr(j['role']),
      );
}

class TaskItem {
  TaskItem({
    required this.id,
    required this.type,
    required this.status,
    this.productId,
    this.productName,
    this.productSku,
    this.quantity,
    this.fromLocationId,
    this.toLocationId,
    this.assignedToId,
    this.assignedToName,
  });

  final int id;
  final String type;
  final String status;
  final int? productId;
  final String? productName;
  final String? productSku;
  final String? quantity;
  final int? fromLocationId;
  final int? toLocationId;
  final int? assignedToId;
  final String? assignedToName;

  factory TaskItem.fromJson(Map<String, dynamic> j) {
    String? productName;
    String? productSku;
    final p = j['product'];
    if (p is Map<String, dynamic>) {
      productName = p['name'] as String?;
      productSku = p['sku'] as String?;
    }
    return TaskItem(
        id: _jsonInt(j['id']),
      type: j['type'] as String,
      status: j['status'] as String,
      productId: _jsonIntOpt(j['product_id']),
      productName: productName,
      productSku: productSku,
      quantity: _decStr(j['quantity']),
      fromLocationId: _jsonIntOpt(j['from_location_id']),
      toLocationId: _jsonIntOpt(j['to_location_id']),
      assignedToId: _jsonIntOpt(j['assigned_to_id']),
      assignedToName: (j['assigned_to_name'] as String?)?.trim().isEmpty == true
          ? null
          : (j['assigned_to_name'] as String?),
    );
  }
}

String? _decStr(dynamic v) {
  if (v == null) return null;
  if (v is String) return v;
  return v.toString();
}

class Supplier {
  Supplier({required this.id, required this.code, required this.name});

  final int id;
  final String code;
  final String name;

  factory Supplier.fromJson(Map<String, dynamic> j) => Supplier(
        id: _jsonInt(j['id']),
        code: j['code'] as String,
        name: j['name'] as String,
      );
}

/// Odbiorca RW (słownik `/recipients`) — spójnie z panelem webowym.
class RecipientItem {
  RecipientItem({required this.id, required this.code, required this.name});

  final int id;
  final String code;
  final String name;

  factory RecipientItem.fromJson(Map<String, dynamic> j) => RecipientItem(
        id: _jsonInt(j['id']),
        code: j['code'] as String,
        name: j['name'] as String,
      );
}

class Product {
  Product({
    required this.id,
    required this.sku,
    this.ean,
    required this.name,
    required this.unit,
  });

  final int id;
  final String sku;
  final String? ean;
  final String name;
  final String unit;

  factory Product.fromJson(Map<String, dynamic> j) => Product(
        id: _jsonInt(j['id']),
        sku: j['sku'] as String,
        ean: j['ean'] as String?,
        name: j['name'] as String,
        unit: j['unit'] as String? ?? 'szt',
      );
}

class DocumentLinkedTask {
  DocumentLinkedTask({required this.id, required this.type, required this.status});

  final int id;
  final String type;
  final String status;

  factory DocumentLinkedTask.fromJson(Map<String, dynamic> j) => DocumentLinkedTask(
        id: _jsonInt(j['id']),
        type: j['type'] as String,
        status: j['status'] as String,
      );
}

class DocumentHeader {
  DocumentHeader({
    required this.id,
    required this.number,
    required this.type,
    required this.status,
    this.supplier,
    this.recipient,
    this.relatedTasks = const [],
  });

  final int id;
  final String number;
  final String type;
  final String status;
  final String? supplier;
  final String? recipient;
  final List<DocumentLinkedTask> relatedTasks;

  factory DocumentHeader.fromJson(Map<String, dynamic> j) => DocumentHeader(
        id: _jsonInt(j['id']),
        number: j['number'] as String,
        type: j['type'] as String,
        status: j['status'] as String,
        supplier: j['supplier'] as String?,
        recipient: j['recipient'] as String?,
        relatedTasks: (j['related_tasks'] as List<dynamic>?)
                ?.map((e) => DocumentLinkedTask.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
      );
}

class LocationItem {
  LocationItem({required this.id, required this.code, required this.type});

  final int id;
  final String code;
  final String type;

  factory LocationItem.fromJson(Map<String, dynamic> j) => LocationItem(
        id: _jsonInt(j['id']),
        code: j['code'] as String,
        type: j['type'] as String,
      );
}

class StockRow {
  StockRow({
    required this.id,
    required this.productId,
    required this.locationId,
    required this.quantity,
    required this.status,
    required this.version,
    this.productName,
    this.locationCode,
  });

  final int id;
  final int productId;
  final int locationId;
  final String quantity;
  final String status;
  final int version;
  final String? productName;
  final String? locationCode;

  factory StockRow.fromJson(Map<String, dynamic> j) {
    String? pn;
    String? lc;
    final p = j['product'];
    if (p is Map<String, dynamic>) pn = p['name'] as String?;
    final l = j['location'];
    if (l is Map<String, dynamic>) lc = l['code'] as String?;
    return StockRow(
      id: _jsonInt(j['id']),
      productId: _jsonIntOpt(j['product_id']) ?? 0,
      locationId: _jsonIntOpt(j['location_id']) ?? 0,
      quantity: _decStr(j['quantity']) ?? '0',
      status: j['status'] as String? ?? 'AVAILABLE',
      version: j['version'] as int? ?? 1,
      productName: pn,
      locationCode: lc,
    );
  }
}

class PzLineDraft {
  PzLineDraft({required this.product, required this.quantity});

  final Product product;
  final double quantity;
}
