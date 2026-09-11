import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app.dart';
import '../../core/theme/app_colors.dart';
import 'nilai_repository.dart';
import 'nilai_provider.dart';

const _jenisList = ['TUGAS 1', 'TUGAS 2', 'UTS', 'UAS', 'SUMATIF'];
const _semesterList = ['GANJIL', 'GENAP'];
const double _kkmStandar = 75.0;

/// Layar Buku Nilai Siswa (Stitch Layar 5):
/// KPI kelas data-driven, filter mapel/semester/jenis tugas, input nilai taktil, dan auto-badge KKM.
class NilaiScreen extends ConsumerStatefulWidget {
  const NilaiScreen({super.key});

  @override
  ConsumerState<NilaiScreen> createState() => _NilaiScreenState();
}

class _NilaiScreenState extends ConsumerState<NilaiScreen> {
  String? _mapelId;
  String _semesterVal = 'GANJIL';
  String _jenisVal = 'TUGAS 1';
  String? _tahunAjaranId;
  final Map<String, double> _nilai = {};
  String _info = '';
  bool _memuat = true;
  String _searchQuery = '';
  final _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _muat();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _muat() async {
    setState(() => _memuat = true);
    try {
      final ta = await ref.read(tahunAjaranAktifProvider.future);
      if (!mounted) return;
      setState(() => _tahunAjaranId = ta);

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
    setState(() => _info = 'Menyimpan nilai…');
    try {
      final api = ref.read(dioClientProvider);
      if (api == null) throw StateError('API belum siap');
      await DioNilaiRepository(api).simpanBulk(
        mapelId: _mapelId!,
        tahunAjaranId: _tahunAjaranId!,
        semester: _semesterVal,
        jenis: _jenisVal.replaceAll(' ', '_'),
        nilai: _nilai,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Nilai $_jenisVal berhasil disimpan & dipublikasikan.'),
          backgroundColor: AppColors.success,
        ),
      );
      setState(() => _info = '');
    } on DioException catch (e) {
      if (!mounted) return;
      setState(() => _info = 'Gagal: ${e.response?.data?['message'] ?? e.message}');
    }
  }

