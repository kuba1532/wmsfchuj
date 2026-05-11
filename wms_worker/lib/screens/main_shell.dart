import 'package:flutter/material.dart';

import '../services/session_store.dart';
import '../services/sync_bus.dart';
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
    required this.userId,
  });

  final String accessToken;
  final String userName;
  final int userId;

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _index = 0;
  late final WmsApi _api;
  late final SyncBus _syncBus;
  late final List<Widget?> _tabs;

  @override
  void initState() {
    super.initState();
    _api = WmsApi(widget.accessToken);
    _syncBus = SyncBus();
    _tabs = List<Widget?>.filled(5, null);
    _tabs[0] = TasksTab(api: _api, syncBus: _syncBus, currentUserId: widget.userId);
  }

  Widget _buildTab(int index) {
    switch (index) {
      case 0:
        return TasksTab(api: _api, syncBus: _syncBus, currentUserId: widget.userId);
      case 1:
        return PzTab(api: _api, syncBus: _syncBus);
      case 2:
        return MmTab(api: _api, syncBus: _syncBus);
      case 3:
        return RwTab(api: _api, syncBus: _syncBus);
      case 4:
        return StockTab(api: _api, syncBus: _syncBus);
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
  void dispose() {
    _syncBus.dispose();
    super.dispose();
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
