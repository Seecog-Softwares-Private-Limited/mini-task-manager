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

class RecurringOccurrence {
  const RecurringOccurrence({
    required this.id,
    required this.templateId,
    required this.dueDate,
    required this.state,
    required this.sequenceNumber,
    this.taskId,
    this.completedAt,
  });

  final String id;
  final String templateId;
  final String dueDate;
  final String state;
  final int sequenceNumber;
  final String? taskId;
  final String? completedAt;

  factory RecurringOccurrence.fromJson(Map<String, dynamic> json) {
    return RecurringOccurrence(
      id: json['id'] as String? ?? '',
      templateId: json['templateId'] as String? ?? '',
      dueDate: json['dueDate']?.toString() ?? '',
      state: json['state'] as String? ?? 'PENDING',
      sequenceNumber: json['sequenceNumber'] as int? ?? 0,
      taskId: json['taskId'] as String?,
      completedAt: json['completedAt']?.toString(),
    );
  }
}

/// Aggregate + per-habit success analytics for a trailing window.
class RecurringAnalytics {
  const RecurringAnalytics({
    required this.rangeDays,
    required this.overall,
    required this.habits,
  });

  final int rangeDays;
  final RecurringAnalyticsOverall overall;
  final List<RecurringHabitStat> habits;

  factory RecurringAnalytics.fromJson(Map<String, dynamic> json) {
    final rawHabits = json['habits'] as List<dynamic>? ?? const [];
    return RecurringAnalytics(
      rangeDays: json['rangeDays'] as int? ?? 30,
      overall: RecurringAnalyticsOverall.fromJson(
        (json['overall'] as Map<String, dynamic>?) ?? const {},
      ),
      habits: rawHabits
          .whereType<Map<String, dynamic>>()
          .map(RecurringHabitStat.fromJson)
          .toList(),
    );
  }
}

class RecurringAnalyticsOverall {
  const RecurringAnalyticsOverall({
    required this.habits,
    required this.totalRuns,
    required this.completed,
    required this.missed,
    required this.skipped,
    required this.successRate,
    required this.bestStreak,
  });

  final int habits;
  final int totalRuns;
  final int completed;
  final int missed;
  final int skipped;
  final int successRate;
  final int bestStreak;

  factory RecurringAnalyticsOverall.fromJson(Map<String, dynamic> json) {
    return RecurringAnalyticsOverall(
      habits: json['habits'] as int? ?? 0,
      totalRuns: json['totalRuns'] as int? ?? 0,
      completed: json['completed'] as int? ?? 0,
      missed: json['missed'] as int? ?? 0,
      skipped: json['skipped'] as int? ?? 0,
      successRate: json['successRate'] as int? ?? 0,
      bestStreak: json['bestStreak'] as int? ?? 0,
    );
  }
}

class RecurringHabitStat {
  const RecurringHabitStat({
    required this.templateId,
    required this.title,
    required this.repeatType,
    required this.isPaused,
    required this.total,
    required this.completed,
    required this.missed,
    required this.skipped,
    required this.successRate,
    required this.currentStreak,
    required this.longestStreak,
    required this.onTimeRate,
    required this.recentRuns,
  });

  final String templateId;
  final String title;
  final String repeatType;
  final bool isPaused;
  final int total;
  final int completed;
  final int missed;
  final int skipped;
  final int successRate;
  final int currentStreak;
  final int longestStreak;
  final int onTimeRate;

  /// Oldest→newest run outcomes: 'completed' | 'missed' | 'skipped'.
  final List<String> recentRuns;

  factory RecurringHabitStat.fromJson(Map<String, dynamic> json) {
    return RecurringHabitStat(
      templateId: json['templateId'] as String? ?? '',
      title: json['title'] as String? ?? 'Untitled',
      repeatType: json['repeatType'] as String? ?? 'WEEKLY',
      isPaused: parseJsonBool(json['isPaused']),
      total: json['total'] as int? ?? 0,
      completed: json['completed'] as int? ?? 0,
      missed: json['missed'] as int? ?? 0,
      skipped: json['skipped'] as int? ?? 0,
      successRate: json['successRate'] as int? ?? 0,
      currentStreak: json['currentStreak'] as int? ?? 0,
      longestStreak: json['longestStreak'] as int? ?? 0,
      onTimeRate: json['onTimeRate'] as int? ?? 0,
      recentRuns: (json['recentRuns'] as List<dynamic>? ?? const [])
          .map((e) => e.toString())
          .toList(),
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
