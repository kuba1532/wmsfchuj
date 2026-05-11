import 'package:flutter/material.dart';
import 'dart:async';

import '../models/models.dart';
import '../util/document_labels.dart';
import '../util/task_playbook.dart';
import '../services/sync_bus.dart';
import '../services/wms_api.dart';
import '../widgets/code_entry_dialog.dart';
import '../widgets/product_picker_dialog.dart';

/// Przesunięcie MM — skan lokalizacji źródłowej/docelowej + linie towaru (powiązanie z backendem /documents/mm).
class MmTab extends StatefulWidget {
  const MmTab({super.key, required this.api, required this.syncBus});

  final WmsApi api;
  final SyncBus syncBus;

  @override
  State<MmTab> createState() => _MmTabState();
}

class _MmTabState extends State<MmTab> {
  int? _fromId;
  int? _toId;
  String _fromLabel = '—';
  String _toLabel = '—';
  final List<PzLineDraft> _lines = [];
  bool _saving = false;
  bool _autoToTasks = true;
  List<DocumentHeader>? _recent;
  bool _loadingList = true;
  String? _listError;
  Timer? _autoRefreshTimer;

  @override
  void initState() {
    super.initState();
    _loadDocs();
    _autoRefreshTimer = Timer.periodic(const Duration(minutes: 3), (_) {
      if (!mounted || _loadingList || _saving) return;
      _loadDocs();
    });
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    super.dispose();
  }

  String _normalizeLocationCode(String raw) => raw.trim().toUpperCase();

  Future<void> _loadDocs() async {
    setState(() {
      _loadingList = true;
      _listError = null;
    });
    try {
      final d = await widget.api.listDocuments(docType: 'MM');
      setState(() => _recent = d);
    } on ApiException catch (e) {
      setState(() => _listError = e.message);
    } catch (e) {
      setState(() => _listError = '$e');
    } finally {
      if (mounted) setState(() => _loadingList = false);
    }
  }

