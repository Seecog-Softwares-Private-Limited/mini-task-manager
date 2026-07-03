import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

class ApiConnectionResult {
  const ApiConnectionResult({
    required this.ok,
    required this.message,
    required this.url,
  });

  final bool ok;
  final String message;
  final String url;
}

class ApiConnectionService {
  /// Tries each candidate until one responds (used for production mobile fallback).
  static Future<ApiConnectionResult> findFirstReachable(
    Iterable<String> candidates,
  ) async {
    ApiConnectionResult? last;
    for (final candidate in candidates) {
      final result = await test(candidate);
      last = result;
      if (result.ok) return result;
    }
    return last ??
        const ApiConnectionResult(
          ok: false,
          url: '',
          message: 'No server URL candidates were provided.',
        );
  }

  static Future<ApiConnectionResult> test(String apiBaseUrl) async {
    final url = apiBaseUrl.trim();
    if (url.isEmpty) {
      return const ApiConnectionResult(
        ok: false,
        url: '',
        message: 'Enter a server URL.',
      );
    }

    final dio = Dio(
      BaseOptions(
        baseUrl: url,
        connectTimeout: const Duration(seconds: 12),
        receiveTimeout: const Duration(seconds: 12),
      ),
    );

    try {
      final response = await dio.get<dynamic>('/health');
      if (response.statusCode != null && response.statusCode! >= 200 && response.statusCode! < 300) {
        return ApiConnectionResult(
          ok: true,
          url: url,
          message: 'Connected successfully.',
        );
      }
      return ApiConnectionResult(
        ok: false,
        url: url,
        message: 'Server responded with status ${response.statusCode}.',
      );
    } on DioException catch (error) {
      final hint = _hintForUrl(url);
      if (error.type == DioExceptionType.connectionError ||
          error.type == DioExceptionType.connectionTimeout) {
        return ApiConnectionResult(
          ok: false,
          url: url,
          message: 'Could not reach $url. $hint',
        );
      }
      return ApiConnectionResult(
        ok: false,
        url: url,
        message: 'Connection failed: ${error.message ?? error.type.name}. $hint',
      );
    } catch (error) {
      return ApiConnectionResult(
        ok: false,
        url: url,
        message: 'Connection failed: $error',
      );
    }
  }

  static String _hintForUrl(String url) {
    if (kIsWeb) {
      return 'For Flutter web use http://localhost:3007 (backend with CORS for :8090).';
    }
    if (url.contains(':3007')) {
      return 'Port 3007 is local-only — use port 3000 or port 80 on the server.';
    }
    if (url.contains(':3000')) {
      return 'Port 3000 is often blocked on mobile data. Try Wi‑Fi, or use port 80 (http://YOUR_SERVER without :3000).';
    }
    return 'Check the server is running and port 80/3000 is open in the AWS security group.';
  }
}
