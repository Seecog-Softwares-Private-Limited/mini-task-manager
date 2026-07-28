import 'dart:convert';

import '../../core/utils/html_plain_text.dart';
import 'subtask_completion_record.dart';

class TaskSubtask {
  const TaskSubtask({
    required this.id,
    required this.title,
    required this.completed,
    this.description,
    this.assigneeId,
    this.assigneeIds = const [],
    this.dueDate,
    this.dueTime,
    this.status,
    this.priority,
    this.statusId,
    this.completionRecord,
    this.reporterId,
    this.createdAt,
    this.completedAt,
    this.note,
    this.requireLocation = false,
  });

  final String id;
  final String title;
  final bool completed;
  final String? description;
  final String? assigneeId;
  final List<String> assigneeIds;
  final String? dueDate;
  final String? dueTime;
  final String? status;
  final String? priority;
  final String? statusId;
  final SubtaskCompletionRecord? completionRecord;
  final String? reporterId;
  final String? createdAt;
  /// ISO timestamp when marked done (lightweight; survives when full record is omitted).
  final String? completedAt;
  final String? note;
  final bool requireLocation;

  /// Best available completion timestamp for UI chips.
  String? get effectiveCompletedAt {
    final top = completedAt?.trim();
    if (top != null && top.isNotEmpty) return top;
    final fromRecord = completionRecord?.completedAt.trim();
    if (fromRecord != null && fromRecord.isNotEmpty) return fromRecord;
    return null;
  }

  factory TaskSubtask.fromJson(Map<String, dynamic> json) {
    final rawRecord = json['completionRecord'];
    Map<String, dynamic>? recordMap;
    if (rawRecord is Map<String, dynamic>) {
      recordMap = rawRecord;
    } else if (rawRecord is Map) {
      recordMap = Map<String, dynamic>.from(rawRecord);
    }
    final record = recordMap != null
        ? SubtaskCompletionRecord.fromJson(recordMap)
        : null;
    final completedAt = _nullableString(json['completedAt']) ??
        (record?.completedAt.trim().isNotEmpty == true
            ? record!.completedAt
            : null);
    return TaskSubtask(
      id: json['id']?.toString() ?? '',
      title: stripHtmlToPlainText(json['title']?.toString()),
      completed: json['completed'] as bool? ?? false,
      description: _nullableString(json['description']),
      assigneeId: _nullableString(json['assigneeId']),
      assigneeIds: _parseStringList(json['assigneeIds']),
      dueDate: _nullableDateString(json['dueDate']),
      dueTime: _nullableString(json['dueTime']),
      status: _nullableString(json['status']),
      priority: _nullableString(json['priority']),
      statusId: _nullableString(json['statusId']),
      completionRecord: record,
      reporterId: _nullableString(json['reporterId']),
      createdAt: _nullableString(json['createdAt']),
      completedAt: completedAt,
      note: _nullableString(json['note']),
      requireLocation: json['requireLocation'] == true,
    );
  }

  /// Prefer [server] fields, but keep a local completion stamp if the API
  /// response dropped it (common after older servers / web toggles).
  static TaskSubtask coalesce(TaskSubtask local, TaskSubtask server) {
    var next = server;
    final serverStamp = server.effectiveCompletedAt;
    final localStamp = local.effectiveCompletedAt;
    if (server.completed &&
        (serverStamp == null || serverStamp.isEmpty) &&
        localStamp != null &&
        localStamp.isNotEmpty) {
      final src = local.completionRecord?.deviceInfo['source']?.toString();
      if (src != 'server') {
        next = next.copyWith(
          completionRecord: local.completionRecord,
          completedAt: localStamp,
        );
      }
    } else if (server.completed &&
        (server.completedAt == null || server.completedAt!.trim().isEmpty) &&
        serverStamp != null &&
        serverStamp.isNotEmpty) {
      next = next.copyWith(completedAt: serverStamp);
    }
    return next;
  }

