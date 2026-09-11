import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/auth/session.dart';

/// Login akun guru. Sukses -> /jadwal. Sudah login -> langsung /jadwal.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final email = TextEditingController(text: 'guru@sekolah.sch.id');
  final password = TextEditingController();

  @override
  void dispose() {
    email.dispose();
    password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final sesi = ref.watch(sessionProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Masuk — Guru')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: sesi.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => _form('Gagal: $e'),
          data: (d) {
            if (d.sudahMasuk) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (context.mounted) context.go('/jadwal');
              });
              return const Center(child: CircularProgressIndicator());
            }
            return _form(null);
          },
        ),
      ),
    );
  }

  Widget _form(String? info) {
    return Column(
      children: [
        TextField(controller: email, decoration: const InputDecoration(labelText: 'Email')),
        TextField(
          controller: password,
          obscureText: true,
          decoration: const InputDecoration(labelText: 'Password'),
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: () =>
              ref.read(sessionProvider.notifier).login(email.text, password.text),
          child: const Text('Masuk'),
        ),
        if (info != null) Text(info),
      ],
    );
  }
}
