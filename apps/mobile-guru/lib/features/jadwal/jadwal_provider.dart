import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../app.dart';
import 'jadwal_repository.dart';

final jadwalRepositoryProvider = Provider<JadwalRepository>((ref) {
  final api = ref.watch(dioClientProvider);
  if (api == null) throw StateError('DioClient belum siap');
  return DioJadwalRepository(api);
});

/// Jadwal mengajar hari ini. Refresh otomatis tiap dibuka.
final jadwalHariIniProvider = FutureProvider.autoDispose<List<Jadwal>>(
  (ref) => ref.watch(jadwalRepositoryProvider).hariIni(),
);
