import 'package:flutter/material.dart';

import '../services/session_store.dart';
import '../services/wms_api.dart';
import 'login_screen.dart';
import 'pz_tab.dart';
import 'tasks_tab.dart';

class MainShell extends StatefulWidget {
  const MainShell({
    super.key,
    required this.accessToken,
    required this.userName,
  });

  final String accessToken;
  final String userName;

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _index = 0;
  late final WmsApi _api;

  @override
  void initState() {
    super.initState();
    _api = WmsApi(widget.accessToken);
  }

  Future<void> _logout() async {
    await SessionStore().clear();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.userName),
        actions: [
          IconButton(
            tooltip: 'Wyloguj',
            onPressed: _logout,
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: IndexedStack(
        index: _index,
        children: [
          TasksTab(api: _api),
          PzTab(api: _api),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.assignment_outlined), label: 'Zadania'),
          NavigationDestination(icon: Icon(Icons.inventory_2_outlined), label: 'Przyjęcie PZ'),
        ],
      ),
    );
  }
}
