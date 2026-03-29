import 'package:flutter/material.dart';

import 'models/models.dart';
import 'screens/login_screen.dart';
import 'screens/main_shell.dart';
import 'services/session_store.dart';
import 'services/wms_api.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
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
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return c;
  }
}
