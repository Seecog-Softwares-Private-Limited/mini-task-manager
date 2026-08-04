import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../models/home_dashboard.dart';
import '../models/my_tasks.dart';
import '../models/paginated_result.dart';
import '../models/task_attachment.dart';
import '../models/task_comment.dart';
import '../models/subtask_comment.dart';
import '../models/task.dart';

class TasksRepository {
  TasksRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<HomeDashboard> fetchHomeDashboard({
    required String organizationId,
  }) async {
    try {
      final response = await _api.dio.get<Map<String, dynamic>>(
        '/tasks/home',
        options: _api.withOrgHeader(organizationId),
      );
      return HomeDashboard.fromJson(response.data ?? const {});
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<MyTasksResult> fetchMyTasks({
    required String organizationId,
    required String filter,
    int page = 1,
    int limit = 50,
  }) async {
    try {
      final response = await _api.dio.get<Map<String, dynamic>>(
        '/tasks/my',
        queryParameters: {'filter': filter, 'page': page, 'limit': limit},
        options: _api.withOrgHeader(organizationId),
      );
      return MyTasksResult.fromJson(response.data ?? const {});
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<PaginatedResult<Task>> fetchByProject({
    required String projectId,
    required String organizationId,
    int page = 1,
    int limit = 100,
  }) async {
    final safeLimit = limit.clamp(1, 100);
    try {
      final response = await _api.dio.get<Map<String, dynamic>>(
        '/tasks/project/$projectId',
        queryParameters: {'page': page, 'limit': safeLimit},
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

  /// Pages through a project (API max limit is 100) until all tasks are loaded.
  Future<List<Task>> fetchAllByProject({
    required String projectId,
    required String organizationId,
  }) async {
    const pageSize = 100;
    final all = <Task>[];
    var page = 1;
    while (true) {
      final result = await fetchByProject(
        projectId: projectId,
        organizationId: organizationId,
        page: page,
        limit: pageSize,
      );
      all.addAll(result.data);
      final exhausted = result.data.length < pageSize ||
          !result.meta.hasNext ||
          all.length >= result.meta.total;
      if (exhausted || result.data.isEmpty) break;
      page += 1;
      if (page > 50) break; // safety cap
    }
    return all;
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
    bool requireLocation = false,
    List<CreateTaskSubtaskInput>? subtasks,
  }) async {
    try {
      final payload = <String, dynamic>{
        'projectId': projectId,
        'organizationId': organizationId,
        'title': title.trim(),
        'priority': priority.toUpperCase(),
        'requireLocation': requireLocation,
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
    bool? requireLocation,
  }) async {
    final omitSubtaskKeys = <String>{};
    DioException? lastError;

    for (var attempt = 0; attempt < 4; attempt++) {
      try {
        final data = _buildUpdatePayload(
          title: title,
          description: description,
          statusId: statusId,
          assigneeIds: assigneeIds,
          priority: priority,
          dueDate: dueDate,
          clearDueDate: clearDueDate,
          dueTime: dueTime,
          clearDueTime: clearDueTime,
          tags: tags,
          subtasks: subtasks,
          requireLocation: requireLocation,
          omitSubtaskKeys: omitSubtaskKeys,
        );
        final response = await _api.dio.patch<Map<String, dynamic>>(
          '/tasks/$taskId',
          data: data,
        );
        return Task.fromJson(response.data!);
      } on DioException catch (error) {
        lastError = error;
        if (_mentionsForbiddenProperty(error, 'requireLocation')) {
          throw ApiException(
            message:
                'Server is missing requireLocation support. Redeploy/restart the API on the VPS, then try again.',
            statusCode: error.response?.statusCode,
          );
        }
        if (subtasks == null) break;
        final forbidden = _forbiddenSubtaskProperties(error)
          // Never silently drop location — that makes the toggle look broken.
          ..remove('requireLocation')
          // Keep full completionRecord; top-level completedAt may be stripped
          // on older APIs (chip still uses completionRecord.completedAt).
          ..remove('completionRecord');
        final next = forbidden.difference(omitSubtaskKeys);
        if (next.isEmpty) break;
        omitSubtaskKeys.addAll(next);
      }
    }

    throw ApiException.fromDio(lastError!);
  }

  /// Move a checklist item to another task in the same project.
  Future<({Task source, Task target})> moveSubtask({
    required String sourceTaskId,
    required String subtaskId,
    required String targetTaskId,
  }) async {
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/tasks/$sourceTaskId/subtasks/$subtaskId/move',
        data: {'targetTaskId': targetTaskId},
      );
      final body = response.data ?? const {};
      final sourceJson = body['source'];
      final targetJson = body['target'];
      if (sourceJson is! Map<String, dynamic> ||
          targetJson is! Map<String, dynamic>) {
        throw const ApiException(message: 'Invalid move subtask response');
      }
      return (
        source: Task.fromJson(sourceJson),
        target: Task.fromJson(targetJson),
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Map<String, dynamic> _buildUpdatePayload({
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
    bool? requireLocation,
    Set<String> omitSubtaskKeys = const {},
  }) {
    final data = <String, dynamic>{};
    if (title != null) data['title'] = title.trim();
    if (description != null) data['description'] = description.trim();
    if (statusId != null) data['statusId'] = statusId;
    if (assigneeIds != null) data['assigneeIds'] = assigneeIds;
    if (priority != null) data['priority'] = priority.toUpperCase();
    if (requireLocation != null) data['requireLocation'] = requireLocation;
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
      data['tags'] =
          tags.map((name) => {'name': name, 'color': '#8B5CF6'}).toList();
    }
    if (subtasks != null) {
      data['subtasks'] = subtasks.map((s) {
        final row = <String, dynamic>{
          'id': s.id,
          'title': s.title,
          'completed': s.completed,
        };
        void put(String key, Object? value) {
          if (omitSubtaskKeys.contains(key) || value == null) return;
          row[key] = value;
        }

        put('description', s.description);
        put('assigneeId', s.assigneeId);
        if (!omitSubtaskKeys.contains('assigneeIds') &&
            s.assigneeIds.isNotEmpty) {
          row['assigneeIds'] = s.assigneeIds;
        }
        put('dueDate', s.dueDate);
        if (!omitSubtaskKeys.contains('dueTime')) {
          row.addAll(_normalizedDueTimeField(s.dueTime));
        }
        put('status', s.status);
        put('priority', s.priority);
        put('statusId', s.statusId);
        if (!omitSubtaskKeys.contains('completionRecord') &&
            s.completionRecord != null) {
          row['completionRecord'] = s.completionRecord!.toJson();
        }
        final completedAt = s.effectiveCompletedAt;
        if (!omitSubtaskKeys.contains('completedAt') &&
            completedAt != null &&
            completedAt.isNotEmpty &&
            s.completed) {
          row['completedAt'] = completedAt;
        }
        if (!omitSubtaskKeys.contains('note') &&
            s.note != null &&
            s.note!.isNotEmpty) {
          row['note'] = s.note;
        }
        if (!omitSubtaskKeys.contains('requireLocation')) {
          row['requireLocation'] = s.requireLocation;
        }
        return row;
      }).toList();
    }
    return data;
  }

  static final _hhMm = RegExp(r'^([01]\d|2[0-3]):([0-5]\d)');
  static final _forbiddenProp = RegExp(
    r'subtasks\.\d+\.property\s+(\w+)\s+should not exist',
    caseSensitive: false,
  );

  bool _mentionsForbiddenProperty(DioException error, String property) {
    for (final m in _errorMessages(error)) {
      if (m.contains(property) && m.contains('should not exist')) return true;
    }
    return false;
  }

  List<String> _errorMessages(DioException error) {
    final data = error.response?.data;
    final messages = <String>[];
    if (data is Map && data['message'] is List) {
      messages.addAll((data['message'] as List).map((e) => e.toString()));
    } else if (data is Map && data['message'] != null) {
      messages.add(data['message'].toString());
    } else if (data is List) {
      messages.addAll(data.map((e) => e.toString()));
    }
    return messages;
  }

  Map<String, String> _normalizedDueTimeField(String? dueTime) {
    final raw = dueTime?.trim() ?? '';
    if (raw.isEmpty) return const {};
    final match = _hhMm.firstMatch(raw);
    if (match == null) return const {};
    return {'dueTime': '${match.group(1)}:${match.group(2)}'};
  }

  Set<String> _forbiddenSubtaskProperties(DioException error) {
    final keys = <String>{};
    for (final m in _errorMessages(error)) {
      for (final match in _forbiddenProp.allMatches(m)) {
        final key = match.group(1);
        if (key != null && key.isNotEmpty) keys.add(key);
      }
      for (final key in const [
        'dueTime',
        'reporterId',
        'createdAt',
        'completedAt',
        'note',
        'completionRecord',
      ]) {
        if (m.contains(key) && m.contains('should not exist')) {
          keys.add(key);
        }
      }
    }
    return keys;
  }

  Future<Task> updateStatus({
    required String taskId,
    required String? statusId,
  }) async {
    return updateTask(taskId: taskId, statusId: statusId);
  }

  Future<void> deleteTask(String taskId) async {
    try {
      await _api.dio.delete<void>('/tasks/$taskId');
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
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

  Future<List<SubtaskComment>> fetchSubtaskComments({
    required String taskId,
    required String subtaskId,
  }) async {
    try {
      final response = await _api.dio.get<List<dynamic>>(
        '/tasks/$taskId/subtasks/$subtaskId/comments',
      );
      final list = response.data ?? const [];
      return list
          .whereType<Map<String, dynamic>>()
          .map(SubtaskComment.fromJson)
          .toList();
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<SubtaskComment> addSubtaskComment({
    required String taskId,
    required String subtaskId,
    required String body,
    String? parentId,
  }) async {
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/tasks/$taskId/subtasks/$subtaskId/comments',
        data: {
          'body': body,
          if (parentId != null && parentId.isNotEmpty) 'parentId': parentId,
        },
      );
      return SubtaskComment.fromJson(response.data ?? const {});
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<SubtaskComment> updateSubtaskComment({
    required String taskId,
    required String subtaskId,
    required String commentId,
    required String body,
  }) async {
    try {
      final response = await _api.dio.patch<Map<String, dynamic>>(
        '/tasks/$taskId/subtasks/$subtaskId/comments/$commentId',
        data: {'body': body},
      );
      return SubtaskComment.fromJson(response.data ?? const {});
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<void> deleteSubtaskComment({
    required String taskId,
    required String subtaskId,
    required String commentId,
  }) async {
    try {
      await _api.dio.delete<void>(
        '/tasks/$taskId/subtasks/$subtaskId/comments/$commentId',
      );
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
    this.requireLocation = false,
  });

  final String clientId;
  final String title;
  final String description;
  final String priority;
  final bool requireLocation;

  Map<String, dynamic> toJson() {
    return {
      'id': clientId,
      'title': title.trim(),
      if (description.trim().isNotEmpty) 'description': description.trim(),
      'completed': false,
      'status': 'TODO',
      'priority': priority.toUpperCase(),
      if (requireLocation) 'requireLocation': true,
    };
  }
}
