import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../app.dart';
import '../../core/api/page.dart';
import 'rombel_repository.dart';

/// Provider repository + list rombel. Screen cukup `ref.watch(rombelListProvider)`.
final rombelRepositoryProvider = Provider<RombelRepository>((ref) {
  final api = ref.watch(dioClientProvider);
  if (api == null) throw StateError('DioClient belum siap');
  return DioRombelRepository(api);
});

final rombelListProvider =
    FutureProvider.autoDispose.family<Page<Rombel>, ({String? tahunAjaranId, String? tingkatId})>(
  (ref, args) => ref
      .watch(rombelRepositoryProvider)
      .list(tahunAjaranId: args.tahunAjaranId, tingkatId: args.tingkatId),
);
