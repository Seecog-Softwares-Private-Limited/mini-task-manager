import '../../core/utils/json_bool.dart';
import 'dart:convert';

class RecurringTemplateSubtask {
  const RecurringTemplateSubtask({
    required this.title,
    this.id,
    this.dueTime,
    this.description,
    this.priority,
    this.assigneeId,
    this.assigneeIds = const [],
  });

  final String? id;
  final String title;
  final String? dueTime;
  final String? description;
  final String? priority;
  final String? assigneeId;
  final List<String> assigneeIds;

  factory RecurringTemplateSubtask.fromJson(Map<String, dynamic> json) {
    final fromList = json['assigneeIds'];
    final assigneeIds = fromList is List
        ? fromList
            .map((e) => e?.toString())
            .whereType<String>()
            .where((id) => id.isNotEmpty)
            .toList()
        : <String>[];
    final single = json['assigneeId']?.toString();
    if (assigneeIds.isEmpty && single != null && single.isNotEmpty) {
      assigneeIds.add(single);
    }
    return RecurringTemplateSubtask(
      id: json['id']?.toString(),
      title: json['title'] as String? ?? '',
      dueTime: json['dueTime'] as String?,
      description: json['description'] as String?,
      priority: json['priority'] as String?,
      assigneeId: single,
      assigneeIds: assigneeIds,
    );
  }
}

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
    required this.missed,
    this.description,
    this.completionHealth,
    this.subtaskCount,
    this.templateSubtasks = const [],
    this.priority,
    this.assigneeIds = const [],
    this.startDueDate,
    this.endType,
    this.endDate,
    this.endAfterOccurrences,
    this.interval,
    this.weeklyDays = const [],
    this.rawRuleConfig,
  });

  final String id;
  final String title;
  final String? description;
  final String repeatType;
  final String nextDueDate;
  final bool isPaused;
  final int generatedCount;
  final int upcoming;
  final int completed;
  final int missed;
  final double? completionHealth;
  final int? subtaskCount;
  final List<RecurringTemplateSubtask> templateSubtasks;
  final String? priority;
  final List<String> assigneeIds;

  // Recurrence detail (for lossless editing).
  final String? startDueDate;
  final String? endType;
  final String? endDate;
  final int? endAfterOccurrences;
  final int? interval;
  final List<int> weeklyDays;

  /// Full recurrence rule as stored by the backend. Used to preserve advanced
  /// settings (monthlyMode, nthWeek, dueTime, skipWeekends, completionRule,
  /// createDaysBeforeDue) when editing, since updateTemplate replaces ruleConfig.
  final Map<String, dynamic>? rawRuleConfig;

  /// Missed-aware success rate (0-100), or null when there is nothing resolved
  /// yet. Prefer this over [completionHealth] for display.
  int? get successRate {
    final resolved = completed + missed;
    if (resolved <= 0) return null;
    return ((completed / resolved) * 100).round();
  }

  factory RecurringTemplate.fromJson(Map<String, dynamic> json) {
    final rule = json['ruleConfig'] as Map<String, dynamic>?;
    final rawWeekly = rule?['weeklyDays'] as List<dynamic>?;
    return RecurringTemplate(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      repeatType: json['repeatType'] as String? ?? 'WEEKLY',
      nextDueDate: json['nextDueDate'] as String? ?? '',
      isPaused: parseJsonBool(json['isPaused']),
      generatedCount: json['generatedCount'] as int? ?? 0,
      upcoming: json['upcoming'] as int? ?? 0,
      completed: json['completed'] as int? ?? 0,
      missed: json['missed'] as int? ?? 0,
      completionHealth: (json['completionHealth'] as num?)?.toDouble(),
      subtaskCount: json['subtaskCount'] as int?,
      templateSubtasks: _parseTemplateSubtasks(json['templateSubtasks']),
      priority: json['priority'] as String?,
      assigneeIds: _parseAssigneeIds(json),
      startDueDate: json['startDueDate']?.toString(),
      endType: json['endType'] as String?,
      endDate: json['endDate']?.toString(),
      endAfterOccurrences: (json['endAfterOccurrences'] as num?)?.toInt(),
      interval: (rule?['interval'] as num?)?.toInt(),
      weeklyDays: rawWeekly == null
          ? const []
          : rawWeekly
              .map((e) => (e as num?)?.toInt())
              .whereType<int>()
              .toList(),
      rawRuleConfig: rule,
    );
  }

  static List<RecurringTemplateSubtask> _parseTemplateSubtasks(dynamic raw) {
    List<dynamic>? list;
    if (raw is List) {
      list = raw;
    } else if (raw is String && raw.trim().isNotEmpty) {
      try {
        final decoded = jsonDecode(raw);
        if (decoded is List) list = decoded;
      } catch (_) {
        return const [];
      }
    }
    if (list == null || list.isEmpty) return const [];
    final out = <RecurringTemplateSubtask>[];
    for (final e in list) {
      if (e is! Map) continue;
      final item = RecurringTemplateSubtask.fromJson(
        Map<String, dynamic>.from(e),
      );
      if (item.title.trim().isNotEmpty) out.add(item);
    }
    return out;
  }

  static List<String> _parseAssigneeIds(Map<String, dynamic> json) {
    final fromList = json['assigneeIds'];
    if (fromList is List) {
      return fromList.map((e) => e?.toString()).whereType<String>().where((id) => id.isNotEmpty).toList();
    }
    final single = json['assigneeId']?.toString();
    if (single != null && single.isNotEmpty) return [single];
    return const [];
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
