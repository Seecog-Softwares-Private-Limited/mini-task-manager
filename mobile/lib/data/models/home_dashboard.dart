import '../../core/utils/calendar_date.dart';
import 'task.dart';

bool _isSubtaskDone(TaskSubtask subtask) {
  final status = subtask.status?.toUpperCase();
  if (status == 'DONE') return true;
  return subtask.completed;
}

/// One actionable row on Home → Due today (checklist item or leaf task).
class HomeDueTodayItem {
  const HomeDueTodayItem({
    required this.task,
    this.subtask,
  });

  final Task task;
  final TaskSubtask? subtask;

  String get title {
    final sub = subtask?.title.trim();
    if (sub != null && sub.isNotEmpty) return sub;
    return task.title;
  }

  /// Parent ritual/task name when this row is a checklist item.
  String? get parentTitle {
    if (subtask == null) return null;
    final parent = task.title.trim();
    return parent.isEmpty ? null : parent;
  }

  String get key =>
      subtask == null ? task.id : '${task.id}:${subtask!.id}';
}

/// Workspace home stats — usually built client-side from project board tasks.
class HomeDashboard {
  const HomeDashboard({
    required this.counts,
    required this.weeklyTrend,
    required this.overdueTasks,
    required this.dueTodayItems,
    this.dueTodayTasks = const [],
  });

  final HomeCounts counts;
  final List<HomeTrendPoint> weeklyTrend;
  final List<Task> overdueTasks;

  /// Checklist items (and leaf tasks) due today — what Home lists.
  final List<HomeDueTodayItem> dueTodayItems;

  /// Legacy parent-task list (API / older callers). Prefer [dueTodayItems].
  final List<Task> dueTodayTasks;

  /// Aggregate Total / Overdue from board (non-planner) tasks, and Due today
  /// from [dueTodayCandidates] as **checklist items** (not parent rituals).
  factory HomeDashboard.fromWorkspaceTasks(
    List<Task> tasks, {
    List<Task>? dueTodayCandidates,
  }) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final weekAgo = today.subtract(const Duration(days: 6));
    final weekEnd = today.add(const Duration(days: 7));

    DateTime? dateOnly(String? raw) => parseCalendarDate(raw);

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

    final todaySource = dueTodayCandidates ?? tasks;
    final seen = <String>{};
    final dueTodayItems = <HomeDueTodayItem>[];
    final dueTodayParents = <Task>[];

    for (final t in todaySource) {
      if (isCompleted(t)) continue;
      final parentDue = dateOnly(t.dueDate);

      if (t.subtasks.isNotEmpty) {
        var addedParent = false;
        for (final sub in t.subtasks) {
          if (_isSubtaskDone(sub)) continue;
          final subDue = dateOnly(sub.dueDate) ?? parentDue;
          if (subDue != today) continue;
          final key = '${t.id}:${sub.id}';
          if (!seen.add(key)) continue;
          dueTodayItems.add(HomeDueTodayItem(task: t, subtask: sub));
          if (!addedParent) {
            dueTodayParents.add(t);
            addedParent = true;
          }
        }
        continue;
      }

      // Leaf task (no checklist): show the task itself when due today.
      if (parentDue != today) continue;
      if (!seen.add(t.id)) continue;
      dueTodayItems.add(HomeDueTodayItem(task: t));
      dueTodayParents.add(t);
    }

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
        dueToday: dueTodayItems.length,
        overdue: attentionOverdue.length,
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
      dueTodayItems: dueTodayItems,
      dueTodayTasks: dueTodayParents,
    );
  }

  factory HomeDashboard.fromJson(Map<String, dynamic> json) {
    List<Task> parseTasks(dynamic raw) => (raw as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(Task.fromJson)
        .toList();

    final parents = parseTasks(json['dueTodayTasks']);
    return HomeDashboard(
      counts: HomeCounts.fromJson(
        (json['counts'] as Map<String, dynamic>?) ?? const {},
      ),
      weeklyTrend: (json['weeklyTrend'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(HomeTrendPoint.fromJson)
          .toList(),
      overdueTasks: parseTasks(json['overdueTasks']),
      dueTodayTasks: parents,
      // API still returns parent tasks; expand to checklist items client-side.
      dueTodayItems: [
        for (final t in parents)
          if (t.subtasks.isEmpty)
            HomeDueTodayItem(task: t)
          else
            for (final s in t.subtasks)
              if (!_isSubtaskDone(s)) HomeDueTodayItem(task: t, subtask: s),
      ],
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
