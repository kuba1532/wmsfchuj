import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../config.dart';
import '../services/session_store.dart';
import '../services/wms_api.dart';
import 'main_shell.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _login = TextEditingController();
  final _password = TextEditingController();
  final _apiBaseInput = TextEditingController();
  final _store = SessionStore();
  bool _loading = false;
  bool _savingUrl = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _apiBaseInput.text = kApiBase;
  }

  @override
  void dispose() {
    _login.dispose();
    _password.dispose();
    _apiBaseInput.dispose();
    super.dispose();
  }

  Future<void> _saveApiUrl() async {
    setState(() => _savingUrl = true);
    try {
      final normalized = normalizeWmsApiBase(_apiBaseInput.text);
      await _store.saveApiBase(normalized);
      setResolvedApiBase(normalized);
      if (!mounted) return;
      setState(() => _apiBaseInput.text = kApiBase);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Zapisano serwer: $kApiBase')),
      );
    } finally {
      if (mounted) setState(() => _savingUrl = false);
    }
  }

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final login = _login.text.trim();
    final pass = _password.text;
    try {
      final r = await WmsApi.login(login5: login, password: pass);
      await _store.saveTokens(access: r.access, refresh: r.refresh);
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => MainShell(
            accessToken: r.access,
            userName: '${r.user.firstName} ${r.user.lastName}',
            userId: r.user.id,
          ),
        ),
      );
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() {
        _error =
            'Brak połączenia z API ($kApiBase).\n\n'
            'Na iPhone wpisz poniżej adres komputera z backendem (np. http://192.168.0.10:8000), '
            'naciśnij „Zapisz adres”, potem spróbuj zalogować ponownie.\n\n'
            'Szczegóły: $e';
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 24),
              Text(
                'WMS — pracownik',
                style: Theme.of(context).textTheme.headlineSmall,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Aktywny serwer: $kApiBase',
                style: Theme.of(context).textTheme.bodySmall,
                textAlign: TextAlign.center,
              ),
              if (!kIsWeb &&
                  (kApiBase.contains('127.0.0.1') || kApiBase.toLowerCase().contains('localhost'))) ...[
                const SizedBox(height: 12),
                Text(
                  'Na prawdziwym telefonie 127.0.0.1 to ten telefon, nie Mac. Ustaw IP komputera poniżej.',
                  style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(context).colorScheme.error,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
              const SizedBox(height: 16),
              TextField(
                controller: _apiBaseInput,
                decoration: const InputDecoration(
                  labelText: 'Adres API (np. http://192.168.0.10:8000)',
                  hintText: 'http://IP_KOMPUTERA:8000',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                keyboardType: TextInputType.url,
                autocorrect: false,
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: _savingUrl ? null : _saveApiUrl,
                icon: _savingUrl
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.save_outlined, size: 20),
                label: const Text('Zapisz adres serwera'),
              ),
              const SizedBox(height: 28),
              TextField(
                controller: _login,
                decoration: const InputDecoration(
                  labelText: 'Kod logowania (5 cyfr)',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(5),
                ],
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _password,
                decoration: const InputDecoration(
                  labelText: 'Hasło',
                  border: OutlineInputBorder(),
                ),
                obscureText: true,
                onSubmitted: (_) => _submit(),
              ),
              if (_error != null) ...[
                const SizedBox(height: 16),
                Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ],
              const SizedBox(height: 32),
              FilledButton(
                onPressed: _loading ? null : _submit,
                child: _loading
                    ? const SizedBox(
                        height: 22,
                        width: 22,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Zaloguj'),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
