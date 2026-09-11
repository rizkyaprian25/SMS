import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app.dart';
import 'nilai_repository.dart';
import 'nilai_provider.dart';

const _jenisList = ['TUGAS', 'HARIAN', 'UTS', 'UAS', 'SUMATIF'];
const _semesterList = ['GANJIL', 'GENAP'];

/// Layar nilai: pilih mapel+semester+jenis -> daftar siswa dengan input angka 0-100 -> simpan bulk (1 request).
/// Mapel otomatis dari yang diampu guru (GET /auth/me).
class NilaiScreen extends ConsumerStatefulWidget {
  const NilaiScreen({super.key});

  @override
  ConsumerState<NilaiScreen> createState() => _NilaiScreenState();
}

class _NilaiScreenState extends ConsumerState<NilaiScreen> {
  String? _mapelId;
  String _semesterVal = 'GANJIL';
  String _jenisVal = 'HARIAN';
  String? _tahunAjaranId;
  final Map<String, double> _nilai = {};
  String _info = '';
  bool _memuat = true;

  @override
  void initState() {
    super.initState();
    _muat();
  }

  Future<void> _muat() async {
    setState(() => _memuat = true);
    try {
      final ta = await ref.read(tahunAjaranAktifProvider.future);
      if (!mounted) return;
      setState(() => _tahunAjaranId = ta);

      // Ambil mapel pertama sebagai default
      final mapel = await ref.read(mapelDiampuProvider.future);
      if (!mounted) return;
      if (mapel.isNotEmpty && _mapelId == null) {
        setState(() => _mapelId = mapel.first.id);
      }
      _memuat = false;
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _memuat = false;
        _info = 'Gagal memuat: $e';
      });
    }
  }

  Future<void> _simpan() async {
    if (_mapelId == null || _tahunAjaranId == null || _nilai.isEmpty) return;
    setState(() => _info = 'Menyimpan…');
    try {
      final api = ref.read(dioClientProvider);
      if (api == null) throw StateError('API belum siap');
      await DioNilaiRepository(api).simpanBulk(
        mapelId: _mapelId!,
        tahunAjaranId: _tahunAjaranId!,
        semester: _semesterVal,
        jenis: _jenisVal,
        nilai: _nilai,
      );
      if (!mounted) return;
      context.pop();
    } on DioException catch (e) {
      if (!mounted) return;
      setState(() => _info = 'Gagal: ${e.response?.data ?? e.message}');
    }
  }

  @override
  Widget build(BuildContext context) {
    final mapelAsync = ref.watch(mapelDiampuProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Input Nilai'),
        actions: [
          PopupMenuButton<String>(
            onSelected: (v) => setState(() => _jenisVal = v),
            itemBuilder: (_) => _jenisList
                .map((j) => PopupMenuItem(value: j, child: Text(j)))
                .toList(),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(_jenisVal, style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
      body: _memuat
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: [
                      // Mapel dropdown
                      mapelAsync.when(
                        loading: () => const Center(child: CircularProgressIndicator()),
                        error: (e, _) => Text('Gagal mapel: $e'),
                        data: (m) {
                          if (m.isEmpty) {
                            return const Text('Belum punya mapel diampu');
                          }
                          return DropdownButtonFormField<String>(
                            value: _mapelId,
                            items: m
                                .map((x) =>
                                    DropdownMenuItem(value: x.id, child: Text(x.nama)))
                                .toList(),
                            onChanged: (v) => setState(() => _mapelId = v),
                            decoration: const InputDecoration(labelText: 'Mapel'),
                          );
                        },
                      ),
                      const SizedBox(height: 8),
                      // Semester
                      DropdownButtonFormField<String>(
                        value: _semesterVal,
                        items: _semesterList
                            .map((s) =>
                                DropdownMenuItem(value: s, child: Text(s)))
                            .toList(),
                        onChanged: (v) => setState(() => _semesterVal = v ?? 'GANJIL'),
                        decoration: const InputDecoration(labelText: 'Semester'),
                      ),
                    ],
                  ),
                ),
                if (_info.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Text(_info),
                  ),
                Expanded(
                  child: _mapelId == null
                      ? const Center(child: Text('Pilih mapel dulu'))
                      : _DaftarNilai(
                          mapelId: _mapelId!,
                          semester: _semesterVal,
                          jenis: _jenisVal,
                          nilai: _nilai,
                          onChanged: (id, v) =>
                              setState(() => _nilai[id] = v),
                        ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: FilledButton(
                    onPressed: _simpan,
                    child: Text('Simpan (${_nilai.length} siswa)'),
                  ),
                ),
              ],
            ),
    );
  }
}

/// Daftar siswa dengan input nilai per baris (0-100).
class _DaftarNilai extends ConsumerWidget {
  const _DaftarNilai({
    required this.mapelId,
    required this.semester,
    required this.jenis,
    required this.nilai,
    required this.onChanged,
  });

  final String mapelId;
  final String semester;
  final String jenis;
  final Map<String, double> nilai;
  final void Function(String, double) onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final args = (rombelId: null, mapelId: mapelId, semester: semester, jenis: jenis);
    final q = ref.watch(nilaiListProvider(args));

    return q.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Gagal: $e')),
      data: (page) {
        final data = page.data;
        if (data.isEmpty) {
          return const Center(child: Text('Belum ada siswa di mapel ini'));
        }
        return ListView.builder(
          itemCount: data.length,
          itemBuilder: (_, i) {
            final n = data[i];
            final current = nilai[n.siswaId] ?? 0.0;
            return ListTile(
              title: Text(n.siswaNama),
              trailing: SizedBox(
                width: 80,
                child: TextFormField(
                  initialValue: current > 0 ? current.toStringAsFixed(2) : '',
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                    hintText: '0-100',
                    border: OutlineInputBorder(),
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  ),
                  onChanged: (v) {
                    final val = double.tryParse(v) ?? 0.0;
                    if (val < 0 || val > 100) return;
                    onChanged(n.siswaId, val);
                  },
                ),
              ),
            );
          },
        );
      },
    );
  }
}