import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'core/api/dio_client.dart';
import 'features/auth/login_screen.dart';
import 'features/jadwal/jadwal_screen.dart';
import 'features/absensi/absensi_screen.dart';
import 'features/presensi/presensi_screen.dart';

// API_URL diisi via --dart-define=API_URL=...
// Contoh emulator: http://10.0.2.2:3001/api/v1
const apiUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://10.0.2.2:3001/api/v1',
);

final _router = GoRouter(
  initialLocation: '/login',
  routes: [
    GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
    GoRoute(path: '/jadwal', builder: (_, __) => const JadwalScreen()),
    GoRoute(path: '/absensi', builder: (_, __) => const AbsensiScreen()),
    GoRoute(path: '/presensi', builder: (_, __) => const PresensiScreen()),
  ],
);

class SmsApp extends StatelessWidget {
  const SmsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'SMS Guru',
      theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.indigo),
      routerConfig: _router,
    );
  }
}

/// Dipakai layar untuk akses Dio terkonfigurasi.
DioClient getApi() => DioClient(baseUrl: apiUrl);