  Future<void> _pickLocation(bool isFrom) async {
    final code = await askCode(
      context,
      title: isFrom ? 'Lokalizacja ŹRÓDŁOWA' : 'Lokalizacja DOCELOWA',
      label: 'Kod lokalizacji',
      hint: 'Wpisz kod regału (np. BUF-DEMO) albo Skanuj.',
    );
    if (code == null || !mounted) return;
    final normalized = _normalizeLocationCode(code);
    if (!RegExp(r'^[A-Z0-9-]{3,20}$').hasMatch(normalized)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Kod lokalizacji: tylko A-Z, 0-9 i myślnik (3-20 znaków)')),
      );
      return;
    }
    try {
      final locs = await widget.api.fetchLocations(search: normalized, pageSize: 30);
      if (!mounted) return;
      if (locs.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Brak lokalizacji dla kodu: $normalized')),
        );
        return;
      }
      final loc = locs.length == 1 ? locs.first : await _pickLoc(locs);
      if (loc == null || !mounted) return;
      setState(() {
        if (isFrom) {
          _fromId = loc.id;
          _fromLabel = '${loc.code} (${loc.type})';
        } else {
          _toId = loc.id;
          _toLabel = '${loc.code} (${loc.type})';
        }
      });
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  Future<LocationItem?> _pickLoc(List<LocationItem> locs) {
    return showModalBottomSheet<LocationItem>(
      context: context,
      builder: (ctx) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: locs
              .map(
                (l) => ListTile(
                  title: Text(l.code),
                  subtitle: Text(l.type),
                  onTap: () => Navigator.pop(ctx, l),
                ),
              )
              .toList(),
        ),
      ),
    );
  }

  Future<void> _addProductLine() async {
    try {
      final product = await pickProductFromCatalog(
        context,
        api: widget.api,
        title: 'Wybierz towar na MM',
      );
      if (product == null || !mounted) return;
      final qty = await _askQuantity();
      if (qty == null || !mounted) return;
      setState(() => _lines.add(PzLineDraft(product: product, quantity: qty)));
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  Future<double?> _askQuantity() async {
    final c = TextEditingController(text: '1');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Ilość'),
        content: TextField(
          controller: c,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(labelText: 'Ilość'),
          autofocus: true,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Anuluj')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('OK')),
        ],
      ),
    );
    if (ok != true) return null;
    return double.tryParse(c.text.replaceAll(',', '.'));
  }

  Future<void> _submit() async {
    if (_fromId == null || _toId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ustaw obie lokalizacje (wpisz lub skan)')),
      );
      return;
    }
    if (_fromId == _toId) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lokalizacja źródłowa i docelowa muszą być różne')),
      );
      return;
    }
    if (_lines.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Dodaj przynajmniej jedną pozycję')),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      final items = _lines
          .map((l) => {'product_id': l.product.id, 'quantity': l.quantity})
          .toList();
      final doc = await widget.api.createMm(
        fromLocationId: _fromId!,
        toLocationId: _toId!,
        items: items,
      );
      if (_autoToTasks) {
        await widget.api.confirmDocument(doc.id);
      }
      if (!mounted) return;
      setState(() => _lines.clear());
      await _loadDocs();
      widget.syncBus.publish();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _autoToTasks
                ? 'MM ${doc.number} — zatwierdzono, zadania uruchomione (jak na webie).'
                : 'Utworzono MM: ${doc.number} (szkic).',
          ),
        ),
      );
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _loadDocs,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Przesunięcie MM', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          const Text(
            'Kroki: 1) Lokalizacja Z  2) Lokalizacja DO  3) Pozycje  4) Utwórz MM.',
            style: TextStyle(fontSize: 13),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Od razu zatwierdź'),
            subtitle: const Text('Ten sam krok co „Zatwierdź” na panelu webowym (MM → zadania).'),
            value: _autoToTasks,
            onChanged: _saving ? null : (v) => setState(() => _autoToTasks = v),
          ),
        const SizedBox(height: 16),
        ListTile(
          title: Text('Z: $_fromLabel'),
          trailing: FilledButton.tonal(
            onPressed: () => _pickLocation(true),
            child: const Text('Wybierz'),
          ),
        ),
        ListTile(
          title: Text('Do: $_toLabel'),
          trailing: FilledButton.tonal(
            onPressed: () => _pickLocation(false),
            child: const Text('Wybierz'),
          ),
        ),
        FilledButton.tonalIcon(
          onPressed: _saving ? null : _addProductLine,
          icon: const Icon(Icons.add),
          label: const Text('Dodaj pozycję (wpisz lub skan)'),
        ),
        ..._lines.map(
          (l) => ListTile(
            title: Text(l.product.name),
            subtitle: Text('${l.quantity} ${l.product.unit}'),
            trailing: IconButton(
              icon: const Icon(Icons.delete_outline),
              onPressed: () => setState(() => _lines.remove(l)),
            ),
          ),
        ),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: _saving ? null : _submit,
          child: _saving
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Utwórz dokument MM'),
        ),
          const SizedBox(height: 24),
          Text('Ostatnie MM', style: Theme.of(context).textTheme.titleMedium),
          if (_loadingList)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_listError != null)
            Text(_listError!, style: TextStyle(color: Theme.of(context).colorScheme.error))
          else if ((_recent ?? []).isEmpty)
            const Text('Brak dokumentów MM')
          else
            ...(_recent!.map(
              (d) => ListTile(
                leading: const Icon(Icons.swap_horiz),
                title: Text(d.number),
                subtitle: Text(
                  '${documentStatusLabelPl(d.status)}\n${d.relatedTasksLine}',
                ),
                trailing: d.status == 'DRAFT'
                    ? TextButton(
                        onPressed: () async {
                          try {
                            await widget.api.confirmDocument(d.id);
                            await _loadDocs();
                            if (!mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('MM ${d.number} — zatwierdzono (zadania jak na webie)')),
                            );
                          } on ApiException catch (e) {
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text(e.message)),
                              );
                            }
                          }
                        },
                        child: const Text('Zatwierdź'),
                      )
                    : null,
              ),
            )),
        ],
      ),
    );
  }
}
