import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';

class DeviceTokensRepository {
  DeviceTokensRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<void> register({
    required String token,
    required String platform,
    String? deviceId,
  }) async {
    try {
      await _api.dio.post<void>(
        '/device-tokens',
        data: {
          'token': token,
          'platform': platform,
          if (deviceId != null && deviceId.isNotEmpty) 'deviceId': deviceId,
        },
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<void> unregister(String token) async {
    try {
      await _api.dio.delete<void>(
        '/device-tokens',
        data: {'token': token},
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }
}

final deviceTokensRepositoryProvider = Provider<DeviceTokensRepository>((ref) {
  return DeviceTokensRepository(apiClient: ref.watch(apiClientProvider));
});
