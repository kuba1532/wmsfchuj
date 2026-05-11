import 'package:flutter/material.dart';
import 'dart:async';

import '../models/models.dart';
import '../services/sync_bus.dart';
import '../services/wms_api.dart';
import '../util/task_playbook.dart';
import '../util/task_location_confirm.dart';

class TasksTab extends StatefulWidget {
  const TasksTab({
    super.key,
    required this.api,
    required this.syncBus,
    required this.currentUserId,
  });

  final WmsApi api;
  final SyncBus syncBus;
  final int currentUserId;

  @override
  State<TasksTab> createState() => _TasksTabState();
}

class _TasksTabState extends State<TasksTab> {
  List<TaskItem>? _items;
  Map<int, String> _locCodes = {};
  String? _error;
  bool _loading = true;
  /// Domyślnie ukryj COMPLETED / CANCELLED (API omit_terminal).
  bool _showTerminal = false;
  final Set<String> _typeFilters = <String>{};
  Timer? _autoRefreshTimer;
  int? _busyTaskId;
  _AssignmentScope _assignmentScope = _AssignmentScope.all;
  _SortMode _sortMode = _SortMode.newest;

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
        widget.api.fetchTasks(omitTerminal: !_showTerminal),
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
    if (_typeFilters.isEmpty) return all;
    return all.where((t) => _typeFilters.contains(t.type)).toList();
  }

  List<TaskItem> get _mine =>
      _filtered.where((t) => t.assignedToId == widget.currentUserId).toList();

  List<TaskItem> get _pool =>
      _filtered.where((t) => t.assignedToId == null && t.status == 'NEW').toList();

  List<TaskItem> get _otherAssigned =>
      _filtered.where((t) => t.assignedToId != null && t.assignedToId != widget.currentUserId).toList();

  List<TaskItem> get _visibleByScope {
    switch (_assignmentScope) {
      case _AssignmentScope.mine:
        return _mine;
      case _AssignmentScope.pool:
        return _pool;
      case _AssignmentScope.other:
        return _otherAssigned;
      case _AssignmentScope.all:
        return _filtered;
    }
  }

  List<TaskItem> get _visibleSorted {
    final out = [..._visibleByScope];
    int statusRank(String s) {
      switch (s) {
        case 'IN_PROGRESS':
          return 0;
        case 'NEW':
          return 1;
        case 'ASSIGNED':
          return 2;
        case 'COMPLETED':
          return 3;
        case 'CANCELLED':
          return 4;
        default:
          return 9;
      }
    }

    out.sort((a, b) {
      switch (_sortMode) {
        case _SortMode.newest:
          return b.id.compareTo(a.id);
        case _SortMode.oldest:
          return a.id.compareTo(b.id);
        case _SortMode.type:
          return taskTitlePl(a.type).compareTo(taskTitlePl(b.type));
        case _SortMode.status:
          return statusRank(a.status).compareTo(statusRank(b.status));
      }
    });
    return out;
  }

  Future<void> _start(TaskItem t) async {
    if (_busyTaskId != null) return;
    setState(() => _busyTaskId = t.id);
    try {
      await widget.api.startTask(t.id);
      await _load();
      widget.syncBus.publish();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Zadanie „w trakcie” — stany magazynowe przy odłożeniu (PZ) zmieniają się dopiero po „Potwierdź” ze skanem miejsca.',
            ),
            duration: Duration(seconds: 6),
          ),
        );
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _busyTaskId = null);
    }
  }

  Future<void> _complete(TaskItem t) async {
    if (_busyTaskId != null) return;
    final ok = await confirmTaskCompletionLocation(context, t, _locCodes);
    if (!mounted || !ok) return;
    setState(() => _busyTaskId = t.id);
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
    } finally {
      if (mounted) setState(() => _busyTaskId = null);
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
          child: Text(
            '„Rozpocznij pracę” = start (bez księgowania). „Zakończ (kod miejsca)” = ten sam krok co na webie. '
            'Filtry: kilka typów naraz.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
        SwitchListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 12),
          title: const Text('Pokaż zakończone i anulowane'),
          value: _showTerminal,
          onChanged: (v) {
            setState(() => _showTerminal = v);
            _load();
          },
        ),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Row(
            children: [
              FilterChip(
                label: const Text('Wszystkie'),
                selected: _typeFilters.isEmpty,
                onSelected: (_) => setState(() => _typeFilters.clear()),
              ),
              FilterChip(
                label: const Text('Kompletacja'),
                selected: _typeFilters.contains('PICKING'),
                onSelected: (selected) => setState(() {
                  if (selected) {
                    _typeFilters.add('PICKING');
                  } else {
                    _typeFilters.remove('PICKING');
                  }
                }),
              ),
              FilterChip(
                label: const Text('Odłożenie (PZ)'),
                selected: _typeFilters.contains('PUTAWAY'),
                onSelected: (selected) => setState(() {
                  if (selected) {
                    _typeFilters.add('PUTAWAY');
                  } else {
                    _typeFilters.remove('PUTAWAY');
                  }
                }),
              ),
              FilterChip(
                label: const Text('Przeniesienie (MM)'),
                selected: _typeFilters.contains('MOVE'),
                onSelected: (selected) => setState(() {
                  if (selected) {
                    _typeFilters.add('MOVE');
                  } else {
                    _typeFilters.remove('MOVE');
                  }
                }),
              ),
              FilterChip(
                label: const Text('Inwentaryzacja'),
                selected: _typeFilters.contains('INVENTORY'),
                onSelected: (selected) => setState(() {
                  if (selected) {
                    _typeFilters.add('INVENTORY');
                  } else {
                    _typeFilters.remove('INVENTORY');
                  }
                }),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(8, 0, 8, 4),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                ChoiceChip(
                  label: Text('Wszystkie (${_filtered.length})'),
                  selected: _assignmentScope == _AssignmentScope.all,
                  onSelected: (_) => setState(() => _assignmentScope = _AssignmentScope.all),
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: Text('Moje (${_mine.length})'),
                  selected: _assignmentScope == _AssignmentScope.mine,
                  onSelected: (_) => setState(() => _assignmentScope = _AssignmentScope.mine),
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: Text('Giełda (${_pool.length})'),
                  selected: _assignmentScope == _AssignmentScope.pool,
                  onSelected: (_) => setState(() => _assignmentScope = _AssignmentScope.pool),
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: Text('Przypisane do innych (${_otherAssigned.length})'),
                  selected: _assignmentScope == _AssignmentScope.other,
                  onSelected: (_) => setState(() => _assignmentScope = _AssignmentScope.other),
                ),
              ],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
          child: DropdownButtonFormField<_SortMode>(
            // ignore: deprecated_member_use
            value: _sortMode,
            decoration: const InputDecoration(
              labelText: 'Sortowanie listy',
              border: OutlineInputBorder(),
              isDense: true,
            ),
            items: const [
              DropdownMenuItem(value: _SortMode.newest, child: Text('Najnowsze')),
              DropdownMenuItem(value: _SortMode.oldest, child: Text('Najstarsze')),
              DropdownMenuItem(value: _SortMode.type, child: Text('Typ zadania')),
              DropdownMenuItem(value: _SortMode.status, child: Text('Status')),
            ],
            onChanged: (v) {
              if (v == null) return;
              setState(() => _sortMode = v);
            },
          ),
        ),
        Expanded(
          child: _visibleSorted.isEmpty
              ? const Center(child: Text('Brak zadań w tym filtrze'))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(12),
                    children: _visibleSorted
                        .map((t) => _buildTaskCard(t, lockActions: _assignmentScope == _AssignmentScope.other))
                        .toList(),
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildTaskCard(TaskItem t, {bool lockActions = false}) {
    final canStart = !lockActions && (t.status == 'NEW' || t.status == 'ASSIGNED');
    final canComplete = !lockActions && t.status == 'IN_PROGRESS';
    final busyHere = _busyTaskId == t.id;
    final title = taskTitlePl(t.type);
    final instr = taskInstruction(t, _locCodes);
    final flowHint = taskLifecycleHintPl(t.type);
    final assignedInfo = t.assignedToName != null && t.assignedToName!.isNotEmpty
        ? t.assignedToName!
        : (t.assignedToId != null ? 'Użytkownik #${t.assignedToId}' : 'Nieprzypisane');

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('#${t.id} · $title', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 4),
              Text('Status: ${taskStatusBriefPl(t.status)}'),
              Text('Przypisane: $assignedInfo'),
              if ((t.productName ?? '').isNotEmpty)
                Text(
                  t.productSku != null && t.productSku!.isNotEmpty
                      ? '${t.productName} (${t.productSku})'
                      : t.productName!,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                )
              else if (t.productId != null)
                Text('Produkt #${t.productId}'),
              const SizedBox(height: 8),
              Text(instr, style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 8),
              Text(flowHint, style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  if (canStart)
                    FilledButton.tonal(
                      onPressed: busyHere ? null : () => _start(t),
                      child: Text(busyHere ? '…' : 'Rozpocznij pracę'),
                    ),
                  if (canComplete)
                    FilledButton(
                      onPressed: busyHere ? null : () => _complete(t),
                      child: Text(busyHere ? '…' : 'Zakończ (kod miejsca)'),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

enum _AssignmentScope { all, mine, pool, other }

enum _SortMode { newest, oldest, type, status }
