import 'package:flutter/material.dart';

import 'barcode_scanner_page.dart';

const String _kScanMarker = '__SCAN__';

/// Ręczne wpisanie kodu albo przejście do skanera. Zwraca `null` przy anulowaniu.
Future<String?> askCode(
  BuildContext context, {
  required String title,
  String label = 'Kod',
  String hint = '',
}) async {
  final controller = TextEditingController();
  final result = await showDialog<String>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (hint.isNotEmpty) ...[
              Text(hint, style: Theme.of(ctx).textTheme.bodySmall),
              const SizedBox(height: 12),
            ],
            TextField(
              controller: controller,
              decoration: InputDecoration(
                labelText: label,
                border: const OutlineInputBorder(),
              ),
              autofocus: true,
              textCapitalization: TextCapitalization.none,
              keyboardType: TextInputType.text,
              onSubmitted: (v) {
                final t = v.trim();
                if (t.isNotEmpty) Navigator.pop(ctx, t);
              },
            ),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Anuluj')),
        TextButton(
          onPressed: () => Navigator.pop(ctx, _kScanMarker),
          child: const Text('Skanuj'),
        ),
        FilledButton(
          onPressed: () {
            final t = controller.text.trim();
            if (t.isNotEmpty) Navigator.pop(ctx, t);
          },
          child: const Text('OK'),
        ),
      ],
    ),
  );

  if (!context.mounted) return null;
  if (result == null) return null;
  if (result == _kScanMarker) {
    return Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const BarcodeScannerPage()),
    );
  }
  return result;
}
