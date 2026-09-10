import 'package:dio/dio.dart';

/// Satu-satunya akses HTTP ke backend. Lihat docs/07-api-contract.md.
/// Auth: Bearer access (15 mnt). Refresh + secure storage menyusul tahap berikut.
class DioClient {
  DioClient({required this.baseUrl})
      : dio = Dio(BaseOptions(
          baseUrl: baseUrl,
          connectTimeout: const Duration(seconds: 15),
          receiveTimeout: const Duration(seconds: 20),
          headers: {'Content-Type': 'application/json'},
        ));

  final String baseUrl;
  final Dio dio;

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
}
