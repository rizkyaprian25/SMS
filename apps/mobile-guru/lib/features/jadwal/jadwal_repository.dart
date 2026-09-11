import '../../core/api/dio_client.dart';

/// 1 jadwal mengajar guru login (GET /jadwal-saya).
class Jadwal {
  const Jadwal({
    required this.id,
    required this.hari,
    required this.jamKe,
    required this.rombelId,
    required this.rombelNama,
    required this.mapelId,
    required this.mapelNama,
  });

  factory Jadwal.fromJson(Map<String, dynamic> json) {
    final rombel = json['rombel'] as Map<String, dynamic>? ?? {};
    final mapel = json['mapel'] as Map<String, dynamic>? ?? {};
    return Jadwal(
      id: json['id'] as String,
      hari: json['hari'] as String? ?? '',
      jamKe: json['jamKe'] as int? ?? 1,
      rombelId: (rombel['id'] ?? json['rombelId']) as String,
      rombelNama: rombel['nama'] as String? ?? '',
      mapelId: (mapel['id'] ?? json['mapelId']) as String,
      mapelNama: mapel['nama'] as String? ?? '',
    );
  }

  final String id;
  final String hari;
  final int jamKe;
  final String rombelId;
  final String rombelNama;
  final String mapelId;
  final String mapelNama;
}

abstract class JadwalRepository {
  Future<List<Jadwal>> hariIni();
}

const _hari = {
  1: 'SENIN',
  2: 'SELASA',
  3: 'RABU',
  4: 'KAMIS',
  5: 'JUMAT',
  6: 'SABTU',
};

class DioJadwalRepository implements JadwalRepository {
  DioJadwalRepository(this.api);

  final DioClient api;

  @override
  Future<List<Jadwal>> hariIni() async {
    final hari = _hari[DateTime.now().weekday];
    final res = await api.get(
      '/jadwal-saya',
      query: {if (hari != null) 'hari': hari},
    );
    final items = (res.data as Map<String, dynamic>)['data'] as List? ?? [];
    return items
        .map((e) => Jadwal.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
