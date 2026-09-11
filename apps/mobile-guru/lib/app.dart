import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/api/dio_client.dart';
import 'core/auth/session.dart';
import 'features/auth/login_screen.dart';
import 'features/jadwal/jadwal_screen.dart';
import 'features/absensi/absensi_screen.dart';
import 'features/presensi/presensi_screen.dart';
import 'features/nilai/nilai_screen.dart';
import 'features/profil/profil_screen.dart';
import 'features/shell/main_shell_screen.dart';

// API_URL diisi via --dart-define=API_URL=...
// Contoh emulator: http://10.0.2.2:3001/api/v1
const apiUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://10.0.2.2:3001/api/v1',
);

/// DioClient siap-pakai (null selama bootstrap). Repository membaca ini.
final dioClientProvider = StateProvider<DioClient?>((_) => null);

final _rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');

final _router = GoRouter(
  navigatorKey: _rootNavigatorKey,
  initialLocation: '/login',
  routes: [
    GoRoute(
      path: '/login',
      builder: (_, __) => const LoginScreen(),
    ),

    // StatefulShellRoute untuk 4 tab utama guru
    StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) {
        return MainShellScreen(navigationShell: navigationShell);
      },
      branches: [
        // Tab 0: Jadwal Mengajar
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/jadwal',
              builder: (_, __) => const JadwalScreen(),
            ),
          ],
        ),

        // Tab 1: Presensi Mandiri & Wajah
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/presensi',
              builder: (_, __) => const PresensiScreen(),
            ),
          ],
        ),

        // Tab 2: Penilaian Siswa
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/nilai',
              builder: (_, __) => const NilaiScreen(),
            ),
          ],
        ),

        // Tab 3: Profil & Pengaturan Guru
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/profil',
              builder: (_, __) => const ProfilScreen(),
            ),
          ],
        ),
      ],
    ),

    // Rute Absensi Kelas (Layar Penuh di atas Shell)
    GoRoute(
      parentNavigatorKey: _rootNavigatorKey,
      path: '/absensi',
      builder: (_, state) {
        final args = (state.extra as Map<String, dynamic>?) ?? {};
        return AbsensiScreen(
          rombelId: args['rombelId'] as String? ?? '',
          rombelNama: args['rombelNama'] as String? ?? '',
          mapelId: args['mapelId'] as String? ?? '',
          mapelNama: args['mapelNama'] as String? ?? '',
          jamKe: args['jamKe'] as int? ?? 1,
        );
      },
    ),
  ],
);

class SmsApp extends ConsumerWidget {
  const SmsApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final api = ref.watch(dioClientProvider);
    if (api == null) return const _Bootstrap();

    return MaterialApp.router(
      title: 'SMS Mobile Guru',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4F46E5),
          primary: const Color(0xFF4F46E5),
          surface: const Color(0xFFF8FAFC),
        ),
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: Color(0xFF0F172A),
          elevation: 0,
          scrolledUnderElevation: 1,
          centerTitle: false,
          titleTextStyle: TextStyle(
            color: Color(0xFF0F172A),
            fontSize: 17,
            fontWeight: FontWeight.bold,
          ),
        ),
        cardTheme: CardThemeData(
          color: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFF4F46E5), width: 1.5),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: const Color(0xFF4F46E5),
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: const Color(0xFF4F46E5),
            side: const BorderSide(color: Color(0xFFE2E8F0)),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
          ),
        ),
      ),
      routerConfig: _router,
    );
  }
}

/// Inisialisasi sekali: cookie dir -> DioClient -> restore session.
class _Bootstrap extends ConsumerStatefulWidget {
  const _Bootstrap();

  @override
  ConsumerState<_Bootstrap> createState() => _BootstrapState();
}

class _BootstrapState extends ConsumerState<_Bootstrap> {
  @override
  void initState() {
    super.initState();
    _siapkan();
  }

  Future<void> _siapkan() async {
    final api = await buatApi(
      apiUrl,
      (t) => ref.read(sessionProvider.notifier).simpanToken(t),
    );
    await ref.read(sessionProvider.notifier).init(api);
    ref.read(dioClientProvider.notifier).state = api;
  }

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      home: Scaffold(
        backgroundColor: Color(0xFF0F172A),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: 56,
                height: 56,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: Color(0xFF4F46E5),
                    borderRadius: BorderRadius.all(Radius.circular(16)),
                  ),
                  child: Center(
                    child: Text(
                      'SMS',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 20,
                      ),
                    ),
                  ),
                ),
              ),
              SizedBox(height: 20),
              CircularProgressIndicator(color: Colors.white),
            ],
          ),
        ),
      ),
    );
  }
}
