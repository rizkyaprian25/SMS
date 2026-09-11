import '../../core/api/dio_client.dart';
import '../../core/api/page.dart';

class Nilai {
  const Nilai({
    required this.id,
    required this.siswaId,
    required this.siswaNama,
    required this.mapelId,
    required this.mapelNama,
    required this.jenis,
    required this.nilai,
    required this.semester,
  });

  final String id;
  final String siswaId;
  final String siswaNama;
  final String mapelId;
  final String mapelNama;
  final String jenis;
  final double nilai;
  final String semester;

  factory Nilai.fromJson(Map<String, dynamic> json) {
    final siswa = json['siswa'] as Map<String, dynamic>? ?? {};
    final mapel = json['mapel'] as Map<String, dynamic>? ?? {};
    return Nilai(
      id: json['id'] as String,
      siswaId: siswa['id'] as String? ?? json['siswaId'] as String? ?? '',
      siswaNama: siswa['nama'] as String? ?? '',
      mapelId: mapel['id'] as String? ?? json['mapelId'] as String? ?? '',
      mapelNama: mapel['nama'] as String? ?? '',
      jenis: json['jenis'] as String? ?? '',
      nilai: (json['nilai'] as num?)?.toDouble() ?? 0.0,
      semester: json['semester'] as String? ?? '',
    );
  }
}

abstract class NilaiRepository {
  Future<Page<Nilai>> list({
    String? rombelId,
    String? mapelId,
    String? semester,
    String? jenis,
  });

  Future<void> simpanBulk({
    required String mapelId,
    required String tahunAjaranId,
    required String semester,
    required String jenis,
    required Map<String, double> nilai,
  });
}

class DioNilaiRepository implements NilaiRepository {
  DioNilaiRepository(this.api);

  final DioClient api;

  @override
  Future<Page<Nilai>> list({
    String? rombelId,
    String? mapelId,
    String? semester,
    String? jenis,
  }) async {
    final res = await api.get(
      '/nilai',
      query: {
        if (rombelId != null) 'rombelId': rombelId,
        if (mapelId != null) 'mapelId': mapelId,
        if (semester != null) 'semester': semester,
        if (jenis != null) 'jenis': jenis,
        'limit': 100,
      },
    );
    return Page<Nilai>.fromJson(
      res.data as Map<String, dynamic>,
      Nilai.fromJson,
    );
  }

  @override
  Future<void> simpanBulk({
    required String mapelId,
    required String tahunAjaranId,
    required String semester,
    required String jenis,
    required Map<String, double> nilai,
  }) async {
    await api.post('/nilai/bulk', body: {
      'mapel_id': mapelId,
      'tahun_ajaran_id': tahunAjaranId,
      'semester': semester,
      'jenis': jenis,
      'items': [
        for (final e in nilai.entries)
          {'siswa_id': e.key, 'nilai': e.value},
      ],
    });
  }
}