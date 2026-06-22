import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../models/recurring.dart';
import '../models/task.dart';

class RecurringRepository {
  RecurringRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<RecurringSummary> fetchSummary({String? projectId}) async {
    try {
      final response = await _api.dio.get<Map<String, dynamic>>(
        '/recurring-tasks/summary',
        queryParameters: projectId != null ? {'projectId': projectId} : null,
      );
      return RecurringSummary.fromJson(response.data ?? const {});
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<List<RecurringTemplate>> fetchTemplates({String? projectId}) async {
    try {
      final response = await _api.dio.get<List<dynamic>>(
        '/recurring-tasks',
        queryParameters: projectId != null ? {'projectId': projectId} : null,
      );
      return (response.data ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(RecurringTemplate.fromJson)
          .toList();
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<List<Task>> fetchBoardTasks({
    required String projectId,
    List<String> statusIds = const [],
  }) async {
    try {
      final response = await _api.dio.get<Map<String, dynamic>>(
        '/recurring-tasks/board',
        queryParameters: {
          'projectId': projectId,
          if (statusIds.isNotEmpty) 'statusIds': statusIds.join(','),
        },
      );
      final raw = response.data?['tasks'] as List<dynamic>? ?? const [];
      return raw.whereType<Map<String, dynamic>>().map(Task.fromJson).toList();
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<void> pauseTemplate(String templateId) async {
    try {
      await _api.dio.post<void>('/recurring-tasks/$templateId/pause');
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<void> resumeTemplate(String templateId) async {
    try {
      await _api.dio.post<void>('/recurring-tasks/$templateId/resume');
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }
}
