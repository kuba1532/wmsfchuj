import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';

import 'config.dart';
import 'models/models.dart';
import 'screens/login_screen.dart';
import 'screens/main_shell.dart';
import 'services/session_store.dart';
import 'services/wms_api.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    if (kDebugMode) {
      debugPrint(details.exceptionAsString());
    }
  };
  PlatformDispatcher.instance.onError = (error, stack) {
    if (kDebugMode) {
      debugPrint('$error\n$stack');
    }
    return false;
  };
  runApp(const WmsWorkerApp());
}

class WmsWorkerApp extends StatelessWidget {
  const WmsWorkerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'WMS Pracownik',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
      ),
      home: const _Bootstrap(),
    );
  }
}

class _Bootstrap extends StatefulWidget {
  const _Bootstrap();

  @override
  State<_Bootstrap> createState() => _BootstrapState();
}

class _BootstrapState extends State<_Bootstrap> {
  Widget? _child;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    final token = await SessionStore().readAccessToken();
    if (token == null) {
      setState(() => _child = const LoginScreen());
      return;
    }
    final api = WmsApi(token);
    try {
      final UserInfo me = await api.fetchMe();
      if (!mounted) return;
      setState(() {
        _child = MainShell(
          accessToken: token,
          userName: '${me.firstName} ${me.lastName}',
        );
      });
    } on ApiException catch (_) {
      await SessionStore().clear();
      if (!mounted) return;
      setState(() => _child = const LoginScreen());
    } on TimeoutException catch (_) {
      await SessionStore().clear();
      if (!mounted) return;
      setState(() => _child = const LoginScreen());
    } catch (_) {
      await SessionStore().clear();
      if (!mounted) return;
      setState(() => _child = const LoginScreen());
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = _child;
    if (c == null) {
      final scheme = Theme.of(context).colorScheme;
      return Scaffold(
        backgroundColor: scheme.surfaceContainerLowest,
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(color: scheme.primary),
                  const SizedBox(height: 24),
                  Text(
                    'Ładowanie sesji…',
                    style: Theme.of(context).textTheme.titleMedium,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'API: $kApiBase',
                    style: Theme.of(context).textTheme.bodySmall,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Na telefonie ustaw IP komputera z backendem, nie 127.0.0.1.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }
    return c;
  }
}
