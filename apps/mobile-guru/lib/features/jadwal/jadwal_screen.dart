import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Jadwal saya hari ini — dari GET /jadwal-saya?hari=. Lihat docs/05.
class JadwalScreen extends StatelessWidget {
  const JadwalScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Jadwal Hari Ini')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('TODO: ambil /jadwal-saya, tampilkan per jam + tombol Absen.'),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: () => context.push('/absensi'),
            child: const Text('Absen Kelas 7A — Informatika (contoh)'),
          ),
          OutlinedButton(
            onPressed: () => context.push('/presensi'),
            child: const Text('Presensi Masuk/Pulang'),
          ),
        ],
      ),
    );
  }
}
