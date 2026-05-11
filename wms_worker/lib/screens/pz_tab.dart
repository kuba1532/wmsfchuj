import 'package:flutter/material.dart';

import '../models/models.dart';
import '../util/document_labels.dart';
import '../util/task_playbook.dart';
import '../services/sync_bus.dart';
import '../services/wms_api.dart';
import '../widgets/product_picker_dialog.dart';

class PzTab extends StatefulWidget {
  const PzTab({super.key, required this.api, required this.syncBus});

  final WmsApi api;
  final SyncBus syncBus;

  @override
  State<PzTab> createState() => _PzTabState();
}

class _PzTabState extends State<PzTab> {
  final List<PzLineDraft> _lines = [];
  List<Supplier> _suppliers = [];
  List<LocationItem> _locations = [];
  int? _supplierId;
  int? _targetLocationId;
  List<DocumentHeader>? _recent;
  bool _loadingList = true;
  bool _loadingSuppliers = true;
  bool _saving = false;
  String? _listError;

  @override
  void initState() {
    super.initState();
    _loadDocs();
    _loadSuppliers();
    _loadLocations();
  }

  Future<void> _loadSuppliers() async {
    setState(() => _loadingSuppliers = true);
    try {
      final s = await widget.api.listSuppliers();
      if (mounted) setState(() => _suppliers = s);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Nie udało się pobrać listy dostawców.')),
        );
      }
    } finally {
      if (mounted) setState(() => _loadingSuppliers = false);
    }
  }

  Future<void> _loadLocations() async {
    try {
      final locs = await widget.api.fetchLocations();
      if (!mounted) return;
      setState(() {
        _locations = locs.where((l) => l.type != 'BUFFER').toList()
          ..sort((a, b) => a.code.compareTo(b.code));
      });
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Nie udało się pobrać lokalizacji magazynowych.')),
        );
      }
    }
  }

  Future<void> _loadDocs() async {
    setState(() {
      _loadingList = true;
      _listError = null;
    });
    try {
      final d = await widget.api.listDocumentsPz();
      setState(() => _recent = d);
    } on ApiException catch (e) {
      setState(() => _listError = e.message);
    } catch (e) {
      setState(() => _listError = '$e');
    } finally {
      if (mounted) setState(() => _loadingList = false);
    }
  }

  Future<void> _addProductLine() async {
    if (_supplierId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Najpierw wybierz dostawcę z listy')),
      );
      return;
    }
    try {
      final product = await pickProductFromCatalog(
        context,
        api: widget.api,
        title: 'Wybierz towar na PZ',
        supplierId: _supplierId,
      );
      if (product == null || !mounted) return;

      final qty = await _askQuantity();
      if (qty == null || !mounted) return;

      setState(() => _lines.add(PzLineDraft(product: product, quantity: qty)));
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
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

  Future<void> _submitPz() async {
    if (_supplierId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Wybierz dostawcę')),
      );
      return;
    }
    if (_lines.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Dodaj przynajmniej jedną pozycję (EAN/SKU)')),
      );
      return;
    }
    if (_targetLocationId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Wybierz lokalizację przyjęcia')),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      final items = _lines
          .map(
            (l) => {
              'product_id': l.product.id,
              'quantity': l.quantity,
            },
          )
          .toList();
      final doc = await widget.api.createPz(
        supplierId: _supplierId!,
        toLocationId: _targetLocationId!,
        items: items,
      );
      if (!mounted) return;
      setState(() {
        _lines.clear();
      });
      await _loadDocs();
      widget.syncBus.publish();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Utworzono PZ: ${doc.number}')),
      );
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pzComplete(DocumentHeader d) async {
    try {
      await widget.api.pzComplete(d.id);
      await _loadDocs();
      widget.syncBus.publish();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Zarejestrowano ${d.number} — stan zwiększony na wskazanej lokalizacji')),
        );
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async {
        await _loadDocs();
        await _loadSuppliers();
        await _loadLocations();
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Nowe przyjęcie PZ', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          Text(
            'Wybierz dostawcę i lokalizację przyjęcia — po rejestracji PZ stan zwiększa się bezpośrednio na tej lokalizacji. '
            'Przykład demo: dostawca z seeda i SKU „DEMO-001”, „DEMO-002”.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 12),
          if (_loadingSuppliers)
            const LinearProgressIndicator()
          else
            DropdownButtonFormField<int>(
              decoration: const InputDecoration(
                labelText: 'Dostawca',
                border: OutlineInputBorder(),
              ),
              isExpanded: true,
              value: _supplierId, // ignore: deprecated_member_use
              hint: const Text('Wybierz dostawcę'),
              items: _suppliers
                  .map(
                    (s) => DropdownMenuItem(
                      value: s.id,
                      child: Text('${s.code} — ${s.name}', overflow: TextOverflow.ellipsis),
                    ),
                  )
                  .toList(),
              onChanged: (v) => setState(() {
                _supplierId = v;
                _lines.clear();
              }),
            ),
          const SizedBox(height: 12),
          DropdownButtonFormField<int>(
            decoration: const InputDecoration(
              labelText: 'Lokalizacja przyjęcia',
              border: OutlineInputBorder(),
            ),
            isExpanded: true,
            // ignore: deprecated_member_use
            value: _targetLocationId,
            hint: const Text('Wybierz lokalizację magazynową'),
            items: _locations
                .map(
                  (loc) => DropdownMenuItem(
                    value: loc.id,
                    child: Text('${loc.code} — ${loc.type}', overflow: TextOverflow.ellipsis),
                  ),
                )
                .toList(),
            onChanged: (v) => setState(() => _targetLocationId = v),
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerLeft,
            child: FilledButton.tonalIcon(
              onPressed: _saving ? null : _addProductLine,
              icon: const Icon(Icons.add_box_outlined),
              label: const Text('Dodaj pozycję (wpisz lub skan)'),
            ),
          ),
          const SizedBox(height: 8),
          ..._lines.map(
            (l) => ListTile(
              title: Text(l.product.name),
              subtitle: Text(
                '${l.product.sku} · ${l.quantity} ${l.product.unit}',
              ),
              trailing: IconButton(
                icon: const Icon(Icons.delete_outline),
                onPressed: () => setState(() => _lines.remove(l)),
              ),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _saving ? null : _submitPz,
            child: _saving
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Utwórz dokument PZ'),
          ),
          const SizedBox(height: 32),
          Text('Ostatnie PZ', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          if (_loadingList)
            const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
          else if (_listError != null)
            Text(_listError!, style: TextStyle(color: Theme.of(context).colorScheme.error))
          else if ((_recent ?? []).isEmpty)
            const Text('Brak dokumentów')
          else
            ...(_recent!.map(
              (d) => ListTile(
                leading: const Icon(Icons.description_outlined),
                title: Text(d.number),
                subtitle: Text(
                  '${documentStatusLabelPl(d.status)} · ${d.supplier ?? "—"}\n${d.relatedTasksLine}',
                ),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (d.status == 'DRAFT')
                      FilledButton(
                        onPressed: () => _pzComplete(d),
                        child: const Text('Zarejestruj'),
                      ),
                  ],
                ),
              ),
            )),
        ],
      ),
    );
  }
}
