import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/app_config.dart';
import '../config/storage_keys.dart';
import '../messaging/app_messenger.dart';
import '../auth/auth_storage.dart';

typedef SessionExpiredCallback = void Function();

class ApiClient {
  ApiClient({
    required AppConfig config,
    required AuthStorage authStorage,
    SessionExpiredCallback? onSessionExpired,
  })  : _authStorage = authStorage,
        _onSessionExpired = onSessionExpired,
        dio = Dio(
          BaseOptions(
            baseUrl: config.apiBaseUrl,
            connectTimeout: const Duration(seconds: 20),
            receiveTimeout: const Duration(seconds: 30),
            headers: const {'Content-Type': 'application/json'},
          ),
        ) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: _attachAuthHeaders,
        onError: _handleError,
      ),
    );
  }

  final AuthStorage _authStorage;
  final SessionExpiredCallback? _onSessionExpired;
  final Dio dio;

  Future<void> _attachAuthHeaders(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _authStorage.readToken();
    final orgId =
        options.headers[StorageKeys.orgHeader] as String? ??
            await _authStorage.readOrgId();

    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    if (orgId != null && orgId.isNotEmpty) {
      options.headers[StorageKeys.orgHeader] = orgId;
    }

    handler.next(options);
  }

  Future<void> _handleError(
    DioException error,
    ErrorInterceptorHandler handler,
  ) async {
    final status = error.response?.statusCode;
    final path = error.requestOptions.path;

    final isPublicAuthRequest = _isPublicAuthPath(path);
    if (status == 401 && !isPublicAuthRequest) {
      await _authStorage.clearAll();
      _onSessionExpired?.call();
    }

    if (status == 403) {
      final data = error.response?.data;
      if (data is Map<String, dynamic>) {
        final message = _messageFromBody(data);
        final code = data['code'] as String? ?? data['error'] as String?;
        if (code == 'SUBSCRIPTION_LIMIT_EXCEEDED' || code == 'LIMIT_EXCEEDED') {
          showPlanLimitMessage(
            message.isNotEmpty ? message : 'Plan limit reached. Upgrade to continue.',
          );
        }
        if (message.contains('Organization context') ||
            message.contains('not a member of this organization')) {
          await _authStorage.writeOrgId(null);
        }
      }
    }

    handler.next(error);
  }

  bool _isPublicAuthPath(String path) {
    const publicPaths = [
      '/auth/login',
      '/auth/logout',
      '/auth/signup',
      '/auth/forgot-password',
      '/auth/reset-password',
    ];
    return publicPaths.any(path.contains);
  }

  String _messageFromBody(Map<String, dynamic> body) {
    final raw = body['message'];
    if (raw is String) return raw;
    if (raw is List && raw.isNotEmpty && raw.first is String) {
      return raw.first as String;
    }
    return '';
  }

  Options withOrgHeader(String orgId, {Options? base}) {
    final headers = Map<String, dynamic>.from(base?.headers ?? {});
    headers[StorageKeys.orgHeader] = orgId;
    return (base ?? Options()).copyWith(headers: headers);
  }
}

final appConfigProvider = Provider<AppConfig>((ref) {
  return AppConfig.fromEnvironment();
});

final authStorageProvider = Provider<AuthStorage>((ref) => AuthStorage());

final sessionExpiredTickProvider = StateProvider<int>((ref) => 0);

final apiClientProvider = Provider<ApiClient>((ref) {
  final config = ref.watch(appConfigProvider);
  final storage = ref.watch(authStorageProvider);

  return ApiClient(
    config: config,
    authStorage: storage,
    onSessionExpired: () {
      ref.read(sessionExpiredTickProvider.notifier).state++;
    },
  );
});
