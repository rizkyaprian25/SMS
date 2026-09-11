import 'package:cookie_jar/cookie_jar.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:path_provider/path_provider.dart';

import '../api/dio_client.dart';

const _kAccess = 'sms_access_token';

/// Status login global. Dipakai guard implisit: layar mengarah ke /login
/// bila [SessionData.token] null.
class SessionData {
  const SessionData({this.token, this.email, this.role});

  final String? token;
  final String? email;
  final String? role;

  bool get sudahMasuk => token != null;
}

/// Mengelola token (secure storage), cookie refresh (persist), dan FCM token.
/// Lihat docs/08-auth-rbac-multidevice.md.
class SessionNotifier extends AsyncNotifier<SessionData> {
  final _storage = const FlutterSecureStorage();
  DioClient? _api;

  @override
  Future<SessionData> build() async => const SessionData();

  /// Dipanggil sekali dari main/app setelah cookie dir siap.
  Future<void> init(DioClient api) async {
    _api = api;
    final token = await _storage.read(key: _kAccess);
    if (token == null) {
      state = const AsyncData(SessionData());
      return;
    }
    api.setToken(token);
    state = const AsyncLoading();
    try {
      final me = await api.get('/auth/me');
      final data = me.data as Map<String, dynamic>;
      state = AsyncData(
        SessionData(
          token: token,
          email: data['email'] as String?,
          role: data['role'] as String?,
        ),
      );
    } catch (_) {
      await _storage.delete(key: _kAccess);
      api.setToken(null);
      state = const AsyncData(SessionData());
    }
  }

  Future<void> login(String email, String password) async {
    final api = _api;
    if (api == null) return;
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final res = await api.post(
        '/auth/login',
        body: {'email': email, 'password': password},
      );
      final data = res.data as Map<String, dynamic>;
      final token = data['accessToken'] as String;
      await _storage.write(key: _kAccess, value: token);
      api.setToken(token);
      await _daftarkanFcm(api);
      final me = await api.get('/auth/me');
      final med = me.data as Map<String, dynamic>;
      return SessionData(
        token: token,
        email: med['email'] as String?,
        role: med['role'] as String?,
      );
    });
  }

  /// FCM best-effort: tanpa google-services.json (dev) dilewati diam-diam.
  Future<void> _daftarkanFcm(DioClient api) async {
    try {
      final fcm = await FirebaseMessaging.instance.getToken();
      if (fcm == null) return;
      await api.dio.put(
        '/auth/devices/token',
        data: {'fcmToken': fcm, 'platform': 'ANDROID'},
      );
    } catch (_) {
      // abaikan di dev tanpa Firebase
    }
  }

  Future<void> logout({bool semua = false}) async {
    final api = _api;
    try {
      if (semua) {
        await api?.post('/auth/logout?semua=true');
      } else {
        await api?.post('/auth/logout');
      }
    } catch (_) {
      // tetap bersihkan lokal walau jaringan gagal
    }
    await _storage.delete(key: _kAccess);
    api?.setToken(null);
    state = const AsyncData(SessionData());
  }

  /// Dipanggil interceptor DioClient setiap token baru dari refresh.
  Future<void> simpanToken(String token) =>
      _storage.write(key: _kAccess, value: token);
}

final sessionProvider =
    AsyncNotifierProvider<SessionNotifier, SessionData>(
  SessionNotifier.new,
);

/// DioClient tunggal — dibuat sekali di bootstrap dengan cookie dir.
Future<DioClient> buatApi(
  String baseUrl,
  Future<void> Function(String token) onToken,
) async {
  final dir = await getApplicationDocumentsDirectory();
  final jar = PersistCookieJar(storage: FileStorage('${dir.path}/cookies'));
  return DioClient(baseUrl: baseUrl, cookieJar: jar, onAccessToken: onToken);
}
