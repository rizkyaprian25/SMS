import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/session.dart';
import '../../core/theme/app_colors.dart';
import '../absensi/antrean_provider.dart';

/// Layar Profil & Pengaturan Guru (Stitch Layar 6):
/// Identitas guru, NIP copy chip, offline sync status, grouped settings menu, panduan non-IT, & logout.
class ProfilScreen extends ConsumerStatefulWidget {
  const ProfilScreen({super.key});

  @override
  ConsumerState<ProfilScreen> createState() => _ProfilScreenState();
}

class _ProfilScreenState extends ConsumerState<ProfilScreen> {
  bool _biometrikAktif = true;

  Future<void> _konfirmasiLogout(BuildContext context, WidgetRef ref) async {
    final setuju = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Keluar dari Akun?'),
        content: const Text(
          'Anda akan keluar dari sesi aplikasi Mobile Guru. Pastikan absensi kelas harian telah tersinkron sebelum keluar.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Batal'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Keluar'),
          ),
        ],
      ),
    );

    if (setuju == true && context.mounted) {
      await ref.read(sessionProvider.notifier).logout();
      if (context.mounted) {
        context.go('/login');
      }
    }
  }

  void _salinNip(String nip) {
    Clipboard.setData(ClipboardData(text: nip));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('NIP $nip berhasil disalin ke clipboard.'),
        duration: const Duration(seconds: 2),
        backgroundColor: AppColors.primary,
      ),
    );
  }

  void _bukaPanduan() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.menu_book_rounded, color: AppColors.primary, size: 24),
                const SizedBox(width: 10),
                const Text(
                  'Panduan Penggunaan Guru Non-IT',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 14),
            _buildPanduanItem('1. Presensi Wajah', 'Buka tab Presensi pada pagi hari. Dekatkan wajah Anda ke lingkaran kamera dan kedipkan mata.'),
            _buildPanduanItem('2. Absensi Siswa', 'Buka tab Jadwal, pilih kelas aktif, lalu ketuk [H] [I] [S] [A] sesuai kehadiran siswa.'),
            _buildPanduanItem('3. Fitur Offline', 'Jika internet mati di kelas, absensi tetap tersimpan dan otomatis dikirim saat sinyal kembali.'),
            _buildPanduanItem('4. Nilai Siswa', 'Buka tab Nilai, pilih jenis evaluasi tugas, dan isi angka 0-100 secara langsung.'),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildPanduanItem(String title, String desc) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primary)),
          const SizedBox(height: 2),
          Text(desc, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.3)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final sesi = ref.watch(sessionProvider).valueOrNull;
    final antre = ref.watch(antreanProvider);

    final namaGuru = sesi?.guruNama ?? sesi?.email?.split('@').first ?? 'Bpk. Budi Santoso, S.Pd';
    final nipGuru = sesi?.guruNip ?? '19820311 200604 1 008';
    final roleGuru = sesi?.role ?? 'GURU';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Profil Saya'),
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline_rounded, color: AppColors.textSecondary),
            tooltip: 'Panduan Guru',
            onPressed: _bukaPanduan,
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        children: [
          // 1. Teacher Profile Header Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  Row(
                    children: [
                      // Avatar Guru dengan Ring Indigo & Badge Aktif Centang Hijau
                      Stack(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(3),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: AppColors.primaryBorder, width: 2),
                            ),
                            child: CircleAvatar(
                              radius: 32,
                              backgroundColor: AppColors.primaryLight,
                              child: Text(
                                namaGuru.isNotEmpty ? namaGuru[0].toUpperCase() : 'G',
                                style: const TextStyle(
                                  fontSize: 26,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                ),
                              ),
                            ),
                          ),
                          Positioned(
                            bottom: 2,
                            right: 2,
                            child: Container(
                              width: 18,
                              height: 18,
                              decoration: BoxDecoration(
                                color: AppColors.success,
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white, width: 2),
                              ),
                              child: const Icon(Icons.check, size: 11, color: Colors.white),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 16),

                      // Nama, Gelar, Golongan
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              namaGuru,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 3),
                            const Text(
                              'PNS • Penata Tk. I (III/d)',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 6),
                            // Chip NIP dengan Salin
                            InkWell(
                              onTap: () => _salinNip(nipGuru),
                              borderRadius: BorderRadius.circular(6),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: AppColors.borderSubtle,
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: AppColors.border),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      'NIP: $nipGuru',
                                      style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    const Icon(Icons.copy_rounded, size: 12, color: AppColors.textSecondary),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Divider(height: 1, color: AppColors.borderSubtle),
                  const SizedBox(height: 12),

                  // Role Badges
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primaryLight,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.primaryBorder),
                        ),
                        child: const Text(
                          'Guru Informatika',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.infoLight,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.infoBorder),
                        ),
                        child: const Text(
                          'Wali Kelas 7A',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.info),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.borderSubtle,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          roleGuru.replaceAll('_', ' '),
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),

          // 2. Status Sinkronisasi Offline-First (Hive Local Sync Card)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: antre.pending == 0 ? AppColors.successLight : AppColors.warningLight,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: antre.pending == 0 ? AppColors.successBorder : AppColors.warningBorder,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  antre.pending == 0 ? Icons.cloud_done_rounded : Icons.cloud_sync_rounded,
                  color: antre.pending == 0 ? AppColors.success : AppColors.warningDark,
                  size: 26,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        antre.pending == 0 ? 'Data Tersinkron Sempurna' : '${antre.pending} Antrean Belum Tersinkron',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          color: antre.pending == 0 ? AppColors.successDark : AppColors.warningDark,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        antre.pending == 0
                            ? 'Database lokal Hive aman • Siap offline kapan saja'
                            : 'Tersimpan di memori HP. Klik tombol untuk kirim ke cloud.',
                        style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                FilledButton.tonal(
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                  onPressed: () => ref.read(antreanProvider.notifier).sinkronkan(),
                  child: const Text('Cek Sinkron'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),

          // 3. Grouped Settings Menu Cards
          // Section A: Akademik & Tugas
          const Padding(
            padding: EdgeInsets.only(left: 4, bottom: 8),
            child: Text(
              'AKADEMIK & TUGAS GURU',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.6,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          Card(
            child: Column(
              children: [
                _buildMenuTile(
                  icon: Icons.calendar_today_rounded,
                  title: 'Jadwal Mengajar Semester Ini',
                  badge: '24 JP / Minggu',
                  badgeColor: AppColors.primary,
                  onTap: () => context.go('/jadwal'),
                ),
                const Divider(height: 1, indent: 52, color: AppColors.borderSubtle),
                _buildMenuTile(
                  icon: Icons.groups_rounded,
                  title: 'Daftar Siswa Perwalian',
                  badge: 'Kelas 7A • 32 Siswa',
                  badgeColor: AppColors.info,
                  onTap: () {},
                ),
                const Divider(height: 1, indent: 52, color: AppColors.borderSubtle),
                _buildMenuTile(
                  icon: Icons.verified_user_rounded,
                  title: 'Rekap Kehadiran Guru',
                  badge: 'Kehadiran: 100%',
                  badgeColor: AppColors.success,
                  onTap: () => context.go('/presensi'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Section B: Keamanan & Preferensi
          const Padding(
            padding: EdgeInsets.only(left: 4, bottom: 8),
            child: Text(
              'KEAMANAN & PREFERENSI',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.6,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          Card(
            child: Column(
              children: [
                _buildMenuTile(
                  icon: Icons.lock_outline_rounded,
                  title: 'Ubah Kata Sandi Akun',
                  onTap: () {},
                ),
                const Divider(height: 1, indent: 52, color: AppColors.borderSubtle),
                ListTile(
                  leading: const Icon(Icons.fingerprint_rounded, color: AppColors.textSecondary),
                  title: const Text('Login Biometrik (Sidik Jari/Face ID)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  trailing: Switch(
                    value: _biometrikAktif,
                    activeTrackColor: AppColors.primary,
                    onChanged: (v) => setState(() => _biometrikAktif = v),
                  ),
                ),
                const Divider(height: 1, indent: 52, color: AppColors.borderSubtle),
                _buildMenuTile(
                  icon: Icons.phone_android_rounded,
                  title: 'Perangkat Terhubung',
                  badge: 'Perangkat Utama',
                  badgeColor: AppColors.textSecondary,
                  onTap: () {},
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Section C: Pusat Bantuan
          const Padding(
            padding: EdgeInsets.only(left: 4, bottom: 8),
            child: Text(
              'PUSAT BANTUAN & INFORMASI',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.6,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          Card(
            child: Column(
              children: [
                _buildMenuTile(
                  icon: Icons.menu_book_rounded,
                  title: 'Buku Panduan Guru Non-IT',
                  badge: 'Panduan Lengkap',
                  badgeColor: AppColors.primary,
                  onTap: _bukaPanduan,
                ),
                const Divider(height: 1, indent: 52, color: AppColors.borderSubtle),
                _buildMenuTile(
                  icon: Icons.support_agent_rounded,
                  title: 'Hubungi Tim IT / Tata Usaha',
                  onTap: () {},
                ),
                const Divider(height: 1, indent: 52, color: AppColors.borderSubtle),
                _buildMenuTile(
                  icon: Icons.info_outline_rounded,
                  title: 'Versi Aplikasi',
                  badge: 'SMS SMP v1.0.0 (MVP)',
                  badgeColor: AppColors.textMuted,
                  showArrow: false,
                  onTap: () {},
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 4. Tombol Keluar dari Akun (Outlined Merah Rose)
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.danger,
              side: const BorderSide(color: AppColors.dangerBorder),
              backgroundColor: AppColors.dangerLight,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            onPressed: () => _konfirmasiLogout(context, ref),
            icon: const Icon(Icons.logout_rounded, size: 18),
            label: const Text(
              'Keluar dari Akun Guru',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildMenuTile({
    required IconData icon,
    required String title,
    String? badge,
    Color? badgeColor,
    bool showArrow = true,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Icon(icon, color: AppColors.textSecondary, size: 20),
      title: Text(
        title,
        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (badge != null) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: (badgeColor ?? AppColors.primary).withAlpha(20),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                badge,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: badgeColor ?? AppColors.primary,
                ),
              ),
            ),
            const SizedBox(width: 8),
          ],
          if (showArrow)
            const Icon(Icons.chevron_right_rounded, size: 20, color: AppColors.textMuted),
        ],
      ),
      onTap: onTap,
    );
  }
}
