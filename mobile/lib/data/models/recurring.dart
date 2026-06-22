import '../../core/utils/json_bool.dart';

class RecurringSummary {
  const RecurringSummary({
    required this.totalRecurringTasks,
    required this.dueThisWeek,
    required this.overdue,
    required this.completedThisMonth,
    required this.paused,
  });

  final int totalRecurringTasks;
  final int dueThisWeek;
  final int overdue;
  final int completedThisMonth;
  final int paused;

  factory RecurringSummary.fromJson(Map<String, dynamic> json) {
    return RecurringSummary(
      totalRecurringTasks: json['totalRecurringTasks'] as int? ?? 0,
      dueThisWeek: json['dueThisWeek'] as int? ?? 0,
      overdue: json['overdue'] as int? ?? 0,
      completedThisMonth: json['completedThisMonth'] as int? ?? 0,
      paused: json['paused'] as int? ?? 0,
    );
  }
}

class RecurringTemplate {
  const RecurringTemplate({
    required this.id,
    required this.title,
    required this.repeatType,
    required this.nextDueDate,
    required this.isPaused,
    required this.generatedCount,
    required this.upcoming,
    required this.completed,
    this.completionHealth,
    this.subtaskCount,
    this.priority,
  });

  final String id;
  final String title;
  final String repeatType;
  final String nextDueDate;
  final bool isPaused;
  final int generatedCount;
  final int upcoming;
  final int completed;
  final double? completionHealth;
  final int? subtaskCount;
  final String? priority;

  factory RecurringTemplate.fromJson(Map<String, dynamic> json) {
    return RecurringTemplate(
      id: json['id'] as String,
      title: json['title'] as String,
      repeatType: json['repeatType'] as String? ?? 'WEEKLY',
      nextDueDate: json['nextDueDate'] as String? ?? '',
      isPaused: parseJsonBool(json['isPaused']),
      generatedCount: json['generatedCount'] as int? ?? 0,
      upcoming: json['upcoming'] as int? ?? 0,
      completed: json['completed'] as int? ?? 0,
      completionHealth: (json['completionHealth'] as num?)?.toDouble(),
      subtaskCount: json['subtaskCount'] as int?,
      priority: json['priority'] as String?,
    );
  }
}

class RecurringBoardData {
  const RecurringBoardData({
    required this.tasks,
    required this.overdueTaskIds,
  });

  final List<Map<String, dynamic>> tasks;
  final List<String> overdueTaskIds;
}
