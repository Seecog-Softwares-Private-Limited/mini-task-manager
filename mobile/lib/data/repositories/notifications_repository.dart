import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../models/notification.dart';
import '../models/paginated_result.dart';

class NotificationsRepository {
  NotificationsRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<PaginatedResult<AppNotification>> fetchNotifications({
    int page = 1,
    int limit = 50,
  }) async {
    try {
      final response = await _api.dio.get<Map<String, dynamic>>(
        '/notifications',
        queryParameters: {'page': page, 'limit': limit},
      );
      final body = response.data ?? const {};
      final raw = body['data'] as List<dynamic>? ?? const [];
      return PaginatedResult(
        data: raw
            .whereType<Map<String, dynamic>>()
            .map(AppNotification.fromJson)
            .toList(),
        meta: PaginatedMeta.fromJson(
          (body['meta'] as Map<String, dynamic>?) ?? const {},
        ),
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<void> markAsRead(String id) async {
    try {
      await _api.dio.patch<void>('/notifications/$id/read');
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<int> markAllAsRead() async {
    try {
      final response =
          await _api.dio.post<Map<String, dynamic>>('/notifications/read-all');
      return response.data?['count'] as int? ?? 0;
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }
}
