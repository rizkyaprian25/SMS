import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../app.dart';
import '../../core/api/page.dart';
import 'nilai_repository.dart';

final nilaiRepositoryProvider = Provider<NilaiRepository>((ref) {
  final api = ref.watch(dioClientProvider);
  if (api == null) throw StateError('DioClient belum siap');
  return DioNilaiRepository(api);
});

/// Provider list nilai dengan filter. Dipakai layar nilai.
final nilaiListProvider = FutureProvider.autoDispose
    .family<Page<Nilai>, ({String? rombelId, String? mapelId, String? semester, String? jenis})>(
  (ref, args) => ref
      .watch(nilaiRepositoryProvider)
      .list(
        rombelId: args.rombelId,
        mapelId: args.mapelId,
        semester: args.semester,
        jenis: args.jenis,
      ),
);

/// Tahun ajaran aktif (untuk POST /nilai/bulk).
final tahunAjaranAktifProvider = FutureProvider.autoDispose<String?>((ref) async {
  final api = ref.watch(dioClientProvider);
  if (api == null) return null;
  final res = await api.get('/tahun-ajaran/aktif');
  return (res.data['data'] as Map<String, dynamic>?)?['id'] as String?;
});

/// Provider mapel (untuk dropdown mapel yang diampu guru).
final mapelDiampuProvider = FutureProvider.autoDispose<List<MapelRingkas>>((ref) async {
  final api = ref.watch(dioClientProvider);
  if (api == null) return [];
  final res = await api.get('/auth/me');
  final guru = (res.data['data'] as Map<String, dynamic>?)?['guru'] as Map<String, dynamic>?;
  final mapelDiampu = (guru?['mapelDiampu'] as List?) ?? [];
  return mapelDiampu
      .map((m) => MapelRingkas(
            id: m['mapel']?['id'] as String? ?? '',
            nama: m['mapel']?['nama'] as String? ?? '',
          ))
      .where((m) => m.id.isNotEmpty)
      .toList();
});

class MapelRingkas {
  const MapelRingkas({required this.id, required this.nama});
  final String id;
  final String nama;
}