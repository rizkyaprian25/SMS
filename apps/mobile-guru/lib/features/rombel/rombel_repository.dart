import '../../core/api/dio_client.dart';
import '../../core/api/page.dart';

/// Entity Rombel — contoh pola repository (skill sms-flutter-model).
/// Screen memakai [RombelRepository], tidak pernah memanggil Dio langsung.
class Rombel {
  const Rombel({
    required this.id,
    required this.nama,
    required this.kapasitas,
  });

  factory Rombel.fromJson(Map<String, dynamic> json) => Rombel(
        id: json['id'] as String,
        nama: json['nama'] as String,
        kapasitas: json['kapasitas'] as int? ?? 0,
      );

  final String id;
  final String nama;
  final int kapasitas;
}

abstract class RombelRepository {
  Future<Page<Rombel>> list({String? tahunAjaranId, String? tingkatId});
}

class DioRombelRepository implements RombelRepository {
  DioRombelRepository(this.api);

  final DioClient api;

  @override
  Future<Page<Rombel>> list({String? tahunAjaranId, String? tingkatId}) async {
    final res = await api.get(
      '/rombel',
      query: {
        if (tahunAjaranId != null) 'tahunAjaranId': tahunAjaranId,
        if (tingkatId != null) 'tingkatId': tingkatId,
      },
    );
    return Page<Rombel>.fromJson(
      res.data as Map<String, dynamic>,
      Rombel.fromJson,
    );
  }
}
