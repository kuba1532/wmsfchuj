import 'package:flutter/material.dart';
import 'dart:async';

import '../models/models.dart';
import '../services/session_store.dart';
import '../services/sync_bus.dart';
import '../services/wms_api.dart';
import '../widgets/product_picker_dialog.dart';

/// Wydanie RW (rozchód) — scenariusz „pakowanie / wysyłka”: odbiorca + towary ze skanu.
class RwTab extends StatefulWidget {
  const RwTab({super.key, required this.api, required this.syncBus});

  final WmsApi api;
  final SyncBus syncBus;

  @override
  State<RwTab> createState() => _RwTabState();
}

class _RwTabState extends State<RwTab> {
  final _recipient = TextEditingController();
  final List<PzLineDraft> _lines = [];
  List<DocumentHeader>? _recent;
  bool _loadingList = true;
  bool _saving = false;
  String? _listError;
  bool _autoToTasks = true;
  List<String> _recentRecipients = [];
  final _store = SessionStore();
  Timer? _autoRefreshTimer;

  @override
  void initState() {
    super.initState();
    _loadDocs();
    _loadRecipients();
    _autoRefreshTimer = Timer.periodic(const Duration(minutes: 3), (_) {
      if (!mounted || _loadingList || _saving) return;
      _loadDocs();
    });
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    _recipient.dispose();
    super.dispose();
  }

  Future<void> _loadRecipients() async {
    final list = await _store.readRecentRecipients();
    if (!mounted) return;
    setState(() => _recentRecipients = list);
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
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
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
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Anuluj')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('OK')),
        ],
      ),
    );
    if (ok != true) return null;
    return double.tryParse(c.text.replaceAll(',', '.'));
  }

  Future<void> _submit() async {
    final r = _recipient.text.trim();
    if (r.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Podaj odbiorcę / zamówienie')),
      );
      return;
    }
    if (_lines.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Dodaj pozycje ze skanera')),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      final items = _lines.map((l) => {'product_id': l.product.id, 'quantity': l.quantity}).toList();
      final doc = await widget.api.createRw(recipient: r, items: items);
      if (_autoToTasks) {
        await widget.api.submitToTasks(doc.id);
      }
      if (!mounted) return;
      await _store.saveRecentRecipient(r);
      setState(() {
        _lines.clear();
        _recipient.clear();
      });
      await _loadRecipients();
      await _loadDocs();
      widget.syncBus.publish();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _autoToTasks
                ? 'RW ${doc.number} przekazane do zadań (status: W TRAKCIE).'
                : 'Utworzono RW: ${doc.number} (szkic).',
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
          Text('Wydanie RW (wysyłka)', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          const Text('Kroki: 1) Odbiorca  2) Pozycje  3) Utwórz RW.', style: TextStyle(fontSize: 13)),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Od razu przekaż do zadań'),
            subtitle: const Text('Rekomendowane na pokaz: jeden klik tworzy RW i zadania'),
            value: _autoToTasks,
            onChanged: _saving ? null : (v) => setState(() => _autoToTasks = v),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _recipient,
            decoration: const InputDecoration(
              labelText: 'Odbiorca / ref. zamówienia',
              border: OutlineInputBorder(),
            ),
          ),
          if (_recentRecipients.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _recentRecipients
                  .map(
                    (r) => ActionChip(
                      label: Text(r),
                      onPressed: () => setState(() => _recipient.text = r),
                    ),
                  )
                  .toList(),
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
            onPressed: _saving ? null : _submit,
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
            Text(_listError!, style: TextStyle(color: Theme.of(context).colorScheme.error))
          else if ((_recent ?? []).isEmpty)
            const Text('Brak dokumentów RW')
          else
            ...(_recent!.map(
              (d) => ListTile(
                leading: const Icon(Icons.local_shipping_outlined),
                title: Text(d.number),
                subtitle: Text('${d.status} · ${d.recipient ?? "—"}'),
                trailing: d.status == 'DRAFT'
                    ? TextButton(
                        onPressed: () async {
                          try {
                            await widget.api.submitToTasks(d.id);
                            await _loadDocs();
                            if (!mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('RW ${d.number} przekazane do zadań')),
                            );
                          } on ApiException catch (e) {
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text(e.message)),
                              );
                            }
                          }
                        },
                        child: const Text('Do zadań'),
                      )
                    : null,
              ),
            )),
        ],
      ),
    );
  }
}
