import 'package:flutter/material.dart';

import '../models/models.dart';
import '../services/wms_api.dart';
import 'code_entry_dialog.dart';

Future<Product?> pickProductFromCatalog(
  BuildContext context, {
  required WmsApi api,
  required String title,
  int? supplierId,
}) {
  return showModalBottomSheet<Product>(
    context: context,
    isScrollControlled: true,
    builder: (ctx) => _ProductPickerSheet(
      api: api,
      title: title,
      supplierId: supplierId,
    ),
  );
}

class _ProductPickerSheet extends StatefulWidget {
  const _ProductPickerSheet({
    required this.api,
    required this.title,
    this.supplierId,
  });

  final WmsApi api;
  final String title;
  final int? supplierId;

  @override
  State<_ProductPickerSheet> createState() => _ProductPickerSheetState();
}

class _ProductPickerSheetState extends State<_ProductPickerSheet> {
  final _searchCtrl = TextEditingController();
  List<Product> _items = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load('');
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load(String query) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items = await widget.api.searchProducts(query.trim(), supplierId: widget.supplierId);
      if (!mounted) return;
      setState(() => _items = items);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final maxSheetHeight =
        (MediaQuery.sizeOf(context).height * 0.88 - bottomInset).clamp(200.0, 1200.0);

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 16,
          bottom: bottomInset + 16,
        ),
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: maxSheetHeight),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(widget.title, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              TextField(
                controller: _searchCtrl,
                decoration: const InputDecoration(
                  labelText: 'Szukaj po nazwie / SKU / EAN',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.search),
                ),
                onSubmitted: _load,
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  FilledButton.tonalIcon(
                    onPressed: _loading
                        ? null
                        : () async {
                            final code = await askCode(
                              context,
                              title: 'Szukaj towaru',
                              label: 'EAN lub SKU',
                              hint: 'Wpisz kod albo Skanuj.',
                            );
                            if (code == null || !mounted) return;
                            _searchCtrl.text = code;
                            await _load(code);
                          },
                    icon: const Icon(Icons.qr_code_scanner),
                    label: const Text('Skanuj kod'),
                  ),
                  TextButton.icon(
                    onPressed: _loading ? null : () => _load(_searchCtrl.text),
                    icon: const Icon(Icons.refresh),
                    label: const Text('Odśwież listę'),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Expanded(
                child: _loading
                    ? const Center(child: CircularProgressIndicator())
                    : _error != null
                        ? Center(child: Text(_error!))
                        : _items.isEmpty
                            ? Center(
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Text(
                                    widget.supplierId != null &&
                                            widget.supplierId! > 0 &&
                                            _searchCtrl.text.trim().isNotEmpty
                                        ? 'Brak produktu „${_searchCtrl.text.trim()}” w katalogu tego dostawcy.\n\n'
                                            'Na PZ lista jest filtrowana po dostawcy — wybierz innego lub '
                                            'powiąż SKU z dostawcą w panelu web (Produkty / dostawca). '
                                            'Kody z pliku barcodes: użyj SKU, które ma Northwind (np. PRD-0001), '
                                            'albo odśwież backend (uzupełnia powiązania SUP-001).'
                                        : 'Brak produktów dla podanych kryteriów',
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              )
                            : ListView.separated(
                                itemCount: _items.length,
                                separatorBuilder: (context, index) => const Divider(height: 1),
                                itemBuilder: (_, i) {
                                  final p = _items[i];
                                  return ListTile(
                                    title: Text(p.name),
                                    subtitle: Text('${p.sku}${p.ean != null ? " · EAN ${p.ean}" : ""}'),
                                    onTap: () => Navigator.pop(context, p),
                                  );
                                },
                              ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

