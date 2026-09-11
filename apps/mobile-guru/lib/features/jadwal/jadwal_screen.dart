import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/auth/session.dart';
import '../absensi/antrean_provider.dart';
import 'jadwal_provider.dart';

/// Beranda guru: jadwal hari ini + tombol absen per kelas + badge antrean.
/// Mapel otomatis dari jadwal (guru tidak pilih manual).
class JadwalScreen extends ConsumerWidget {
  const JadwalScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final jadwal = ref.watch(jadwalHariIniProvider);
    final antre = ref.watch(antreanProvider);
    final sesi = ref.watch(sessionProvider).valueOrNull;

    return Scaffold(
      appBar: AppBar(
        title: Text('Jadwal — ${sesi?.email ?? ''}'),
        actions: [
          IconButton(
            tooltip: 'Keluar',
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(sessionProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: Column(
        children: [
          if (antre.pending > 0)
            ListTile(
              leading: const Icon(Icons.cloud_off, color: Colors.red),
              title: Text('Belum tersinkron (${antre.pending})'),
              trailing: FilledButton(
                onPressed: () =>
                    ref.read(antreanProvider.notifier).sinkronkan(),
                child: const Text('Sinkronkan'),
              ),
            ),
          Expanded(
            child: jadwal.when(
              loading: () =>
                  const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Gagal: $e')),
              data: (items) {
                if (items.isEmpty) {
                  return const Center(
                    child: Text('Tidak ada jadwal hari ini.'),
                  );
                }
                return ListView.builder(
                  itemCount: items.length,
                  itemBuilder: (_, i) {
                    final j = items[i];
                    return ListTile(
                      title: Text('${j.rombelNama} — ${j.mapelNama}'),
                      subtitle: Text('Jam ke-${j.jamKe}'),
                      trailing: FilledButton(
                        onPressed: () => context.push(
                          '/absensi',
                          extra: {
                            'rombelId': j.rombelId,
                            'rombelNama': j.rombelNama,
                            'mapelId': j.mapelId,
                            'mapelNama': j.mapelNama,
                            'jamKe': j.jamKe,
                          },
                        ),
                        child: const Text('Absen'),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/presensi'),
        label: const Text('Presensi'),
        icon: const Icon(Icons.face),
      ),
    );
  }
}
