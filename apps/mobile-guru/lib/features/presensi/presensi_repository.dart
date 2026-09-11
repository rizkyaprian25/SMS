import '../../core/api/dio_client.dart';

/// Hasil presensi dari server.
class PresensiHariIni {
  const PresensiHariIni({
    this.id,
    this.jamMasuk,
    this.jamPulang,
    this.metode,
    this.statusVerifikasi,
    this.terlambatMenit,
    this.diLuarArea = false,
  });

  factory PresensiHariIni.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const PresensiHariIni();
    return PresensiHariIni(
      id: json['id'] as String?,
      jamMasuk: json['jamMasuk'] as String?,
      jamPulang: json['jamPulang'] as String?,
      metode: json['metode'] as String?,
      statusVerifikasi: json['statusVerifikasi'] as String?,
      terlambatMenit: json['terlambatMenit'] as int?,
      diLuarArea: json['diLuarArea'] as bool? ?? false,
    );
  }

  final String? id;
  final String? jamMasuk;
  final String? jamPulang;
  final String? metode;
  final String? statusVerifikasi;
  final int? terlambatMenit;
  final bool diLuarArea;
}

/// Repository presensi guru: cek hari ini, masuk, pulang, fallback, enroll wajah.
abstract class PresensiRepository {
  Future<PresensiHariIni> hariIni();

  /// Presensi masuk via wajah (score + liveness + geo).
  Future<void> masuk({
    required double faceScore,
    required bool liveness,
    double? lat,
    double? lng,
  });

  /// Presensi pulang.
  Future<void> pulang();

  /// Fallback manual (alasan + foto bukti opsional).
  Future<void> fallback({
    required String alasan,
    double? lat,
    double? lng,
  });

  /// Enroll wajah (sekali, didampingi TU). Prod: embedding sudah terenkripsi di HP.
  Future<void> enroll({
    required String embedding,
    required bool consent,
  });

  /// Hapus template wajah (hak hapus UU PDP).
  Future<void> hapusWajah();
}

class DioPresensiRepository implements PresensiRepository {
  DioPresensiRepository(this.api);

  final DioClient api;

  @override
  Future<PresensiHariIni> hariIni() async {
    final res = await api.get('/absensi-guru/hari-ini');
    return PresensiHariIni.fromJson(res.data['data'] as Map<String, dynamic>?);
  }

  @override
  Future<void> masuk({
    required double faceScore,
    required bool liveness,
    double? lat,
    double? lng,
  }) async {
    await api.post('/absensi-guru/masuk', body: {
      'face_score': faceScore,
      'liveness': liveness,
      if (lat != null) 'lat': lat,
      if (lng != null) 'lng': lng,
    });
  }

  @override
  Future<void> pulang() async {
    await api.post('/absensi-guru/pulang');
  }

  @override
  Future<void> fallback({
    required String alasan,
    double? lat,
    double? lng,
  }) async {
    await api.post('/absensi-guru/fallback', body: {
      'alasan': alasan,
      if (lat != null) 'lat': lat,
      if (lng != null) 'lng': lng,
    });
  }

  @override
  Future<void> enroll({
    required String embedding,
    required bool consent,
  }) async {
    await api.put('/guru/me/face-enroll', body: {
      'embedding': embedding,
      'consent': consent,
    });
  }

  @override
  Future<void> hapusWajah() async {
    await api.delete('/guru/me/face');
  }
}