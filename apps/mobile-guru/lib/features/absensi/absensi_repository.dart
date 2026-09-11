import '../../core/api/dio_client.dart';

class SiswaAbsen {
  const SiswaAbsen({required this.id, required this.nama});

  factory SiswaAbsen.fromJson(Map<String, dynamic> json) =>
      SiswaAbsen(id: json['id'] as String, nama: json['nama'] as String);

  final String id;
  final String nama;
}

/// Repository absensi siswa: daftar + simpan bulk 1 request (docs/05).
class AbsensiRepository {
  AbsensiRepository(this.api);

  final DioClient api;

  /// Daftar siswa 1 rombel + status hari itu (agar tidak dobel input).
  Future<({List<SiswaAbsen> siswa, Map<String, String> sudah})> daftar(
    String rombelId,
    String tanggal,
  ) async {
    final res = await api.get(
      '/rombel/$rombelId/siswa',
      query: {'tanggal': tanggal},
    );
    final data = res.data['data'] as Map<String, dynamic>;
    final siswa = ((data['siswa'] as List? ?? [])
            .map((e) => SiswaAbsen.fromJson(e as Map<String, dynamic>)))
        .toList();
    final sudah = Map<String, String>.from(
      (data['absensi'] as Map? ?? {}).map(
        (k, v) => MapEntry(k.toString(), v.toString()),
      ),
    );
    return (siswa: siswa, sudah: sudah);
  }

  /// Simpan 1 kelas 1 mapel. Idempoten di server (aman di-retry).
  Future<void> simpanBulk({
    required String tanggal,
    required String rombelId,
    required String mapelId,
    required int jamKe,
    required Map<String, String> status,
    String? alasanOverride,
  }) async {
    await api.post('/absensi/bulk', body: {
      'tanggal': tanggal,
      'rombel_id': rombelId,
      'mapel_id': mapelId,
      'jam_ke': jamKe,
      if (alasanOverride != null) 'alasan_override': alasanOverride,
      'items': [
        for (final e in status.entries)
          {'siswa_id': e.key, 'status': e.value},
      ],
    });
  }
}
