import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/api/dio_client.dart';
import 'core/auth/session.dart';
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

/// DioClient siap-pakai (null selama bootstrap). Repository membaca ini.
final dioClientProvider = StateProvider<DioClient?>((_) => null);

final _router = GoRouter(
  initialLocation: '/login',
  routes: [
    GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
    GoRoute(path: '/jadwal', builder: (_, __) => const JadwalScreen()),
    GoRoute(
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
    GoRoute(path: '/presensi', builder: (_, __) => const PresensiScreen()),
  ],
);

class SmsApp extends ConsumerWidget {
  const SmsApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final api = ref.watch(dioClientProvider);
    if (api == null) return const _Bootstrap();
    return MaterialApp.router(
      title: 'SMS Guru',
      theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.indigo),
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
      home: Scaffold(body: Center(child: CircularProgressIndicator())),
    );
  }
}
