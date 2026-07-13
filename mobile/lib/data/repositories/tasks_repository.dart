import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../models/paginated_result.dart';
import '../models/task_attachment.dart';
import '../models/task_comment.dart';
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
    String? dueTime,
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
        if (dueDate != null &&
            dueDate.isNotEmpty &&
            dueTime != null &&
            dueTime.isNotEmpty)
          'dueTime': dueTime,
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
    String? description,
    String? statusId,
    List<String>? assigneeIds,
    String? priority,
    String? dueDate,
    bool clearDueDate = false,
    String? dueTime,
    bool clearDueTime = false,
    List<String>? tags,
    List<TaskSubtask>? subtasks,
  }) async {
    try {
      final data = <String, dynamic>{};
      if (title != null) data['title'] = title.trim();
      if (description != null) data['description'] = description.trim();
      if (statusId != null) data['statusId'] = statusId;
      if (assigneeIds != null) data['assigneeIds'] = assigneeIds;
      if (priority != null) data['priority'] = priority.toUpperCase();
      if (clearDueDate) {
        data['dueDate'] = null;
        data['dueTime'] = null;
      } else if (dueDate != null) {
        data['dueDate'] = dueDate;
      }
      if (clearDueTime) {
        data['dueTime'] = null;
      } else if (dueTime != null) {
        data['dueTime'] = dueTime;
      }
      if (tags != null) {
        data['tags'] = tags
            .map((name) => {'name': name, 'color': '#8B5CF6'})
            .toList();
      }
      if (subtasks != null) {
        data['subtasks'] = subtasks
            .map(
              (s) => {
                'id': s.id,
                'title': s.title,
                'completed': s.completed,
                if (s.description != null) 'description': s.description,
                if (s.assigneeId != null) 'assigneeId': s.assigneeId,
                if (s.assigneeIds.isNotEmpty) 'assigneeIds': s.assigneeIds,
                if (s.dueDate != null) 'dueDate': s.dueDate,
                if (s.dueTime != null) 'dueTime': s.dueTime,
                if (s.status != null) 'status': s.status,
                if (s.priority != null) 'priority': s.priority,
                if (s.statusId != null) 'statusId': s.statusId,
                if (s.completionRecord != null)
                  'completionRecord': s.completionRecord!.toJson(),
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

  Future<List<TaskComment>> fetchComments(String taskId) async {
    try {
      final response = await _api.dio.get<List<dynamic>>('/tasks/$taskId/comments');
      final list = response.data ?? const [];
      return list
          .whereType<Map<String, dynamic>>()
          .map(TaskComment.fromJson)
          .toList();
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<TaskComment> addComment({
    required String taskId,
    required String body,
  }) async {
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/tasks/$taskId/comments',
        data: {'body': body},
      );
      return TaskComment.fromJson(response.data ?? const {});
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<List<TaskAttachment>> fetchAttachments(String taskId) async {
    try {
      final response = await _api.dio.get<List<dynamic>>('/tasks/$taskId/attachments');
      final list = response.data ?? const [];
      return list
          .whereType<Map<String, dynamic>>()
          .map(TaskAttachment.fromJson)
          .toList();
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
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
