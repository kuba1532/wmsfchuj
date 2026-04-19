import 'package:flutter/material.dart';

import '../services/session_store.dart';
import '../services/wms_api.dart';
import 'login_screen.dart';
import 'mm_tab.dart';
import 'pz_tab.dart';
import 'rw_tab.dart';
import 'stock_tab.dart';
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
  late final List<Widget?> _tabs;

  @override
  void initState() {
    super.initState();
    _api = WmsApi(widget.accessToken);
    _tabs = List<Widget?>.filled(5, null);
    _tabs[0] = TasksTab(api: _api);
  }

  Widget _buildTab(int index) {
    switch (index) {
      case 0:
        return TasksTab(api: _api);
      case 1:
        return PzTab(api: _api);
      case 2:
        return MmTab(api: _api);
      case 3:
        return RwTab(api: _api);
      case 4:
        return StockTab(api: _api);
      default:
        return const SizedBox.shrink();
    }
  }

  void _selectTab(int index) {
    setState(() {
      _index = index;
      _tabs[index] ??= _buildTab(index);
    });
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
        children: _tabs.map((tab) => tab ?? const SizedBox.shrink()).toList(),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: _selectTab,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.assignment_outlined), label: 'Zadania'),
          NavigationDestination(icon: Icon(Icons.south_west), label: 'PZ'),
          NavigationDestination(icon: Icon(Icons.swap_horiz), label: 'MM'),
          NavigationDestination(icon: Icon(Icons.local_shipping_outlined), label: 'RW'),
          NavigationDestination(icon: Icon(Icons.warehouse_outlined), label: 'Stan'),
        ],
      ),
    );
  }
}
