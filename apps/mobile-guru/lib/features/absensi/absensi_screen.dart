import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app.dart';
import '../../core/theme/app_colors.dart';
import 'absensi_repository.dart';
import 'antrean_provider.dart';

const _statusOptions = [
  ('HADIR', 'H', AppColors.success, AppColors.successLight, AppColors.successBorder),
  ('IZIN', 'I', AppColors.info, AppColors.infoLight, AppColors.infoBorder),
  ('SAKIT', 'S', AppColors.warningDark, AppColors.warningLight, AppColors.warningBorder),
  ('ALPA', 'A', AppColors.danger, AppColors.dangerLight, AppColors.dangerBorder),
];

/// Layar Absensi Roll-Call Siswa di Kelas (Stitch Layar 3):
/// Counter status instan, toggle taktil [H] [I] [S] [A], search bar, dan simpan bulk offline-first.
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
  late final String tanggal = DateTime.now().toIso8601String().substring(0, 10);
  final Map<String, String> nama = {};
  final Map<String, String> status = {};
  String info = '';
  bool memuat = true;
  String searchQuery = '';
  final searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _muat();
  }

  @override
  void dispose() {
    searchController.dispose();
    super.dispose();
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
        info = 'Gagal memuat daftar siswa: ${e.message}';
      });
    }
  }

  Future<void> _simpan() async {
    final api = ref.read(dioClientProvider);
    if (api == null || status.isEmpty) return;
    setState(() => info = 'Menyimpan absensi…');
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
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Absensi berhasil disimpan ke server.'),
          backgroundColor: AppColors.success,
        ),
      );
      context.pop();
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.connectionTimeout ||
          e.response == null) {
        await ref.read(antreanProvider.notifier).antre(paket);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Tersimpan offline di HP. Akan disinkron saat online.'),
            backgroundColor: AppColors.warningDark,
          ),
        );
        context.pop();
      } else {
        if (!mounted) return;
        setState(() => info = 'Ditolak server: ${e.response?.data}');
      }
    }
  }

  void _tandaiSemuaHadir() {
    setState(() {
      status.updateAll((_, __) => 'HADIR');
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Semua siswa ditandai Hadir.'),
        duration: Duration(seconds: 2),
        backgroundColor: AppColors.primary,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final totalHadir = status.values.where((v) => v == 'HADIR').length;
    final totalIzin = status.values.where((v) => v == 'IZIN').length;
    final totalSakit = status.values.where((v) => v == 'SAKIT').length;
    final totalAlpa = status.values.where((v) => v == 'ALPA').length;

    final filteredIds = status.keys.where((id) {
      if (searchQuery.isEmpty) return true;
      final studentName = nama[id]?.toLowerCase() ?? '';
      return studentName.contains(searchQuery.toLowerCase());
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${widget.rombelNama} • ${widget.mapelNama}',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            Text(
              'Jam Ke-${widget.jamKe} • $tanggal',
              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.normal),
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: FilledButton.tonal(
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primaryLight,
                foregroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
              ),
              onPressed: memuat ? null : _tandaiSemuaHadir,
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.done_all_rounded, size: 16),
                  SizedBox(width: 4),
                  Text('Semua Hadir'),
                ],
              ),
            ),
          ),
        ],
      ),
      body: memuat
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : Column(
              children: [
                // Metric Counter KPI Bar (Hadir, Izin, Sakit, Alpa)
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    children: [
                      _buildKpiCard('Hadir', totalHadir, AppColors.success, AppColors.successLight, AppColors.successBorder),
                      const SizedBox(width: 8),
                      _buildKpiCard('Izin', totalIzin, AppColors.info, AppColors.infoLight, AppColors.infoBorder),
                      const SizedBox(width: 8),
                      _buildKpiCard('Sakit', totalSakit, AppColors.warningDark, AppColors.warningLight, AppColors.warningBorder),
                      const SizedBox(width: 8),
                      _buildKpiCard('Alpa', totalAlpa, AppColors.danger, AppColors.dangerLight, AppColors.dangerBorder),
                    ],
                  ),
                ),

                // Search Bar Siswa
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                  child: TextField(
                    controller: searchController,
                    onChanged: (v) => setState(() => searchQuery = v),
                    decoration: InputDecoration(
                      hintText: 'Cari nama siswa di kelas ${widget.rombelNama}...',
                      hintStyle: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                      prefixIcon: const Icon(Icons.search_rounded, size: 20, color: AppColors.textSecondary),
                      suffixIcon: searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18),
                              onPressed: () {
                                searchController.clear();
                                setState(() => searchQuery = '');
                              },
                            )
                          : null,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    ),
                  ),
                ),

                // Pesan info bila ada
                if (info.isNotEmpty)
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.dangerLight,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.dangerBorder),
                    ),
                    child: Text(info, style: const TextStyle(fontSize: 12, color: AppColors.danger)),
                  ),

                // Daftar Siswa
                Expanded(
                  child: filteredIds.isEmpty
                      ? const Center(
                          child: Text(
                            'Tidak ada siswa ditemukan',
                            style: TextStyle(color: AppColors.textSecondary),
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                          itemCount: filteredIds.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (_, i) {
                            final id = filteredIds[i];
                            final studentName = nama[id] ?? 'Siswa';
                            final currentStatus = status[id] ?? 'HADIR';

                            return Card(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                child: Row(
                                  children: [
                                    // Avatar inisial siswa
                                    CircleAvatar(
                                      radius: 18,
                                      backgroundColor: AppColors.primaryLight,
                                      child: Text(
                                        studentName.isNotEmpty ? studentName[0].toUpperCase() : 'S',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 13,
                                          color: AppColors.primary,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),

                                    // Nama Siswa
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            studentName,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 14,
                                              color: AppColors.textPrimary,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            'Status: $currentStatus',
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w500,
                                              color: _getStatusColor(currentStatus),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),

                                    // Toggle Taktil [H] [I] [S] [A]
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: _statusOptions.map((opt) {
                                        final (optKey, label, color, bgLight, border) = opt;
                                        final isSelected = currentStatus == optKey;

                                        return Padding(
                                          padding: const EdgeInsets.only(left: 4),
                                          child: InkWell(
                                            onTap: () => setState(() => status[id] = optKey),
                                            borderRadius: BorderRadius.circular(8),
                                            child: AnimatedContainer(
                                              duration: const Duration(milliseconds: 150),
                                              width: 32,
                                              height: 32,
                                              decoration: BoxDecoration(
                                                color: isSelected ? color : Colors.white,
                                                borderRadius: BorderRadius.circular(8),
                                                border: Border.all(
                                                  color: isSelected ? color : AppColors.border,
                                                  width: isSelected ? 1.5 : 1,
                                                ),
                                              ),
                                              child: Center(
                                                child: Text(
                                                  label,
                                                  style: TextStyle(
                                                    fontWeight: FontWeight.w800,
                                                    fontSize: 12,
                                                    color: isSelected ? Colors.white : AppColors.textSecondary,
                                                  ),
                                                ),
                                              ),
                                            ),
                                          ),
                                        );
                                      }).toList(),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),

                // Sticky Bottom Action Dock
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
                              '${status.length} Siswa Terdata',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                            ),
                            const Row(
                              children: [
                                Icon(Icons.offline_pin_rounded, size: 14, color: AppColors.success),
                                SizedBox(width: 4),
                                Text(
                                  'Offline-first Hive siap',
                                  style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                ),
                              ],
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
                            onPressed: status.isEmpty ? null : _simpan,
                            icon: const Icon(Icons.save_rounded, size: 18),
                            label: Text(
                              'Simpan Absensi Kelas (${status.length} Siswa)',
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

  Widget _buildKpiCard(String label, int count, Color color, Color bgLight, Color border) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: bgLight,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: border),
        ),
        child: Column(
          children: [
            Text(
              '$count',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: color,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(String s) {
    switch (s) {
      case 'HADIR':
        return AppColors.success;
      case 'IZIN':
        return AppColors.info;
      case 'SAKIT':
        return AppColors.warningDark;
      case 'ALPA':
        return AppColors.danger;
      default:
        return AppColors.textSecondary;
    }
  }
}

