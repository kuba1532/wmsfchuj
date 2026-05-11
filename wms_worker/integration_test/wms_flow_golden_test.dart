import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:wms_worker/main.dart' show WmsWorkerApp;

/// Pełny przepłyb operacyjny + zrzuty PNG (magazynier 00002).
/// Uruchom z katalogu `wms_worker`: `flutter test integration_test/wms_flow_golden_test.dart -d macos`
///
/// Wymaga backendu http://127.0.0.1:8000, dostawcy SUP-001 / Northwind, produktu PRD-1001
/// powiązanego z dostawcą, lokalizacji STO-01 (regał) oraz bufora przyjęć w API.
const _kDemoSku = 'PRD-1001';
const _kPutawayCode = 'STO-01';

Future<void> _savePng(WidgetTester tester, String fileName) async {
  await tester.pumpAndSettle(const Duration(seconds: 2));
  final el = tester.element(find.byKey(const ValueKey('golden_root')));
  final ro = el.renderObject! as RenderRepaintBoundary;
  // Wyższa rozdzielczość = czytelniejsze zrzuty w PPTX / projektor
  final image = await ro.toImage(pixelRatio: 3);
  final bd = await image.toByteData(format: ui.ImageByteFormat.png);
  const envRoot = String.fromEnvironment('WMS_SCREENSHOT_ROOT', defaultValue: '');
  final base = envRoot.isNotEmpty ? envRoot : Directory.current.path;
  final dir = Directory('$base/build/integration_screenshots');
  await dir.create(recursive: true);
  final path = '${dir.path}/$fileName.png';
  await File(path).writeAsBytes(bd!.buffer.asUint8List());
  debugPrint('Zapisano zrzut: $path (${bd.lengthInBytes} bajtów)');
}

Future<void> _pumpUntil(Future<void> Function() pump, bool Function() ready, {int maxSteps = 120}) async {
  for (var i = 0; i < maxSteps; i++) {
    await pump();
    if (ready()) return;
  }
}

Future<void> _waitForLoginOrShell(WidgetTester tester) async {
  await _pumpUntil(
    () async => tester.pump(const Duration(milliseconds: 400)),
    () =>
        find.text('Zaloguj').evaluate().isNotEmpty ||
        (find.text('Zadania').evaluate().isNotEmpty && find.text('PZ').evaluate().isNotEmpty),
  );
  await tester.pumpAndSettle();
}

Future<void> _ensureLoggedInShell(WidgetTester tester) async {
  await _pumpUntil(
    () async => tester.pump(const Duration(seconds: 1)),
    () => find.text('Zadania').evaluate().isNotEmpty,
    maxSteps: 45,
  );
  expect(find.text('Zadania'), findsWidgets, reason: 'Po logowaniu widoczna nawigacja „Zadania”.');
}

