import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../models/paginated_result.dart';
import '../models/task.dart';

class TasksRepository {
  TasksRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<PaginatedResult<Task>> fetchByProject({
    required String projectId,
    required String organizationId,
    int page = 1,
    int limit = 100,
  }) async {
    try {
      final response = await _api.dio.get<Map<String, dynamic>>(
        '/tasks/project/$projectId',
        queryParameters: {'page': page, 'limit': limit},
        options: _api.withOrgHeader(organizationId),
      );
      final body = response.data ?? const {};
      final rawData = body['data'] as List<dynamic>? ?? const [];
      final meta = PaginatedMeta.fromJson(
        (body['meta'] as Map<String, dynamic>?) ?? const {},
      );
      return PaginatedResult(
        data: rawData
            .whereType<Map<String, dynamic>>()
            .map(Task.fromJson)
            .toList(),
        meta: meta,
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<Task> fetchTask(String taskId) async {
    try {
      final response = await _api.dio.get<Map<String, dynamic>>('/tasks/$taskId');
      return Task.fromJson(response.data!);
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<Task> createTask({
    required String projectId,
    required String organizationId,
    required String title,
    String? description,
    String? statusId,
    String priority = 'MEDIUM',
    String? dueDate,
    List<CreateTaskSubtaskInput>? subtasks,
  }) async {
    try {
      final payload = <String, dynamic>{
        'projectId': projectId,
        'organizationId': organizationId,
        'title': title.trim(),
        'priority': priority.toUpperCase(),
        if (statusId != null) 'statusId': statusId,
        if (description != null && description.trim().isNotEmpty)
          'description': description.trim(),
        if (dueDate != null && dueDate.isNotEmpty) 'dueDate': dueDate,
        if (subtasks != null && subtasks.isNotEmpty)
          'subtasks': subtasks.map((s) => s.toJson()).toList(),
      };
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/tasks',
        data: payload,
        options: _api.withOrgHeader(organizationId),
      );
      return Task.fromJson(response.data!);
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<Task> updateTask({
    required String taskId,
    String? title,
    String? statusId,
    List<TaskSubtask>? subtasks,
  }) async {
    try {
      final data = <String, dynamic>{};
      if (title != null) data['title'] = title.trim();
      if (statusId != null) data['statusId'] = statusId;
      if (subtasks != null) {
        data['subtasks'] = subtasks
            .map(
              (s) => {
                'id': s.id,
                'title': s.title,
                'completed': s.completed,
              },
            )
            .toList();
      }
      final response = await _api.dio.patch<Map<String, dynamic>>(
        '/tasks/$taskId',
        data: data,
      );
      return Task.fromJson(response.data!);
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<Task> updateStatus({
    required String taskId,
    required String? statusId,
  }) async {
    return updateTask(taskId: taskId, statusId: statusId);
  }
}

class CreateTaskSubtaskInput {
  const CreateTaskSubtaskInput({
    required this.clientId,
    required this.title,
    this.description = '',
    this.priority = 'MEDIUM',
  });

  final String clientId;
  final String title;
  final String description;
  final String priority;

  Map<String, dynamic> toJson() {
    return {
      'id': clientId,
      'title': title.trim(),
      if (description.trim().isNotEmpty) 'description': description.trim(),
      'completed': false,
      'status': 'TODO',
      'priority': priority.toUpperCase(),
    };
  }
}
