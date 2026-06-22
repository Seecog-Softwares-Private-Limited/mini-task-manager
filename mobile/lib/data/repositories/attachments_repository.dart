import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../models/pending_attachment.dart';

class AttachmentsRepository {
  AttachmentsRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<void> uploadTaskAttachment({
    required String taskId,
    required String organizationId,
    required PendingAttachment file,
  }) async {
    try {
      final form = FormData.fromMap({
        'file': await file.toMultipartFile(),
      });
      await _api.dio.post<void>(
        '/tasks/$taskId/attachments',
        data: form,
        options: _api.withOrgHeader(
          organizationId,
          base: Options(contentType: 'multipart/form-data'),
        ),
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<void> uploadSubtaskAttachment({
    required String subtaskId,
    required String taskId,
    required String organizationId,
    required PendingAttachment file,
  }) async {
    try {
      final form = FormData.fromMap({
        'file': await file.toMultipartFile(),
        'entityType': 'SUBTASK',
        'entityId': subtaskId,
        'taskId': taskId,
      });
      await _api.dio.post<void>(
        '/attachments/upload',
        data: form,
        options: _api.withOrgHeader(
          organizationId,
          base: Options(contentType: 'multipart/form-data'),
        ),
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }
}
