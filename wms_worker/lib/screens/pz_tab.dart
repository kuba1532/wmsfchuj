import 'package:flutter/material.dart';

import '../models/models.dart';
import '../services/wms_api.dart';
import '../widgets/code_entry_dialog.dart';

class PzTab extends StatefulWidget {
  const PzTab({super.key, required this.api});

  final WmsApi api;

  @override
  State<PzTab> createState() => _PzTabState();
}

class _PzTabState extends State<PzTab> {
  final List<PzLineDraft> _lines = [];
  List<Supplier> _suppliers = [];
  int? _supplierId;
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
    final code = await askCode(
      context,
      title: 'Towar na PZ',
      label: 'EAN lub SKU',
      hint: 'Wpisz kod ręcznie albo wybierz Skanuj.',
    );
    if (code == null || !mounted) return;

    try {
      final products = await widget.api.searchProducts(code.trim(), supplierId: _supplierId);
      if (products.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Brak produktu u tego dostawcy dla: $code')),
          );
        }
        return;
      }
      final product = products.length == 1 ? products.first : await _pickProduct(products);
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

  Future<Product?> _pickProduct(List<Product> products) async {
    return showModalBottomSheet<Product>(
      context: context,
      builder: (ctx) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: products
              .map(
                (p) => ListTile(
                  title: Text(p.name),
                  subtitle: Text('${p.sku}${p.ean != null ? " · EAN ${p.ean}" : ""}'),
                  onTap: () => Navigator.pop(ctx, p),
                ),
              )
              .toList(),
        ),
      ),
    );
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
      final doc = await widget.api.createPz(supplierId: _supplierId!, items: items);
      if (!mounted) return;
      setState(() {
        _lines.clear();
      });
      await _loadDocs();
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

  Future<void> _pzStart(DocumentHeader d) async {
    try {
      await widget.api.pzStart(d.id);
      await _loadDocs();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Rozpoczęto przyjęcie ${d.number}')),
        );
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  Future<void> _pzComplete(DocumentHeader d) async {
    try {
      await widget.api.pzComplete(d.id);
      await _loadDocs();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Zakończono ${d.number} — dodano zadania odłożenia')),
        );
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  String _statusPl(String s) {
    switch (s) {
      case 'DRAFT':
        return 'Nowy';
      case 'IN_PROGRESS':
        return 'W trakcie';
      case 'COMPLETED':
        return 'Zakończony';
      case 'CONFIRMED':
        return 'Zatwierdzony';
      default:
        return s;
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async {
        await _loadDocs();
        await _loadSuppliers();
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Nowe przyjęcie PZ', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          Text(
            'Wybierz dostawcę — wyszukiwanie towaru dotyczy tylko produktów przypisanych do niego w systemie. '
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
              subtitle: Text('${l.product.sku} · ${l.quantity} ${l.product.unit}'),
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
                subtitle: Text('${_statusPl(d.status)} · ${d.supplier ?? "—"}'),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (d.status == 'DRAFT')
                      TextButton(
                        onPressed: () => _pzStart(d),
                        child: const Text('Start'),
                      ),
                    if (d.status == 'IN_PROGRESS')
                      FilledButton(
                        onPressed: () => _pzComplete(d),
                        child: const Text('Koniec'),
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
