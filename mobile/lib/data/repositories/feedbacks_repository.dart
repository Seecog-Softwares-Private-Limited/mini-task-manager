import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../models/feedback.dart';
import '../models/paginated_result.dart';
import '../models/pending_attachment.dart';

class FeedbacksRepository {
  FeedbacksRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<PaginatedResult<AppFeedback>> fetchFeedbacks({
    required String organizationId,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _api.dio.get<Map<String, dynamic>>(
        '/feedbacks',
        queryParameters: {'page': page, 'limit': limit},
        options: _api.withOrgHeader(organizationId),
      );
      final body = response.data ?? const {};
      final raw = body['data'] as List<dynamic>? ?? const [];
      return PaginatedResult(
        data: raw
            .whereType<Map<String, dynamic>>()
            .map(AppFeedback.fromJson)
            .toList(),
        meta: PaginatedMeta.fromJson(
          (body['meta'] as Map<String, dynamic>?) ?? const {},
        ),
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<AppFeedback> createFeedback({
    required String organizationId,
    required String title,
    required String description,
    List<PendingAttachment> files = const [],
  }) async {
    try {
      final map = <String, dynamic>{
        'title': title,
        'description': description,
      };
      if (files.isNotEmpty) {
        map['files'] = await Future.wait(
          files.map((file) => file.toMultipartFile()),
        );
      }
      final form = FormData.fromMap(map);
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/feedbacks',
        data: form,
        options: _api.withOrgHeader(
          organizationId,
          base: Options(contentType: 'multipart/form-data'),
        ),
      );
      return AppFeedback.fromJson(response.data ?? const {});
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }
}
