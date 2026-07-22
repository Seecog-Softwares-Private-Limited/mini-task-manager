import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../models/feedback.dart';
import '../models/pending_attachment.dart';

class FeedbacksRepository {
  FeedbacksRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

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
