class TaskSubtask {
  const TaskSubtask({
    required this.id,
    required this.title,
    required this.completed,
    this.description,
    this.assigneeId,
    this.assigneeIds = const [],
    this.dueDate,
    this.status,
    this.priority,
    this.statusId,
  });

  final String id;
  final String title;
  final bool completed;
  final String? description;
  final String? assigneeId;
  final List<String> assigneeIds;
  final String? dueDate;
  final String? status;
  final String? priority;
  final String? statusId;

  factory TaskSubtask.fromJson(Map<String, dynamic> json) {
    return TaskSubtask(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      completed: json['completed'] as bool? ?? false,
      description: json['description'] as String?,
      assigneeId: json['assigneeId'] as String?,
      assigneeIds: (json['assigneeIds'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      dueDate: json['dueDate'] as String?,
      status: json['status'] as String?,
      priority: json['priority'] as String?,
      statusId: json['statusId'] as String?,
    );
  }

  TaskSubtask copyWith({
    String? id,
    String? title,
    bool? completed,
    String? description,
    String? assigneeId,
    List<String>? assigneeIds,
    String? dueDate,
    String? status,
    String? priority,
    String? statusId,
  }) {
    return TaskSubtask(
      id: id ?? this.id,
      title: title ?? this.title,
      completed: completed ?? this.completed,
      description: description ?? this.description,
      assigneeId: assigneeId ?? this.assigneeId,
      assigneeIds: assigneeIds ?? this.assigneeIds,
      dueDate: dueDate ?? this.dueDate,
      status: status ?? this.status,
      priority: priority ?? this.priority,
      statusId: statusId ?? this.statusId,
    );
  }
}

class Task {
  const Task({
    required this.id,
    required this.projectId,
    required this.organizationId,
    required this.title,
    required this.priority,
    required this.reporterId,
    required this.loggedMinutes,
    required this.createdAt,
    required this.updatedAt,
    this.description,
    this.statusId,
    this.assigneeId,
    this.assigneeIds = const [],
    this.tags = const [],
    this.dueDate,
    this.subtasks = const [],
  });

  final String id;
  final String projectId;
  final String organizationId;
  final String title;
  final String? description;
  final String? statusId;
  final String priority;
  final String? assigneeId;
  final List<String> assigneeIds;
  final List<String> tags;
  final String reporterId;
  final String? dueDate;
  final int loggedMinutes;
  final List<TaskSubtask> subtasks;
  final String createdAt;
  final String updatedAt;

  int get completedSubtasks => subtasks.where((s) => s.completed).length;

  factory Task.fromJson(Map<String, dynamic> json) {
    final rawSubtasks = json['subtasks'];
    return Task(
      id: json['id'] as String,
      projectId: json['projectId'] as String,
      organizationId: json['organizationId'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      statusId: json['statusId'] as String?,
      priority: json['priority'] as String? ?? 'medium',
      assigneeId: json['assigneeId'] as String?,
      assigneeIds: (json['assigneeIds'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      tags: _parseTags(json['tags']),
      reporterId: json['reporterId'] as String,
      dueDate: json['dueDate'] as String?,
      loggedMinutes: json['loggedMinutes'] as int? ?? 0,
      subtasks: rawSubtasks is List
          ? rawSubtasks
              .whereType<Map<String, dynamic>>()
              .map(TaskSubtask.fromJson)
              .toList()
          : const [],
      createdAt: json['createdAt'] as String? ?? '',
      updatedAt: json['updatedAt'] as String? ?? '',
    );
  }

  Task copyWith({
    String? statusId,
    List<TaskSubtask>? subtasks,
    String? title,
  }) {
    return Task(
      id: id,
      projectId: projectId,
      organizationId: organizationId,
      title: title ?? this.title,
      description: description,
      statusId: statusId ?? this.statusId,
      priority: priority,
      assigneeId: assigneeId,
      assigneeIds: assigneeIds,
      tags: tags,
      reporterId: reporterId,
      dueDate: dueDate,
      loggedMinutes: loggedMinutes,
      subtasks: subtasks ?? this.subtasks,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}

List<String> _parseTags(dynamic rawTags) {
  if (rawTags is! List) return const [];
  return rawTags
      .map((tag) {
        if (tag is String) return tag.trim();
        if (tag is Map<String, dynamic>) {
          final name = (tag['name'] ?? tag['label'] ?? '').toString().trim();
          return name;
        }
        return '';
      })
      .where((tag) => tag.isNotEmpty)
      .toList();
}
