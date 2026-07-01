import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../models/recurring.dart';
import '../models/task.dart';

class RecurringRepository {
  RecurringRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<RecurringSummary> fetchSummary({
    required String organizationId,
    String? projectId,
  }) async {
    try {
      final response = await _api.dio.get<Map<String, dynamic>>(
        '/recurring-tasks/summary',
        queryParameters: projectId != null ? {'projectId': projectId} : null,
        options: _api.withOrgHeader(organizationId),
      );
      return RecurringSummary.fromJson(response.data ?? const {});
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<List<RecurringTemplate>> fetchTemplates({
    required String organizationId,
    String? projectId,
  }) async {
    try {
      final response = await _api.dio.get<List<dynamic>>(
        '/recurring-tasks',
        queryParameters: projectId != null ? {'projectId': projectId} : null,
        options: _api.withOrgHeader(organizationId),
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
    required String organizationId,
    required String projectId,
    List<String> statusIds = const [],
    bool sync = false,
    bool calendarOnly = true,
  }) async {
    try {
      final response = await _api.dio.get<Map<String, dynamic>>(
        '/recurring-tasks/board',
        queryParameters: {
          'projectId': projectId,
          if (statusIds.isNotEmpty) 'statusIds': statusIds.join(','),
          'sync': sync ? 'true' : 'false',
          'calendarOnly': calendarOnly ? 'true' : 'false',
        },
        options: _api.withOrgHeader(organizationId),
      );
      final raw = response.data?['tasks'] as List<dynamic>? ?? const [];
      return raw.whereType<Map<String, dynamic>>().map(Task.fromJson).toList();
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<void> syncBoard({
    required String organizationId,
    required String projectId,
  }) async {
    try {
      await _api.dio.post<void>(
        '/recurring-tasks/sync',
        queryParameters: {'projectId': projectId},
        options: _api.withOrgHeader(organizationId),
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<void> pauseTemplate({
    required String templateId,
    required String organizationId,
  }) async {
    try {
      await _api.dio.post<void>(
        '/recurring-tasks/$templateId/pause',
        options: _api.withOrgHeader(organizationId),
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<void> resumeTemplate({
    required String templateId,
    required String organizationId,
  }) async {
    try {
      await _api.dio.post<void>(
        '/recurring-tasks/$templateId/resume',
        options: _api.withOrgHeader(organizationId),
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<List<RecurringOccurrence>> fetchTemplateHistory({
    required String templateId,
    required String organizationId,
  }) async {
    try {
      final response = await _api.dio.get<List<dynamic>>(
        '/recurring-tasks/$templateId/history',
        options: _api.withOrgHeader(organizationId),
      );
      return (response.data ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(RecurringOccurrence.fromJson)
          .toList();
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }
}
