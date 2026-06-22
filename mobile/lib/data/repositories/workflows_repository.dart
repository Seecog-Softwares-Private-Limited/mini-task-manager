import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../models/workflow.dart';

class WorkflowsRepository {
  WorkflowsRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<List<Workflow>> fetchByProject(String projectId) async {
    try {
      final response = await _api.dio.get<List<dynamic>>(
        '/workflows/project/$projectId',
      );
      return (response.data ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(Workflow.fromJson)
          .toList();
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<List<WorkflowStatus>> fetchStatuses(String workflowId) async {
    try {
      final response = await _api.dio.get<List<dynamic>>(
        '/workflows/$workflowId/statuses',
      );
      final statuses = (response.data ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(WorkflowStatus.fromJson)
          .toList()
        ..sort((a, b) => a.position.compareTo(b.position));
      return statuses;
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<Workflow> createDefaultWorkflow(String projectId) async {
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/workflows/project/$projectId/default',
      );
      return Workflow.fromJson(response.data!);
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }
}
