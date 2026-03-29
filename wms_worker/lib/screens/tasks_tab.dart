import 'package:flutter/material.dart';

import '../models/models.dart';
import '../services/wms_api.dart';

class TasksTab extends StatefulWidget {
  const TasksTab({super.key, required this.api});

  final WmsApi api;

  @override
  State<TasksTab> createState() => _TasksTabState();
}

class _TasksTabState extends State<TasksTab> {
  List<TaskItem>? _items;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await widget.api.fetchTasks();
      setState(() => _items = list);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _start(TaskItem t) async {
    try {
      await widget.api.startTask(t.id);
      await _load();
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
      return const Center(child: CircularProgressIndicator());
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
    final items = _items ?? [];
    if (items.isEmpty) {
      return const Center(child: Text('Brak zadań'));
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: items.length,
        separatorBuilder: (context, index) => const SizedBox(height: 8),
        itemBuilder: (context, i) {
          final t = items[i];
          final canStart = t.status == 'NEW' || t.status == 'ASSIGNED';
          final canComplete = t.status == 'IN_PROGRESS';
          return Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('#${t.id} · ${t.type}', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 4),
                  Text('Status: ${t.status}'),
                  if (t.productId != null) Text('Produkt ID: ${t.productId}'),
                  if (t.quantity != null) Text('Ilość: ${t.quantity}'),
                  if (t.fromLocationId != null || t.toLocationId != null)
                    Text('Z: ${t.fromLocationId ?? "—"} → Do: ${t.toLocationId ?? "—"}'),
                  const SizedBox(height: 8),
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
                          child: const Text('Zakończ'),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
