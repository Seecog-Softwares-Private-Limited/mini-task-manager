import 'task.dart';

/// Per-user home dashboard payload from `GET /tasks/home`.
class HomeDashboard {
  const HomeDashboard({
    required this.counts,
    required this.weeklyTrend,
    required this.overdueTasks,
    required this.dueTodayTasks,
  });

  final HomeCounts counts;
  final List<HomeTrendPoint> weeklyTrend;
  final List<Task> overdueTasks;
  final List<Task> dueTodayTasks;

  factory HomeDashboard.fromJson(Map<String, dynamic> json) {
    List<Task> parseTasks(dynamic raw) => (raw as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(Task.fromJson)
        .toList();

    return HomeDashboard(
      counts: HomeCounts.fromJson(
        (json['counts'] as Map<String, dynamic>?) ?? const {},
      ),
      weeklyTrend: (json['weeklyTrend'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(HomeTrendPoint.fromJson)
          .toList(),
      overdueTasks: parseTasks(json['overdueTasks']),
      dueTodayTasks: parseTasks(json['dueTodayTasks']),
    );
  }
}

class HomeCounts {
  const HomeCounts({
    required this.dueToday,
    required this.overdue,
    required this.dueThisWeek,
    required this.completedThisWeek,
    required this.openAssigned,
  });

  final int dueToday;
  final int overdue;
  final int dueThisWeek;
  final int completedThisWeek;
  final int openAssigned;

  factory HomeCounts.fromJson(Map<String, dynamic> json) {
    return HomeCounts(
      dueToday: json['dueToday'] as int? ?? 0,
      overdue: json['overdue'] as int? ?? 0,
      dueThisWeek: json['dueThisWeek'] as int? ?? 0,
      completedThisWeek: json['completedThisWeek'] as int? ?? 0,
      openAssigned: json['openAssigned'] as int? ?? 0,
    );
  }
}

class HomeTrendPoint {
  const HomeTrendPoint({required this.date, required this.count});

  final String date;
  final int count;

  factory HomeTrendPoint.fromJson(Map<String, dynamic> json) {
    return HomeTrendPoint(
      date: json['date']?.toString() ?? '',
      count: json['count'] as int? ?? 0,
    );
  }
}
