import 'package:flutter/material.dart';
import 'dart:async';

import '../models/models.dart';
import '../util/document_labels.dart';
import '../util/task_playbook.dart';
import '../services/sync_bus.dart';
import '../services/wms_api.dart';
import '../widgets/product_picker_dialog.dart';

/// Wydanie RW — lokalizacja pobrania + odbiorca ze słownika + pozycje (jak panel webowy).
class RwTab extends StatefulWidget {
  const RwTab({super.key, required this.api, required this.syncBus});

  final WmsApi api;
  final SyncBus syncBus;

  @override
  State<RwTab> createState() => _RwTabState();
}

class _RwTabState extends State<RwTab> {
  final List<PzLineDraft> _lines = [];
  List<DocumentHeader>? _recent;
  bool _loadingList = true;
  bool _saving = false;
  String? _listError;
  bool _autoToTasks = true;
  Timer? _autoRefreshTimer;

  List<LocationItem> _locations = [];
  List<RecipientItem> _recipients = [];
  int? _fromLocationId;
  int? _recipientId;
  bool _dictLoading = true;
  String? _dictError;

  @override
  void initState() {
    super.initState();
    _loadDocs();
    _loadDicts();
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

  Future<void> _loadDicts() async {
    setState(() {
      _dictLoading = true;
      _dictError = null;
    });
    try {
      final locs = await widget.api.fetchLocations();
      final recs = await widget.api.fetchRecipients();
      if (!mounted) return;
      setState(() {
        _locations = locs;
        _recipients = recs;
        if (_fromLocationId != null &&
            !locs.any((l) => l.id == _fromLocationId)) {
          _fromLocationId = null;
        }
        if (_recipientId != null && !recs.any((r) => r.id == _recipientId)) {
          _recipientId = null;
        }
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _dictError = e.message);
    } catch (e) {
      if (mounted) setState(() => _dictError = '$e');
    } finally {
      if (mounted) setState(() => _dictLoading = false);
    }
  }

  Future<void> _loadDocs() async {
    setState(() {
      _loadingList = true;
      _listError = null;
    });
    try {
      final d = await widget.api.listDocuments(docType: 'RW');
      setState(() => _recent = d);
    } on ApiException catch (e) {
      setState(() => _listError = e.message);
    } catch (e) {
      setState(() => _listError = '$e');
    } finally {
      if (mounted) setState(() => _loadingList = false);
    }
  }

  Future<void> _addLine() async {
    try {
      final product = await pickProductFromCatalog(
        context,
        api: widget.api,
        title: 'Wybierz towar na RW',
      );
      if (product == null || !mounted) return;
      final qty = await _askQuantity();
      if (qty == null || !mounted) return;
      setState(() => _lines.add(PzLineDraft(product: product, quantity: qty)));
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  Future<double?> _askQuantity() async {
    final c = TextEditingController(text: '1');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Ilość do wydania'),
        content: TextField(
          controller: c,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Anuluj'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('OK'),
          ),
        ],
      ),
    );
    if (ok != true) return null;
    return double.tryParse(c.text.replaceAll(',', '.'));
  }

  Future<void> _submit() async {
    if (_fromLocationId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Wybierz lokalizację pobrania (skąd zdejmujemy towar).',
          ),
        ),
      );
      return;
    }
    if (_recipientId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Wybierz odbiorcę z listy.')),
      );
      return;
    }
    if (_lines.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Dodaj pozycje ze skanera')));
      return;
    }
    setState(() => _saving = true);
    try {
      final items = _lines
          .map((l) => {'product_id': l.product.id, 'quantity': l.quantity})
          .toList();
      final doc = await widget.api.createRw(
        fromLocationId: _fromLocationId!,
        recipientId: _recipientId!,
        items: items,
      );
      if (_autoToTasks) {
        await widget.api.confirmDocument(doc.id);
      }
      if (!mounted) return;
      setState(() {
        _lines.clear();
        _fromLocationId = null;
        _recipientId = null;
      });
      await _loadDocs();
      widget.syncBus.publish();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _autoToTasks
                ? 'RW ${doc.number} — zatwierdzono, zadania uruchomione (jak na webie).'
                : 'Utworzono RW: ${doc.number} (szkic).',
          ),
        ),
      );
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async {
        await Future.wait([_loadDocs(), _loadDicts()]);
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Wydanie RW (wysyłka)',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          const Text(
            'Kroki: 1) Lokalizacja pobrania  2) Odbiorca  3) Pozycje  4) Utwórz RW.',
            style: TextStyle(fontSize: 13),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Od razu zatwierdź'),
            subtitle: const Text(
              'Ten sam krok co „Zatwierdź” na panelu webowym (RW → zadania).',
            ),
            value: _autoToTasks,
            onChanged: _saving ? null : (v) => setState(() => _autoToTasks = v),
          ),
          if (_dictLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_dictError != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                _dictError!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            )
          else ...[
            DropdownButtonFormField<int>(
              decoration: const InputDecoration(
                labelText: 'Lokalizacja pobrania',
                border: OutlineInputBorder(),
                helperText: 'Musi mieć stan przy zatwierdzaniu RW',
              ),
              isExpanded: true,
              initialValue: _fromLocationId,
              items: _locations
                  .map(
                    (l) => DropdownMenuItem(
                      value: l.id,
                      child: Text(
                        '${l.code} (${l.type})',
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  )
                  .toList(),
              onChanged: _saving
                  ? null
                  : (v) => setState(() => _fromLocationId = v),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<int>(
              decoration: const InputDecoration(
                labelText: 'Odbiorca',
                border: OutlineInputBorder(),
              ),
              isExpanded: true,
              initialValue: _recipientId,
              items: _recipients
                  .map(
                    (r) => DropdownMenuItem(
                      value: r.id,
                      child: Text(
                        '${r.code} — ${r.name}',
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  )
                  .toList(),
              onChanged: _saving
                  ? null
                  : (v) => setState(() => _recipientId = v),
            ),
            if (_recipients.isEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  'Brak odbiorców w API (migracja 0008 + seed / uprawnienie słowników).',
                  style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(context).colorScheme.error,
                  ),
                ),
              ),
          ],
          const SizedBox(height: 12),
          FilledButton.tonalIcon(
            onPressed: _saving ? null : _addLine,
            icon: const Icon(Icons.add_box_outlined),
            label: const Text('Dodaj towar (wpisz lub skan)'),
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
            onPressed: (_saving || _dictLoading || _dictError != null)
                ? null
                : _submit,
            child: _saving
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Utwórz dokument RW'),
          ),
          const SizedBox(height: 24),
          Text('Ostatnie RW', style: Theme.of(context).textTheme.titleMedium),
          if (_loadingList)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_listError != null)
            Text(
              _listError!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            )
          else if ((_recent ?? []).isEmpty)
            const Text('Brak dokumentów RW')
          else
            ...(_recent!.map(
              (d) => ListTile(
                leading: const Icon(Icons.local_shipping_outlined),
                title: Text(d.number),
                subtitle: Text(
                  '${documentStatusLabelPl(d.status)} · ${d.recipient ?? "—"}\n${d.relatedTasksLine}',
                ),
                trailing: d.status == 'DRAFT'
                    ? TextButton(
                        onPressed: () async {
                          try {
                            await widget.api.confirmDocument(d.id);
                            await _loadDocs();
                            if (!context.mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  'RW ${d.number} — zatwierdzono (zadania jak na webie)',
                                ),
                              ),
                            );
                          } on ApiException catch (e) {
                            if (!context.mounted) return;
                            ScaffoldMessenger.of(
                              context,
                            ).showSnackBar(SnackBar(content: Text(e.message)));
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
