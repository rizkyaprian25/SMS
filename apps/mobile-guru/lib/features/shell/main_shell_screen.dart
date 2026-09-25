import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';

/// Shell Scaffold dengan Material 3 NavigationBar bergaya Apple HIG Liquid Glass:
/// Transparan fungsional dengan BackdropFilter blur, hairline border, dan haptic feedback.
/// Tab 0: Jadwal Mengajar (/jadwal)
/// Tab 1: Presensi Mandiri & Wajah (/presensi)
/// Tab 2: Penilaian Siswa (/nilai)
/// Tab 3: Profil & Pengaturan Guru (/profil)
class MainShellScreen extends StatelessWidget {
  const MainShellScreen({
    required this.navigationShell,
    super.key,
  });

  final StatefulNavigationShell navigationShell;

  void _onTap(int index) {
    HapticFeedback.selectionClick();
    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      body: navigationShell,
      bottomNavigationBar: ClipRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.88),
              border: const Border(
                top: BorderSide(color: Color(0x1F000000), width: 0.5),
              ),
            ),
            child: NavigationBar(
              selectedIndex: navigationShell.currentIndex,
              onDestinationSelected: _onTap,
              elevation: 0,
              height: 68,
              backgroundColor: Colors.transparent,
              indicatorColor: AppColors.primaryLight,
              destinations: const [
                NavigationDestination(
                  icon: Icon(Icons.calendar_today_outlined, size: 22, color: AppColors.textSecondary),
                  selectedIcon: Icon(Icons.calendar_month_rounded, size: 22, color: AppColors.primary),
                  label: 'Jadwal',
                  tooltip: 'Jadwal Mengajar Harian',
                ),
                NavigationDestination(
                  icon: Icon(Icons.camera_front_outlined, size: 22, color: AppColors.textSecondary),
                  selectedIcon: Icon(Icons.camera_front_rounded, size: 22, color: AppColors.primary),
                  label: 'Presensi',
                  tooltip: 'Presensi Wajah Mandiri',
                ),
                NavigationDestination(
                  icon: Icon(Icons.assignment_outlined, size: 22, color: AppColors.textSecondary),
                  selectedIcon: Icon(Icons.assignment_rounded, size: 22, color: AppColors.primary),
                  label: 'Nilai',
                  tooltip: 'Buku Nilai Siswa',
                ),
                NavigationDestination(
                  icon: Icon(Icons.person_outline_rounded, size: 22, color: AppColors.textSecondary),
                  selectedIcon: Icon(Icons.person_rounded, size: 22, color: AppColors.primary),
                  label: 'Profil',
                  tooltip: 'Profil & Pengaturan',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