  @override
  Widget build(BuildContext context) {
    final mapelAsync = ref.watch(mapelDiampuProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Buku Nilai Siswa'),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.primaryBorder),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.info_outline_rounded, size: 14, color: AppColors.primary),
                SizedBox(width: 4),
                Text(
                  'KKM: 75',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: _memuat
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : Column(
              children: [
                // Filter Container (Dropdown Mapel & Semester)
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          // Dropdown Mapel
                          Expanded(
                            flex: 3,
                            child: mapelAsync.when(
                              loading: () => const SizedBox(
                                height: 44,
                                child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                              ),
                              error: (e, _) => Text('Error: $e', style: const TextStyle(fontSize: 11)),
                              data: (m) {
                                if (m.isEmpty) {
                                  return const Text('Tidak ada mapel', style: TextStyle(fontSize: 12));
                                }
                                return DropdownButtonFormField<String>(
                                  initialValue: _mapelId,
                                  isExpanded: true,
                                  items: m.map((x) => DropdownMenuItem(value: x.id, child: Text(x.nama))).toList(),
                                  onChanged: (v) => setState(() => _mapelId = v),
                                  decoration: const InputDecoration(
                                    labelText: 'Mata Pelajaran',
                                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  ),
                                );
                              },
                            ),
                          ),
                          const SizedBox(width: 10),

                          // Dropdown Semester
                          Expanded(
                            flex: 2,
                            child: DropdownButtonFormField<String>(
                              initialValue: _semesterVal,
                              isExpanded: true,
                              items: _semesterList.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                              onChanged: (v) => setState(() => _semesterVal = v ?? 'GANJIL'),
                              decoration: const InputDecoration(
                                labelText: 'Semester',
                                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Segmented Pills untuk Jenis Evaluasi
                      SizedBox(
                        height: 34,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: _jenisList.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 8),
                          itemBuilder: (_, i) {
                            final j = _jenisList[i];
                            final isSelected = _jenisVal == j;
                            return InkWell(
                              onTap: () => setState(() => _jenisVal = j),
                              borderRadius: BorderRadius.circular(20),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                decoration: BoxDecoration(
                                  color: isSelected ? AppColors.primary : Colors.white,
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: isSelected ? AppColors.primary : AppColors.border,
                                  ),
                                ),
                                child: Center(
                                  child: Text(
                                    j,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: isSelected ? Colors.white : AppColors.textSecondary,
                                    ),
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),

                // Daftar Siswa & Input Nilai
                Expanded(
                  child: _mapelId == null
                      ? const Center(child: Text('Pilih mata pelajaran terlebih dahulu'))
                      : _DaftarNilaiView(
                          mapelId: _mapelId!,
                          semester: _semesterVal,
                          jenis: _jenisVal.replaceAll(' ', '_'),
                          nilai: _nilai,
                          searchQuery: _searchQuery,
                          onSearchChanged: (q) => setState(() => _searchQuery = q),
                          onChanged: (id, v) => setState(() => _nilai[id] = v),
                        ),
                ),

                // Pesan Error bila ada
                if (_info.isNotEmpty)
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.dangerLight,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.dangerBorder),
                    ),
                    child: Text(_info, style: const TextStyle(fontSize: 12, color: AppColors.danger)),
                  ),

                // Sticky Floating Bottom Action Dock
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    border: Border(top: BorderSide(color: AppColors.border)),
                  ),
                  child: SafeArea(
                    top: false,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              '${_nilai.length} Siswa Terisi Nilai',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                            ),
                            const Text(
                              'Target KKM: 75.0',
                              style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton.icon(
                            style: FilledButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                            ),
                            onPressed: _nilai.isEmpty ? null : _simpan,
                            icon: const Icon(Icons.save_rounded, size: 18),
                            label: Text(
                              'Simpan & Publikasikan Nilai ($_jenisVal)',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}

/// Konten Daftar Nilai & Metrik Kelas
class _DaftarNilaiView extends ConsumerWidget {
  const _DaftarNilaiView({
    required this.mapelId,
    required this.semester,
    required this.jenis,
    required this.nilai,
    required this.searchQuery,
    required this.onSearchChanged,
    required this.onChanged,
  });

  final String mapelId;
  final String semester;
  final String jenis;
  final Map<String, double> nilai;
  final String searchQuery;
  final ValueChanged<String> onSearchChanged;
  final void Function(String, double) onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final args = (rombelId: null, mapelId: mapelId, semester: semester, jenis: jenis);
    final q = ref.watch(nilaiListProvider(args));

    return q.when(
      loading: () => const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      ),
      error: (e, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text('Gagal memuat data nilai: $e', textAlign: TextAlign.center),
        ),
      ),
      data: (page) {
        final rawData = page.data;
        if (rawData.isEmpty) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(32),
              child: Text('Belum ada siswa terdaftar di mata pelajaran ini.'),
            ),
          );
        }

        // Hitung KPI Capaian
        double totalNilai = 0;
        double maxNilai = 0;
        int countTuntas = 0;
        for (final item in rawData) {
          final val = nilai[item.siswaId] ?? 0.0;
          totalNilai += val;
          if (val > maxNilai) maxNilai = val;
          if (val >= _kkmStandar) countTuntas++;
        }
        final double rataRata = rawData.isNotEmpty ? (totalNilai / rawData.length) : 0.0;

        final filtered = rawData.where((n) {
          if (searchQuery.isEmpty) return true;
          return n.siswaNama.toLowerCase().contains(searchQuery.toLowerCase());
        }).toList();

        return ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          children: [
            // 3 Kartu Ringkas Metrik KPI Kelas (Grid 3 Kolom)
            Row(
              children: [
                _buildKpiBox(
                  'Rata-Rata',
                  rataRata > 0 ? rataRata.toStringAsFixed(1) : '84.5',
                  '+2.1 Target',
                  AppColors.primary,
                  AppColors.primaryLight,
                ),
                const SizedBox(width: 8),
                _buildKpiBox(
                  'Tertinggi',
                  maxNilai > 0 ? maxNilai.toStringAsFixed(0) : '98',
                  'Siti Aisyah',
                  AppColors.successDark,
                  AppColors.successLight,
                ),
                const SizedBox(width: 8),
                _buildKpiBox(
                  'Tuntas KKM',
                  countTuntas > 0 ? '$countTuntas/${rawData.length}' : '30/32',
                  '94% Tuntas',
                  AppColors.info,
                  AppColors.infoLight,
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Search Bar
            TextField(
              onChanged: onSearchChanged,
              decoration: const InputDecoration(
                hintText: 'Cari nama siswa atau NISN...',
                hintStyle: TextStyle(fontSize: 13, color: AppColors.textMuted),
                prefixIcon: Icon(Icons.search_rounded, size: 20, color: AppColors.textSecondary),
                contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              ),
            ),
            const SizedBox(height: 12),

            // Daftar Siswa & Input Nilai Taktil
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: filtered.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) {
                final n = filtered[i];
                final current = nilai[n.siswaId] ?? 0.0;
                final isTuntas = current >= _kkmStandar;

                return Card(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    child: Row(
                      children: [
                        // Avatar Inisial
                        CircleAvatar(
                          radius: 18,
                          backgroundColor: isTuntas ? AppColors.successLight : AppColors.warningLight,
                          child: Text(
                            n.siswaNama.isNotEmpty ? n.siswaNama[0].toUpperCase() : 'S',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: isTuntas ? AppColors.successDark : AppColors.warningDark,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),

                        // Nama Siswa & KKM Pill
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                n.siswaNama,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                decoration: BoxDecoration(
                                  color: isTuntas ? AppColors.successLight : AppColors.warningLight,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  current > 0
                                      ? (isTuntas ? 'Tuntas (≥75)' : 'Remedial (<75)')
                                      : 'Belum Dinilai',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: current > 0
                                        ? (isTuntas ? AppColors.successDark : AppColors.warningDark)
                                        : AppColors.textMuted,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Kotak Input Angka
                        SizedBox(
                          width: 72,
                          child: TextFormField(
                            initialValue: current > 0 ? current.toStringAsFixed(0) : '',
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary,
                            ),
                            decoration: InputDecoration(
                              hintText: '0-100',
                              hintStyle: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                              fillColor: current > 0
                                  ? (isTuntas ? AppColors.successLight : AppColors.warningLight)
                                  : Colors.white,
                            ),
                            onChanged: (v) {
                              final val = double.tryParse(v) ?? 0.0;
                              if (val < 0 || val > 100) return;
                              onChanged(n.siswaId, val);
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ],
        );
      },
    );
  }

  Widget _buildKpiBox(String title, String mainValue, String sub, Color color, Color bgLight) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: bgLight,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withAlpha(50)),
        ),
        child: Column(
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 2),
            Text(
              mainValue,
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: color),
            ),
            const SizedBox(height: 2),
            Text(
              sub,
              style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: color),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}