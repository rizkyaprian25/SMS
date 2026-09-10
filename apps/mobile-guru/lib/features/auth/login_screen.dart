import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app.dart';

final _tokenProvider = StateProvider<String?>((_) => null);

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final email = TextEditingController(text: 'guru@sekolah.sch.id');
  final password = TextEditingController();
  String status = '';

  Future<void> submit() async {
    setState(() => status = 'Memuat…');
    try {
      final res = await getApi().post('/auth/login', body: {
        'email': email.text,
        'password': password.text,
      });
      final token = res.data['data']?['accessToken'] as String?;
      ref.read(_tokenProvider.notifier).state = token;
      getApi().setToken(token);
      // TODO: simpan refresh di flutter_secure_storage + PUT /devices/token (FCM).
      if (!mounted) return;
      context.go('/jadwal');
    } catch (_) {
      setState(() => status = 'Login gagal. Cek backend & akun.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Masuk — Guru')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(controller: email, decoration: const InputDecoration(labelText: 'Email')),
            TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Password')),
            const SizedBox(height: 12),
            FilledButton(onPressed: submit, child: const Text('Masuk')),
            Text(status),
          ],
        ),
      ),
    );
  }
}