  TaskSubtask copyWith({
    String? id,
    String? title,
    bool? completed,
    String? description,
    String? assigneeId,
    List<String>? assigneeIds,
    String? dueDate,
    String? dueTime,
    String? status,
    String? priority,
    String? statusId,
    SubtaskCompletionRecord? completionRecord,
    bool clearCompletionRecord = false,
    String? reporterId,
    String? createdAt,
    String? completedAt,
    bool clearCompletedAt = false,
    String? note,
    bool clearNote = false,
    bool clearDueDate = false,
    bool clearDueTime = false,
    bool? requireLocation,
  }) {
    return TaskSubtask(
      id: id ?? this.id,
      title: title ?? this.title,
      completed: completed ?? this.completed,
      description: description ?? this.description,
      assigneeId: assigneeId ?? this.assigneeId,
      assigneeIds: assigneeIds ?? this.assigneeIds,
      dueDate: clearDueDate ? null : (dueDate ?? this.dueDate),
      dueTime: clearDueTime || clearDueDate ? null : (dueTime ?? this.dueTime),
      status: status ?? this.status,
      priority: priority ?? this.priority,
      statusId: statusId ?? this.statusId,
      completionRecord:
          clearCompletionRecord ? null : (completionRecord ?? this.completionRecord),
      reporterId: reporterId ?? this.reporterId,
      createdAt: createdAt ?? this.createdAt,
      completedAt:
          clearCompletedAt ? null : (completedAt ?? this.completedAt),
      note: clearNote ? null : (note ?? this.note),
      requireLocation: requireLocation ?? this.requireLocation,
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
    this.dueTime,
    this.completedAt,
    this.subtasks = const [],
    this.recurringTemplateId,
    this.recurrenceType,
    this.recurrenceSequence,
    this.requireLocation = false,
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
  final String? dueTime;
  final String? completedAt;
  final int loggedMinutes;
  final List<TaskSubtask> subtasks;
  final String? recurringTemplateId;
  final String? recurrenceType;
  final int? recurrenceSequence;
  final bool requireLocation;
  final String createdAt;
  final String updatedAt;

  int get completedSubtasks => subtasks.where((s) => s.completed).length;

  factory Task.fromJson(Map<String, dynamic> json) {
    return Task(
      id: _asString(json['id']),
      projectId: _asString(json['projectId']),
      organizationId: _asString(json['organizationId']),
      title: stripHtmlToPlainText(_asString(json['title'])),
      description: _nullableString(json['description']),
      statusId: _nullableString(json['statusId']),
      priority: _asString(json['priority'], fallback: 'medium'),
      assigneeId: _nullableString(json['assigneeId']),
      assigneeIds: _parseStringList(json['assigneeIds']),
      tags: _parseTags(json['tags']),
      reporterId: _asString(json['reporterId']),
      dueDate: _nullableDateString(json['dueDate']),
      dueTime: _nullableString(json['dueTime']),
      completedAt: _nullableDateString(json['completedAt']),
      loggedMinutes: json['loggedMinutes'] is int
          ? json['loggedMinutes'] as int
          : int.tryParse('${json['loggedMinutes']}') ?? 0,
      subtasks: _parseSubtasks(json['subtasks']),
      recurringTemplateId: _nullableString(json['recurringTemplateId']),
      recurrenceType: _nullableString(json['recurrenceType']),
      recurrenceSequence: json['recurrenceSequence'] is int
          ? json['recurrenceSequence'] as int
          : int.tryParse('${json['recurrenceSequence']}'),
      requireLocation: json['requireLocation'] == true,
      createdAt: _nullableDateString(json['createdAt']) ?? '',
      updatedAt: _nullableDateString(json['updatedAt']) ?? '',
    );
  }

  Task copyWith({
    String? statusId,
    List<TaskSubtask>? subtasks,
    String? title,
    String? priority,
    String? dueDate,
    String? dueTime,
    bool clearDueDate = false,
    bool clearDueTime = false,
    List<String>? tags,
    List<String>? assigneeIds,
    bool? requireLocation,
  }) {
    return Task(
      id: id,
      projectId: projectId,
      organizationId: organizationId,
      title: title ?? this.title,
      description: description,
      statusId: statusId ?? this.statusId,
      priority: priority ?? this.priority,
      assigneeId: assigneeId,
      assigneeIds: assigneeIds ?? this.assigneeIds,
      tags: tags ?? this.tags,
      reporterId: reporterId,
      dueDate: clearDueDate ? null : (dueDate ?? this.dueDate),
      dueTime: clearDueDate || clearDueTime ? null : (dueTime ?? this.dueTime),
      completedAt: completedAt,
      loggedMinutes: loggedMinutes,
      subtasks: subtasks ?? this.subtasks,
      recurringTemplateId: recurringTemplateId,
      recurrenceType: recurrenceType,
      recurrenceSequence: recurrenceSequence,
      requireLocation: requireLocation ?? this.requireLocation,
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

String _asString(dynamic value, {String fallback = ''}) {
  if (value == null) return fallback;
  return value.toString();
}

String? _nullableString(dynamic value) {
  if (value == null) return null;
  final text = value.toString().trim();
  return text.isEmpty ? null : text;
}

String? _nullableDateString(dynamic value) {
  if (value == null) return null;
  if (value is String) return value;
  if (value is DateTime) return value.toIso8601String();
  return value.toString();
}

List<String> _parseStringList(dynamic raw) {
  if (raw is! List) return const [];
  return raw.map((item) => item.toString()).where((item) => item.isNotEmpty).toList();
}

List<TaskSubtask> _parseSubtasks(dynamic rawSubtasks) {
  final items = <Map<String, dynamic>>[];

  void addItem(dynamic item) {
    if (item is Map<String, dynamic>) {
      items.add(item);
    }
  }

  if (rawSubtasks is List) {
    for (final item in rawSubtasks) {
      addItem(item);
    }
  } else if (rawSubtasks is String && rawSubtasks.trim().isNotEmpty) {
    try {
      final decoded = jsonDecode(rawSubtasks);
      if (decoded is List) {
        for (final item in decoded) {
          addItem(item);
        }
      }
    } catch (_) {
      return const [];
    }
  }

  return items.map(TaskSubtask.fromJson).toList();
}
