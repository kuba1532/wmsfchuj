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
        id: j['id'] as int,
        loginCode: j['login_code'] as String,
        firstName: j['first_name'] as String,
        lastName: j['last_name'] as String,
        role: j['role'] as String,
      );
}

class TaskItem {
  TaskItem({
    required this.id,
    required this.type,
    required this.status,
    this.productId,
    this.quantity,
    this.fromLocationId,
    this.toLocationId,
  });

  final int id;
  final String type;
  final String status;
  final int? productId;
  final String? quantity;
  final int? fromLocationId;
  final int? toLocationId;

  factory TaskItem.fromJson(Map<String, dynamic> j) => TaskItem(
        id: j['id'] as int,
        type: j['type'] as String,
        status: j['status'] as String,
        productId: j['product_id'] as int?,
        quantity: _decStr(j['quantity']),
        fromLocationId: j['from_location_id'] as int?,
        toLocationId: j['to_location_id'] as int?,
      );
}

String? _decStr(dynamic v) {
  if (v == null) return null;
  if (v is String) return v;
  return v.toString();
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
        id: j['id'] as int,
        sku: j['sku'] as String,
        ean: j['ean'] as String?,
        name: j['name'] as String,
        unit: j['unit'] as String? ?? 'szt',
      );
}

class DocumentHeader {
  DocumentHeader({
    required this.id,
    required this.number,
    required this.type,
    required this.status,
    this.supplier,
  });

  final int id;
  final String number;
  final String type;
  final String status;
  final String? supplier;

  factory DocumentHeader.fromJson(Map<String, dynamic> j) => DocumentHeader(
        id: j['id'] as int,
        number: j['number'] as String,
        type: j['type'] as String,
        status: j['status'] as String,
        supplier: j['supplier'] as String?,
      );
}

class PzLineDraft {
  PzLineDraft({required this.product, required this.quantity});

  final Product product;
  final double quantity;
}
