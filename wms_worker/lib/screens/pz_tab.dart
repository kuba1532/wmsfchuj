import 'package:flutter/material.dart';

import '../models/models.dart';
import '../services/wms_api.dart';
import '../widgets/barcode_scanner_page.dart';

class PzTab extends StatefulWidget {
  const PzTab({super.key, required this.api});

  final WmsApi api;

  @override
  State<PzTab> createState() => _PzTabState();
}

class _PzTabState extends State<PzTab> {
  final _supplier = TextEditingController();
  final List<PzLineDraft> _lines = [];
  List<DocumentHeader>? _recent;
  bool _loadingList = true;
  bool _saving = false;
  String? _listError;

  @override
  void initState() {
    super.initState();
    _loadDocs();
  }

  @override
  void dispose() {
    _supplier.dispose();
    super.dispose();
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

  Future<void> _scanAndAddLine() async {
    final code = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const BarcodeScannerPage()),
    );
    if (code == null || !mounted) return;

    try {
      final products = await widget.api.searchProducts(code.trim());
      if (products.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Brak produktu dla: $code')),
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
    final sup = _supplier.text.trim();
    if (sup.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Podaj dostawcę')),
      );
      return;
    }
    if (_lines.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Dodaj przynajmniej jedną pozycję (skaner)')),
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
      final doc = await widget.api.createPz(supplier: sup, items: items);
      if (!mounted) return;
      setState(() {
        _lines.clear();
        _supplier.clear();
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

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _loadDocs,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Nowe przyjęcie PZ', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          TextField(
            controller: _supplier,
            decoration: const InputDecoration(
              labelText: 'Dostawca',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerLeft,
            child: FilledButton.tonalIcon(
              onPressed: _saving ? null : _scanAndAddLine,
              icon: const Icon(Icons.qr_code_scanner),
              label: const Text('Skanuj EAN / SKU'),
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
                subtitle: Text('${d.status} · ${d.supplier ?? "—"}'),
              ),
            )),
        ],
      ),
    );
  }
}
