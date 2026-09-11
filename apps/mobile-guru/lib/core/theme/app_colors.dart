import 'package:flutter/material.dart';

/// Palet warna Design System SMS Mobile Guru (Sesuai Google Stitch)
/// Modern Minimalist, Data-Driven, ramah guru non-IT.
class AppColors {
  AppColors._();

  // Primary - Indigo
  static const Color primary = Color(0xFF4F46E5);
  static const Color primaryDark = Color(0xFF4338CA);
  static const Color primaryLight = Color(0xFFEEF2FF);
  static const Color primaryBorder = Color(0xFFC7D2FE);

  // Background & Surfaces
  static const Color background = Color(0xFFF8FAFC);
  static const Color surface = Colors.white;
  static const Color border = Color(0xFFE2E8F0);
  static const Color borderSubtle = Color(0xFFF1F5F9);

  // Typography - Slate
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color textMuted = Color(0xFF94A3B8);

  // Success - Emerald (Kehadiran Hadir, Tuntas KKM)
  static const Color success = Color(0xFF10B981);
  static const Color successDark = Color(0xFF059669);
  static const Color successLight = Color(0xFFECFDF5);
  static const Color successBorder = Color(0xFFA7F3D0);

  // Info - Sky (Izin, Mapel, Rombel)
  static const Color info = Color(0xFF0284C7);
  static const Color infoLight = Color(0xFFF0F9FF);
  static const Color infoBorder = Color(0xFFBAE6FD);

  // Warning - Amber (Sakit, Remedial, Pending Sync)
  static const Color warning = Color(0xFFF59E0B);
  static const Color warningDark = Color(0xFFD97706);
  static const Color warningLight = Color(0xFFFFFBEB);
  static const Color warningBorder = Color(0xFFFDE68A);

  // Danger - Rose (Alpa, Terlambat, Logout)
  static const Color danger = Color(0xFFE11D48);
  static const Color dangerLight = Color(0xFFFFF1F2);
  static const Color dangerBorder = Color(0xFFFECDD3);
}
