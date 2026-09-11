import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';

/// Satu-satunya akses HTTP ke backend (docs/07-api-contract.md).
///
/// Auth: access JWT di header + refresh httpOnly di cookie (persist per
/// device via PersistCookieJar). 401 otomatis coba refresh sekali lalu
/// ulangi request — layar tidak perlu tangani token mati.
class DioClient {
  DioClient({
    required this.baseUrl,
    required PersistCookieJar cookieJar,
    this.onAccessToken,
  }) : dio = Dio(
          BaseOptions(
            baseUrl: baseUrl,
            connectTimeout: const Duration(seconds: 15),
            receiveTimeout: const Duration(seconds: 20),
            headers: {'Content-Type': 'application/json'},
          ),
        ) {
    dio.interceptors.add(CookieManager(cookieJar));
    dio.interceptors.add(
      InterceptorsWrapper(
        onError: (err, handler) async {
          final status = err.response?.statusCode;
          final retried = err.requestOptions.extra['sms_retried'] == true;
          final isRefresh = err.requestOptions.path.contains('/auth/refresh');
          if (status == 401 && !retried && !isRefresh) {
            try {
              final res = await dio.post('/auth/refresh');
              final token = res.data is Map
                  ? res.data['accessToken'] as String?
                  : null;
              if (token != null) {
                setToken(token);
                await onAccessToken?.call(token);
                final opts = Options(
                  method: err.requestOptions.method,
                  headers: Map<String, dynamic>.from(
                    err.requestOptions.headers,
                  )..['Authorization'] = 'Bearer $token',
                  extra: Map<String, dynamic>.from(
                    err.requestOptions.extra,
                  )..['sms_retried'] = true,
                );
                final retry = await dio.request(
                  err.requestOptions.path,
                  data: err.requestOptions.data,
                  queryParameters: err.requestOptions.queryParameters,
                  options: opts,
                );
                return handler.resolve(retry);
              }
            } catch (_) {
              // refresh gagal -> teruskan 401 asli, session akan logout
            }
          }
          return handler.next(err);
        },
      ),
    );
  }

  final String baseUrl;
  final Dio dio;

  /// Dipanggil tiap token baru didapat (untuk disimpan ke secure storage).
  final Future<void> Function(String token)? onAccessToken;

  void setToken(String? token) {
    if (token == null) {
      dio.options.headers.remove('Authorization');
    } else {
      dio.options.headers['Authorization'] = 'Bearer $token';
    }
  }

  Future<Response<T>> get<T>(String path, {Map<String, dynamic>? query}) =>
      dio.get<T>(path, queryParameters: query);

  Future<Response<T>> post<T>(String path, {Object? body}) =>
      dio.post<T>(path, data: body);

  Future<Response<T>> put<T>(String path, {Object? body}) =>
      dio.put<T>(path, data: body);

  Future<Response<T>> delete<T>(String path) =>
      dio.delete<T>(path);
}
