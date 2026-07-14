import 'task.dart';

/// Workspace home stats — usually built client-side from project board tasks.
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

  /// Aggregate Total / Overdue / Due today from workspace project tasks
  /// (same population as each project board).
  factory HomeDashboard.fromWorkspaceTasks(List<Task> tasks) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final weekAgo = today.subtract(const Duration(days: 6));
    final weekEnd = today.add(const Duration(days: 7));

    DateTime? dateOnly(String? raw) {
      if (raw == null || raw.isEmpty) return null;
      final parsed = DateTime.tryParse(raw);
      if (parsed == null) return null;
      final local = parsed.toLocal();
      return DateTime(local.year, local.month, local.day);
    }

    bool isCompleted(Task t) =>
        t.completedAt != null && t.completedAt!.trim().isNotEmpty;

    final overdue = tasks.where((t) {
      final due = dateOnly(t.dueDate);
      return due != null && due.isBefore(today);
    }).toList()
      ..sort((a, b) {
        final da = dateOnly(a.dueDate)!;
        final db = dateOnly(b.dueDate)!;
        return da.compareTo(db);
      });

    final dueToday = tasks.where((t) {
      if (isCompleted(t)) return false;
      final due = dateOnly(t.dueDate);
      return due != null && due == today;
    }).toList();

    final open = tasks.where((t) => !isCompleted(t)).toList();
    final dueThisWeek = open.where((t) {
      final due = dateOnly(t.dueDate);
      return due != null && !due.isBefore(today) && due.isBefore(weekEnd);
    }).length;

    final completedRecently = tasks.where((t) {
      if (!isCompleted(t)) return false;
      final done = DateTime.tryParse(t.completedAt!);
      if (done == null) return false;
      return !done.toLocal().isBefore(weekAgo);
    }).toList();

    final trendMap = <String, int>{};
    for (var i = 0; i < 7; i++) {
      final d = weekAgo.add(Duration(days: i));
      final key =
          '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
      trendMap[key] = 0;
    }
    for (final t in completedRecently) {
      final done = DateTime.tryParse(t.completedAt!)?.toLocal();
      if (done == null) continue;
      final key =
          '${done.year.toString().padLeft(4, '0')}-${done.month.toString().padLeft(2, '0')}-${done.day.toString().padLeft(2, '0')}';
      if (trendMap.containsKey(key)) {
        trendMap[key] = (trendMap[key] ?? 0) + 1;
      }
    }

    final attentionOverdue = overdue.where((t) => !isCompleted(t)).toList();

    return HomeDashboard(
      counts: HomeCounts(
        dueToday: dueToday.length,
        overdue: overdue.length,
        dueThisWeek: dueThisWeek,
        completedThisWeek: completedRecently.length,
        openAssigned: open.length,
        total: tasks.length,
      ),
      weeklyTrend: [
        for (final e in trendMap.entries)
          HomeTrendPoint(date: e.key, count: e.value),
      ],
      overdueTasks: attentionOverdue.take(5).toList(),
      dueTodayTasks: dueToday.take(5).toList(),
    );
  }

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
    this.total = 0,
  });

  final int dueToday;
  final int overdue;
  final int dueThisWeek;
  final int completedThisWeek;
  final int openAssigned;
  final int total;

  factory HomeCounts.fromJson(Map<String, dynamic> json) {
    return HomeCounts(
      dueToday: json['dueToday'] as int? ?? 0,
      overdue: json['overdue'] as int? ?? 0,
      dueThisWeek: json['dueThisWeek'] as int? ?? 0,
      completedThisWeek: json['completedThisWeek'] as int? ?? 0,
      openAssigned: json['openAssigned'] as int? ?? 0,
      total: json['total'] as int? ?? json['openAssigned'] as int? ?? 0,
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
