import 'package:flutter_test/flutter_test.dart';

import 'package:wms_worker/main.dart';

void main() {
  testWidgets('App starts', (WidgetTester tester) async {
    await tester.pumpWidget(const WmsWorkerApp());
    await tester.pump();
    expect(find.byType(WmsWorkerApp), findsOneWidget);
  });
}
