import 'package:flutter/material.dart';
import 'dart:async';

import '../models/models.dart';
import '../services/sync_bus.dart';
import '../services/wms_api.dart';
import '../util/task_playbook.dart';

class TasksTab extends StatefulWidget {
  const TasksTab({super.key, required this.api, required this.syncBus});

  final WmsApi api;
  final SyncBus syncBus;

  @override
  State<TasksTab> createState() => _TasksTabState();
}

class _TasksTabState extends State<TasksTab> {
  List<TaskItem>? _items;
  Map<int, String> _locCodes = {};
  String? _error;
  bool _loading = true;
  String? _typeFilter;
  Timer? _autoRefreshTimer;

  @override
  void initState() {
    super.initState();
    _load();
    widget.syncBus.addListener(_onSyncEvent);
    _autoRefreshTimer = Timer.periodic(const Duration(minutes: 2), (_) {
      if (!mounted || _loading) return;
      _load();
    });
  }

  @override
  void dispose() {
    widget.syncBus.removeListener(_onSyncEvent);
    _autoRefreshTimer?.cancel();
    super.dispose();
  }

  void _onSyncEvent() {
    if (!mounted || _loading) return;
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        widget.api.fetchLocations(),
        widget.api.fetchTasks(),
      ]);
      final locs = results[0] as List<LocationItem>;
      final list = results[1] as List<TaskItem>;
      final map = {for (final l in locs) l.id: l.code};
      setState(() {
        _locCodes = map;
        _items = list;
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<TaskItem> get _filtered {
    final all = _items ?? [];
    if (_typeFilter == null || _typeFilter!.isEmpty) return all;
    if (_typeFilter == 'PICKING_MOVE') {
      return all.where((t) => t.type == 'PICKING' || t.type == 'MOVE').toList();
    }
    return all.where((t) => t.type == _typeFilter).toList();
  }

  Future<void> _start(TaskItem t) async {
    try {
      await widget.api.startTask(t.id);
      await _load();
      widget.syncBus.publish();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Zadanie rozpoczęte')));
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  Future<void> _complete(TaskItem t) async {
    try {
      await widget.api.completeTask(t.id);
      await _load();
      widget.syncBus.publish();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Zadanie zakończone')));
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Center(
        child: CircularProgressIndicator(color: Theme.of(context).colorScheme.primary),
      );
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(onPressed: _load, child: const Text('Spróbuj ponownie')),
            ],
          ),
        ),
      );
    }
    final items = _filtered;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
          child: Text(
            'Filtr roli: np. Picking = kompletacja, Putaway = odłożenie po przyjęciu.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Row(
            children: [
              FilterChip(
                label: const Text('Wszystkie'),
                selected: _typeFilter == null,
                onSelected: (_) => setState(() => _typeFilter = null),
              ),
              FilterChip(
                label: const Text('Picking'),
                selected: _typeFilter == 'PICKING',
                onSelected: (_) => setState(() => _typeFilter = 'PICKING'),
              ),
              FilterChip(
                label: const Text('Putaway'),
                selected: _typeFilter == 'PUTAWAY',
                onSelected: (_) => setState(() => _typeFilter = 'PUTAWAY'),
              ),
              FilterChip(
                label: const Text('Picking + Move'),
                selected: _typeFilter == 'PICKING_MOVE',
                onSelected: (_) => setState(() => _typeFilter = 'PICKING_MOVE'),
              ),
              FilterChip(
                label: const Text('Move'),
                selected: _typeFilter == 'MOVE',
                onSelected: (_) => setState(() => _typeFilter = 'MOVE'),
              ),
              FilterChip(
                label: const Text('Inwentaryzacja'),
                selected: _typeFilter == 'INVENTORY',
                onSelected: (_) => setState(() => _typeFilter = 'INVENTORY'),
              ),
            ],
          ),
        ),
        Expanded(
          child: items.isEmpty
              ? const Center(child: Text('Brak zadań w tym filtrze'))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: items.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 8),
                    itemBuilder: (context, i) {
                      final t = items[i];
                      final canStart = t.status == 'NEW' || t.status == 'ASSIGNED';
                      final canComplete = t.status == 'IN_PROGRESS';
                      final title = taskTitlePl(t.type);
                      final instr = taskInstruction(t, _locCodes);
                      return Card(
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('#${t.id} · $title', style: Theme.of(context).textTheme.titleMedium),
                              const SizedBox(height: 4),
                              Text('Status: ${t.status}'),
                              if (t.productId != null) Text('Produkt ID: ${t.productId}'),
                              const SizedBox(height: 8),
                              Text(instr, style: Theme.of(context).textTheme.bodyMedium),
                              const SizedBox(height: 12),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  if (canStart)
                                    FilledButton.tonal(
                                      onPressed: () => _start(t),
                                      child: const Text('Start'),
                                    ),
                                  if (canComplete)
                                    FilledButton(
                                      onPressed: () => _complete(t),
                                      child: const Text('Zakończ — wykonane'),
                                    ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
        ),
      ],
    );
  }
}
