import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../app.dart';
import 'presensi_repository.dart';

final presensiRepositoryProvider = Provider<PresensiRepository>((ref) {
  final api = ref.watch(dioClientProvider);
  if (api == null) throw StateError('DioClient belum siap');
  return DioPresensiRepository(api);
});

/// Status presensi hari ini (refresh otomatis saat dibuka).
final presensiHariIniProvider = FutureProvider.autoDispose<PresensiHariIni>((ref) =>
    ref.watch(presensiRepositoryProvider).hariIni());