Future<void> _tapPutawayFilterIfPresent(WidgetTester tester) async {
  final chip = find.text('Odłożenie (PZ)');
  if (chip.evaluate().isEmpty) return;
  await tester.tap(chip);
  await tester.pumpAndSettle(const Duration(seconds: 6));
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('WMS Pracownik — pełny flow PZ + PUTAWAY + zrzuty', (WidgetTester tester) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();

    const dpr = 2.0;
    const logicalW = 428.0;
    const logicalH = 926.0;
    tester.view.devicePixelRatio = dpr;
    tester.view.physicalSize = Size(logicalW * dpr, logicalH * dpr);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    runApp(
      RepaintBoundary(
        key: const ValueKey('golden_root'),
        child: const WmsWorkerApp(),
      ),
    );
    await tester.pump();

    await _waitForLoginOrShell(tester);
    await _savePng(tester, 'wms_ops_01_logowanie');

    if (find.text('Zaloguj').evaluate().isNotEmpty) {
      await tester.enterText(find.byType(TextField).at(0), '00002');
      await tester.enterText(find.byType(TextField).at(1), 'Demo1234');
      await tester.pumpAndSettle();
      await tester.tap(find.text('Zaloguj'));
      await tester.pumpAndSettle(const Duration(seconds: 18));
    }

    await _ensureLoggedInShell(tester);
    await _savePng(tester, 'wms_ops_02_zadania_przed');

    // ——— PZ: nowe przyjęcie ———
    await tester.tap(find.text('PZ').last);
    await tester.pumpAndSettle(const Duration(seconds: 10));
    await _savePng(tester, 'wms_ops_03_pz_formularz');

    await tester.tap(find.byType(DropdownButtonFormField<int>));
    await tester.pumpAndSettle(const Duration(seconds: 2));
    final supplierItem = find.textContaining('Northwind').last;
    expect(supplierItem, findsOneWidget);
    await tester.tap(supplierItem);
    await tester.pumpAndSettle(const Duration(seconds: 6));
    await _savePng(tester, 'wms_ops_04_pz_po_wyborze_dostawcy');

    await tester.tap(find.text('Dodaj pozycję (wpisz lub skan)'));
    await tester.pumpAndSettle(const Duration(seconds: 4));
    await _savePng(tester, 'wms_ops_05_pz_wybor_towaru_sheet');

    await tester.tap(find.text('Skanuj kod'));
    await tester.pumpAndSettle(const Duration(seconds: 2));
    await _savePng(tester, 'wms_ops_06_pz_dialog_kodu_jak_skaner');

    final scanField = find.descendant(
      of: find.byType(AlertDialog),
      matching: find.byType(TextField),
    );
    await tester.enterText(scanField, _kDemoSku);
    await tester.pumpAndSettle();
    await tester.tap(
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.widgetWithText(FilledButton, 'OK'),
      ),
    );
    await tester.pumpAndSettle(const Duration(seconds: 8));
    await _savePng(tester, 'wms_ops_07_pz_lista_po_skanie');

    await tester.tap(find.textContaining('Komponent montażowy'));
    await tester.pumpAndSettle(const Duration(seconds: 2));
    await tester.tap(
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.widgetWithText(FilledButton, 'OK'),
      ),
    );
    await tester.pumpAndSettle(const Duration(seconds: 2));

    await tester.tap(find.text(_kPutawayCode));
    await tester.pumpAndSettle(const Duration(seconds: 4));
    await _savePng(tester, 'wms_ops_08_pz_pozycja_gotowa');

    await tester.tap(find.text('Utwórz dokument PZ'));
    await tester.pumpAndSettle(const Duration(seconds: 12));
    await _savePng(tester, 'wms_ops_09_pz_lista_z_draftem');

    await tester.tap(find.text('Zarejestruj').first);
    await tester.pumpAndSettle(const Duration(seconds: 12));
    await _savePng(tester, 'wms_ops_10_pz_po_zarejestruj');

    // ——— Zadania: najnowsze PUTAWAY (created_at desc) — pierwsze na liście ———
    await tester.tap(find.text('Zadania').last);
    await tester.pumpAndSettle(const Duration(seconds: 10));
    await _tapPutawayFilterIfPresent(tester);
    await _savePng(tester, 'wms_ops_11_zadanie_putaway');

    await tester.tap(find.text('Biorę zadanie').first);
    await tester.pumpAndSettle(const Duration(seconds: 8));
    await _savePng(tester, 'wms_ops_12_zadanie_w_trakcie');

    await tester.tap(find.text('Potwierdź (skan miejsca)').first);
    await tester.pumpAndSettle(const Duration(seconds: 2));
    await _savePng(tester, 'wms_ops_13_dialog_potwierdz_lokalizacje');

    final locField = find.descendant(
      of: find.byType(AlertDialog),
      matching: find.byType(TextField),
    );
    await tester.enterText(locField, _kPutawayCode);
    await tester.pumpAndSettle();
    await tester.tap(
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.widgetWithText(FilledButton, 'OK'),
      ),
    );
    await tester.pumpAndSettle(const Duration(seconds: 12));
    await _savePng(tester, 'wms_ops_14_po_zakonczeniu_zadania');

    // Domyślnie zakończone są ukryte — pokaż je i zrób ostatni zrzut
    final showDone = find.text('Pokaż zakończone i anulowane');
    if (showDone.evaluate().isNotEmpty) {
      await tester.tap(showDone);
      await tester.pumpAndSettle(const Duration(seconds: 8));
    }
    await _tapPutawayFilterIfPresent(tester);
    await _savePng(tester, 'wms_ops_15_zadania_zakonczone_widoczne');
  });
}
