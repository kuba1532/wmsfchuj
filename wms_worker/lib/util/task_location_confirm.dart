import 'package:flutter/material.dart';

import '../models/models.dart';
import '../widgets/code_entry_dialog.dart';

/// Przed [complete] wymagamy zgodności kodu lokalizacji (skan / wpis), żeby
/// uniknąć przypadkowego podwójnego kliknięcia bez realnej czynności.
Future<bool> confirmTaskCompletionLocation(
  BuildContext context,
  TaskItem task,
  Map<int, String> locationCodeById,
) async {
  final int? locId;
  final String hintLine;

  switch (task.type) {
    case 'PUTAWAY':
      locId = task.toLocationId;
      hintLine = 'Zeskanuj lub wpisz kod miejsca DOCELOWEGO (tam gdzie odłożyłeś towar z bufora).';
      break;
    case 'MOVE':
      locId = task.toLocationId;
      hintLine = 'Zeskanuj lub wpisz kod miejsca DOCELOWEGO (dokąd przewiozłeś towar).';
      break;
    case 'PICKING':
      locId = task.fromLocationId;
      hintLine = 'Zeskanuj lub wpisz kod miejsca ŹRÓDŁOWEGO (skąd zbierasz).';
      break;
    case 'INVENTORY':
      locId = task.fromLocationId;
      hintLine = 'Zeskanuj lub wpisz kod lokalizacji, którą inwentaryzujesz.';
      break;
    default:
      return true;
  }

  if (locId == null) {
    return _askProceedWithoutCode(context, 'To zadanie nie ma przypisanej lokalizacji w systemie.');
  }

  final expected = locationCodeById[locId];
  if (expected == null || expected.isEmpty) {
    return _askProceedWithoutCode(
      context,
      'Brak kodu lokalizacji #$locId na liście — nie można zweryfikować skanem.',
    );
  }

  final scanned = await askCode(
    context,
    title: 'Potwierdź lokalizację',
    hint: '$hintLine\n\nOczekiwany kod: $expected',
  );
  if (!context.mounted) return false;
  if (scanned == null) return false;

  final a = scanned.trim().toLowerCase();
  final b = expected.trim().toLowerCase();
  if (a != b) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Kod „$scanned” nie zgadza się z oczekiwanym „$expected”.')),
    );
    return false;
  }
  return true;
}

Future<bool> _askProceedWithoutCode(BuildContext context, String reason) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('Potwierdzenie'),
      content: Text('$reason\n\nCzy na pewno kończysz zadanie bez skanu?'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Anuluj')),
        FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Tak, zakończ')),
      ],
    ),
  );
  return ok == true;
}
