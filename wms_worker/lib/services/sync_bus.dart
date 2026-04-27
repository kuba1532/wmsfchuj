import 'package:flutter/foundation.dart';

/// Prosty bus zdarzeń do synchronizacji zakładek po mutacjach.
class SyncBus extends ChangeNotifier {
  void publish() => notifyListeners();
}

