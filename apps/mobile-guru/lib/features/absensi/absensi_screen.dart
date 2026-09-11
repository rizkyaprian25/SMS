import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app.dart';
import 'absensi_repository.dart';
import 'antrean_provider.dart';

const _opsi = ['HADIR', 'IZIN', 'SAKIT', 'ALPA'];

/// Layar inti MVP: daftar siswa -> Tandai Semua Hadir -> ubah yg tidak
/// hadir -> Simpan (1 request bulk). Offline -> antre Hive + badge.
class AbsensiScreen extends ConsumerStatefulWidget {
  const AbsensiScreen({
    super.key,
    required this.rombelId,
    required this.rombelNama,
    required this.mapelId,
    required this.mapelNama,
    required this.jamKe,
  });

  final String rombelId;
  final String rombelNama;
  final String mapelId;
  final String mapelNama;
  final int jamKe;

  @override
  ConsumerState<AbsensiScreen> createState() => _AbsensiScreenState();
}

class _AbsensiScreenState extends ConsumerState<AbsensiScreen> {
  late final String tanggal =
      DateTime.now().toIso8601String().substring(0, 10);
  final Map<String, String> nama = {};
  final Map<String, String> status = {};
  String info = '';
  bool memuat = true;

  @override
  void initState() {
    super.initState();
    _muat();
  }

  Future<void> _muat() async {
    final api = ref.read(dioClientProvider);
    if (api == null) return;
    try {
      final d = await AbsensiRepository(api).daftar(widget.rombelId, tanggal);
      if (!mounted) return;
      setState(() {
        for (final s in d.siswa) {
          nama[s.id] = s.nama;
          status[s.id] = d.sudah[s.id] ?? 'HADIR';
        }
        memuat = false;
      });
    } on DioException catch (e) {
      if (!mounted) return;
      setState(() {
        memuat = false;
        info = 'Gagal memuat: ${e.message}';
      });
    }
  }

  Future<void> _simpan() async {
    final api = ref.read(dioClientProvider);
    if (api == null || status.isEmpty) return;
    setState(() => info = 'Menyimpan…');
    final paket = {
      'tanggal': tanggal,
      'rombelId': widget.rombelId,
      'mapelId': widget.mapelId,
      'jamKe': widget.jamKe,
      'status': Map<String, String>.from(status),
    };
    try {
      await AbsensiRepository(api).simpanBulk(
        tanggal: tanggal,
        rombelId: widget.rombelId,
        mapelId: widget.mapelId,
        jamKe: widget.jamKe,
        status: status,
      );
      if (!mounted) return;
      context.pop();
    } on DioException catch (e) {
      // Gagal jaringan -> antre offline, badge + retry di jadwal
      if (e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.connectionTimeout ||
          e.response == null) {
        await ref.read(antreanProvider.notifier).antre(paket);
        if (!mounted) return;
        context.pop();
      } else {
        if (!mounted) return;
        setState(() => info = 'Ditolak server: ${e.response?.data}');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final ids = status.keys.toList();
    return Scaffold(
      appBar: AppBar(
        title: Text('${widget.rombelNama} — ${widget.mapelNama}'),
        actions: [
          TextButton(
            onPressed: () =>
                setState(() => status.updateAll((_, __) => 'HADIR')),
            child: const Text(
              'Semua Hadir',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
      body: memuat
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                if (info.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.all(8),
                    child: Text(info),
                  ),
                Expanded(
                  child: ListView.builder(
                    itemCount: ids.length,
                    itemBuilder: (_, i) {
                      final id = ids[i];
                      return ListTile(
                        title: Text(nama[id] ?? id),
                        trailing: DropdownButton<String>(
                          value: status[id],
                          items: [
                            for (final o in _opsi)
                              DropdownMenuItem(value: o, child: Text(o)),
                          ],
                          onChanged: (v) =>
                              setState(() => status[id] = v ?? 'HADIR'),
                        ),
                      );
                    },
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: FilledButton(
                    onPressed: _simpan,
                    child: Text('Simpan (${ids.length} siswa)'),
                  ),
                ),
              ],
            ),
    );
  }
}
