import 'package:flutter/material.dart';
import 'dart:async';

import '../models/models.dart';
import '../services/sync_bus.dart';
import '../services/wms_api.dart';
import '../widgets/code_entry_dialog.dart';

/// Podgląd stanów + test połączenia (GET /api/health, GET /stock).
class StockTab extends StatefulWidget {
  const StockTab({super.key, required this.api, required this.syncBus});

  final WmsApi api;
  final SyncBus syncBus;

  @override
  State<StockTab> createState() => _StockTabState();
}

class _StockTabState extends State<StockTab> {
  List<StockRow>? _rows;
  String? _healthLine;
  bool _loading = false;
  String? _error;
  final _manualCode = TextEditingController();
  Timer? _autoRefreshTimer;

  @override
  void initState() {
    super.initState();
    _refreshAll();
    widget.syncBus.addListener(_onSyncEvent);
    _autoRefreshTimer = Timer.periodic(const Duration(minutes: 2), (_) {
      if (!mounted || _loading) return;
      _refreshAll();
    });
  }

  @override
  void dispose() {
    widget.syncBus.removeListener(_onSyncEvent);
    _autoRefreshTimer?.cancel();
    _manualCode.dispose();
    super.dispose();
  }

  void _onSyncEvent() {
    if (!mounted || _loading) return;
    _refreshAll();
  }

  Future<void> _reservePart(StockRow row) async {
    final c = TextEditingController(text: '0.5');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Rezerwacja ilości (BLOCKED)'),
        content: TextField(
          controller: c,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(labelText: 'Ilość do zablokowania'),
          autofocus: true,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Anuluj')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Zablokuj')),
        ],
      ),
    );
    if (ok != true) return;
    final qty = double.tryParse(c.text.replaceAll(',', '.'));
    if (qty == null || qty <= 0) return;
    try {
      await widget.api.changeStockStatus(
        stockId: row.id,
        status: 'BLOCKED',
        version: row.version,
        quantity: qty,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Ilość została zarezerwowana.')));
      await _refreshAll();
      widget.syncBus.publish();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  Future<void> _refreshAll() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final h = await pingBackendHealth();
      setState(() {
        _healthLine = h.ok
            ? 'Backend: OK · DB: ${h.database ?? "?"} · wersja ${h.version ?? "?"}'
            : 'Backend: brak odpowiedzi (sprawdź URL i czy uvicorn działa)';
      });
      final rows = await widget.api.fetchStock(pageSize: 40);
      setState(() => _rows = rows);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _applyProductSearch(String raw) async {
    final code = raw.trim();
    if (code.isEmpty) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final products = await widget.api.searchProducts(code);
      if (!mounted) return;
      if (products.isEmpty) {
        setState(() {
          _loading = false;
          _rows = [];
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Brak produktu dla kodu: $code')),
        );
        return;
      }
      final name = products.first.name;
      final rows = await widget.api.fetchStock(search: name.length > 40 ? name.substring(0, 40) : name);
      setState(() {
        _rows = rows;
        _loading = false;
      });
    } on ApiException catch (e) {
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  Future<void> _pickCodeAndSearch() async {
    final code = await askCode(
      context,
      title: 'Szukaj stanu po towarze',
      label: 'EAN lub SKU',
      hint: 'Wpisz kod albo Skanuj.',
    );
    if (code == null || !mounted) return;
    await _applyProductSearch(code);
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _refreshAll,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Stan magazynowy', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          if (_healthLine != null)
            Card(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Text(_healthLine!, style: const TextStyle(fontSize: 13)),
              ),
            ),
          const SizedBox(height: 12),
          TextField(
            controller: _manualCode,
            decoration: InputDecoration(
              labelText: 'EAN / SKU (wpisz ręcznie)',
              border: const OutlineInputBorder(),
              suffixIcon: IconButton(
                tooltip: 'Szukaj',
                onPressed: _loading ? null : () => _applyProductSearch(_manualCode.text),
                icon: const Icon(Icons.search),
              ),
            ),
            textCapitalization: TextCapitalization.none,
            onSubmitted: _loading ? null : (v) => _applyProductSearch(v),
          ),
          const SizedBox(height: 8),
          FilledButton.tonalIcon(
            onPressed: _loading ? null : _pickCodeAndSearch,
            icon: const Icon(Icons.edit_note),
            label: const Text('Okno: wpisz kod lub Skanuj'),
          ),
          const SizedBox(height: 8),
          FilledButton.tonal(
            onPressed: _loading ? null : _refreshAll,
            child: const Text('Pełna lista (pierwsza strona)'),
          ),
          const SizedBox(height: 16),
          if (_loading) const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator())),
          if (_error != null)
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          if (!_loading && _error == null && (_rows ?? []).isEmpty)
            const Text('Brak wierszy — dodaj przyjęcia PZ lub stany w systemie.'),
          if (!_loading && _error == null)
            ...(_rows ?? []).map(
              (r) => ListTile(
                dense: true,
                leading: const Icon(Icons.inventory),
                title: Text(r.productName ?? 'Produkt #${r.id}'),
                subtitle: Text('${r.locationCode ?? "?"} · ilość ${r.quantity} · ${r.status}'),
                trailing: r.status == 'AVAILABLE'
                    ? TextButton(
                        onPressed: _loading ? null : () => _reservePart(r),
                        child: const Text('Rezerwuj'),
                      )
                    : null,
              ),
            ),
        ],
      ),
    );
  }
}
