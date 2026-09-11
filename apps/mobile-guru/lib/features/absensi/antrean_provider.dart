import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../../app.dart';
import '../../main.dart';
import 'absensi_repository.dart';

/// 1 paket antrean = 1 request bulk yang gagal terkirim (offline).
/// Disimpan di Hive agar selamat dari restart HP (docs/10).
class AntreanState {
  const AntreanState({this.pending = 0, this.info = ''});

  final int pending;
  final String info;
}

class AntreanNotifier extends StateNotifier<AntreanState> {
  AntreanNotifier(this.ref) : super(const AntreanState()) {
    _conn = Connectivity().onConnectivityChanged.listen((_) => sinkronkan());
    _muat();
  }

  final Ref ref;
  late final StreamSubscription<List<ConnectivityResult>> _conn;

  Box get _box => Hive.box(antreanBox);

  void _muat() {
    state = AntreanState(pending: _box.length);
  }

  /// Simpan paket ke antrean (dipanggil saat simpan gagal karena jaringan).
  Future<void> antre(Map<String, dynamic> paket) async {
    await _box.add(paket);
    state = AntreanState(pending: _box.length, info: 'Tersimpan offline.');
  }

  /// Kirim semua antrean berurutan. Sukses -> hapus; gagal -> berhenti,
  /// sisanya dicoba lagi saat online berikutnya.
  Future<void> sinkronkan() async {
    final api = ref.read(dioClientProvider);
    if (api == null || _box.isEmpty) {
      _muat();
      return;
    }
    final repo = AbsensiRepository(api);
    for (final key in _box.keys.toList()) {
      final p = Map<String, dynamic>.from(_box.get(key) as Map);
      try {
        await repo.simpanBulk(
          tanggal: p['tanggal'] as String,
          rombelId: p['rombelId'] as String,
          mapelId: p['mapelId'] as String,
          jamKe: p['jamKe'] as int,
          status: Map<String, String>.from(p['status'] as Map),
        );
        await _box.delete(key);
      } on DioException catch (e) {
        final code = e.response?.statusCode;
        if (code != null && code >= 400 && code < 500 && code != 401 && code != 408) {
          // 4xx non-auth = data ditolak server -> jangan antre selamanya
          await _box.delete(key);
          state = AntreanState(
            pending: _box.length,
            info: '1 paket ditolak server (data tidak valid).',
          );
          continue;
        }
        state = AntreanState(
          pending: _box.length,
          info: 'Masih offline — dicoba lagi otomatis.',
        );
        return;
      }
    }
    state = AntreanState(
      pending: 0,
      info: _box.isEmpty ? 'Semua tersinkron.' : '',
    );
  }

  @override
  void dispose() {
    _conn.cancel();
    super.dispose();
  }
}

final antreanProvider =
    StateNotifierProvider<AntreanNotifier, AntreanState>(
  (ref) => AntreanNotifier(ref),
);
