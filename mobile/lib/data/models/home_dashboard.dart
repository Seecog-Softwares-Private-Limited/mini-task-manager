import '../../core/utils/calendar_date.dart';
import '../../core/utils/recurrence_display.dart';
import 'task.dart';

bool _isSubtaskDone(TaskSubtask subtask) {
  final status = subtask.status?.toUpperCase();
  if (status == 'DONE') return true;
  return subtask.completed;
}

bool _hasDateOrTime(String? date, String? time) {
  final d = date?.trim() ?? '';
  final t = time?.trim() ?? '';
  return d.isNotEmpty || t.isNotEmpty;
}

List<String> _assigneeIds({
  List<String> assigneeIds = const [],
  String? assigneeId,
}) {
  if (assigneeIds.isNotEmpty) return assigneeIds;
  if (assigneeId != null && assigneeId.trim().isNotEmpty) return [assigneeId];
  return const [];
}

bool _assigneeContains(List<String> assignees, String userId) {
  final target = userId.trim().toLowerCase().replaceAll(RegExp(r'[{}-]'), '');
  if (target.isEmpty) return false;
  for (final id in assignees) {
    final normalized =
        id.trim().toLowerCase().replaceAll(RegExp(r'[{}-]'), '');
    if (normalized == target) return true;
  }
  return false;
}

bool _isAssignedToUser({
  required Task task,
  TaskSubtask? subtask,
  required String userId,
}) {
  if (subtask != null) {
    final subAssignees = _assigneeIds(
      assigneeIds: subtask.assigneeIds,
      assigneeId: subtask.assigneeId,
    );
    if (subAssignees.isNotEmpty) {
      return _assigneeContains(subAssignees, userId);
    }
  }
  return _assigneeContains(
    _assigneeIds(assigneeIds: task.assigneeIds, assigneeId: task.assigneeId),
    userId,
  );
}

bool _isDueDateTimeOverdue(String? dueDate, String? dueTime) {
  if (dueDate == null || dueDate.trim().isEmpty) return false;
  final parsed = DateTime.tryParse(dueDate);
  if (parsed == null) return false;

  if (dueTime != null && dueTime.trim().isNotEmpty) {
    final parts = dueTime.split(':');
    if (parts.length >= 2) {
      final hours = int.tryParse(parts[0]);
      final minutes = int.tryParse(parts[1]);
      if (hours != null && minutes != null) {
        final due = DateTime(
          parsed.year,
          parsed.month,
          parsed.day,
          hours,
          minutes,
        );
        return due.isBefore(DateTime.now());
      }
    }
  }

  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final due = DateTime(parsed.year, parsed.month, parsed.day);
  return due.isBefore(today);
}

/// One actionable row on Home → Due Tasks (checklist item or leaf task).
class HomeDueTodayItem {
  const HomeDueTodayItem({
    required this.task,
    this.subtask,
    this.fromPlanner = false,
    this.isUndated = false,
    this.projectName,
  });

  final Task task;
  final TaskSubtask? subtask;
  final bool fromPlanner;

  /// Open item with no date/time.
  final bool isUndated;

  /// Resolved project display name (from workspace projects map).
  final String? projectName;

  /// Project line for cards.
  String get projectLabel {
    final name = projectName?.trim();
    if (name != null && name.isNotEmpty) return name;
    return 'Project';
  }

  /// Primary card title: subtask name when set, otherwise the (leaf) task title.
  String get title {
    final sub = subtask?.title.trim();
    if (sub != null && sub.isNotEmpty) return sub;
    return task.title;
  }

  /// Parent task name under the subtask title; null for leaf tasks.
  String? get subtitle {
    if (subtask == null) return null;
    final parent = task.title.trim();
    return parent.isEmpty ? null : parent;
  }

  /// Parent ritual/task name when this row is a checklist item.
  String? get parentTitle => subtitle;

  /// Task title line (parent when this row is a subtask, else the leaf task).
  String get taskLabel => task.title.trim().isEmpty ? 'Task' : task.title.trim();

  /// Subtask title when present.
  String? get subtaskLabel {
    final sub = subtask?.title.trim();
    if (sub == null || sub.isEmpty) return null;
    return sub;
  }

  String get key =>
      subtask == null ? task.id : '${task.id}:${subtask!.id}';

  String? get _effectiveDueDate =>
      subtask != null
          ? ((subtask!.dueDate?.trim().isNotEmpty ?? false)
              ? subtask!.dueDate
              : task.dueDate)
          : task.dueDate;

  String? get _effectiveDueTime {
    if (subtask != null) {
      if (subtask!.dueDate?.trim().isNotEmpty ?? false) {
        return subtask!.dueTime;
      }
      if (subtask!.dueTime?.trim().isNotEmpty ?? false) {
        return subtask!.dueTime;
      }
      return task.dueTime;
    }
    return task.dueTime;
  }

  bool get isCompleted {
    if (subtask != null) return _isSubtaskDone(subtask!);
    return task.completedAt != null && task.completedAt!.trim().isNotEmpty;
  }

  bool get isInProgress {
    if (isCompleted) return false;
    final status = subtask?.status?.toUpperCase();
    return status == 'IN_PROGRESS';
  }

  bool get isOverdue {
    if (isCompleted || isInProgress) return false;
    return _isDueDateTimeOverdue(_effectiveDueDate, _effectiveDueTime);
  }

  bool get isDueToday {
    final due = parseCalendarDate(_effectiveDueDate);
    if (due == null) return false;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    return due.year == today.year &&
        due.month == today.month &&
        due.day == today.day;
  }

  /// Belongs on Home Due Tasks (assigned open work due now — not future-dated TODOs).
  bool get belongsInDueList {
    if (isCompleted) return false;
    if (isInProgress) return true;
    if (!_hasDateOrTime(_effectiveDueDate, _effectiveDueTime)) return true;
    if (isOverdue) return true;
    if (isDueToday) return true;
    return false;
  }

  /// Sort / chip bucket:
  /// 0 no date → 1 due today (still completable) → 2 overdue → 3 in progress → 4 done
  int get displayBucket {
    if (isCompleted) return 4;
    if (isInProgress) return 3;
    if (!_hasDateOrTime(_effectiveDueDate, _effectiveDueTime)) return 0;
    if (isOverdue) return 2;
    // Due today (or any remaining dated item if listed) — today sorts before future via due key.
    return 1;
  }

  String get statusLabel {
    switch (displayBucket) {
      case 0:
        return 'No date';
      case 1:
        return isDueToday ? 'Today' : 'Remaining';
      case 2:
        return 'Overdue';
      case 3:
        return 'In progress';
      case 4:
        return 'Done';
      default:
        return 'Due';
    }
  }
}

int _parseMillis(String? raw) {
  final value = raw?.trim();
  if (value == null || value.isEmpty) return 0;
  return DateTime.tryParse(value)?.millisecondsSinceEpoch ?? 0;
}

/// Client ids are often `{epochMicros}_{suffix}` — recency fallback.
int _idRecencyMillis(String id) {
  final head = id.split('_').first;
  final n = int.tryParse(head);
  if (n == null || n <= 0) return 0;
  if (n > 100000000000000) return n ~/ 1000;
  if (n > 100000000000) return n;
  return 0;
}

/// Latest of created / updated (assignment bumps updatedAt when persisted).
/// Subtask rows use subtask stamps only — parent task.updatedAt would float
/// old checklist items whenever the parent is edited.
int homeDueRecencyMillis(HomeDueTodayItem item) {
  var best = 0;
  void consider(int ms) {
    if (ms > best) best = ms;
  }

  final sub = item.subtask;
  if (sub != null) {
    consider(_parseMillis(sub.updatedAt));
    consider(_parseMillis(sub.createdAt));
    consider(_parseMillis(sub.effectiveCompletedAt));
    consider(_idRecencyMillis(sub.id));
    if (best > 0) return best;
    // No stamps: later array index ≈ newer append; fold in parent createdAt.
    final idx = item.task.subtasks.indexWhere((s) => s.id == sub.id);
    final taskCreated = _parseMillis(item.task.createdAt);
    if (taskCreated > 0) return taskCreated + (idx < 0 ? 0 : idx + 1);
    return idx < 0 ? 0 : idx + 1;
  }
  consider(_parseMillis(item.task.updatedAt));
  consider(_parseMillis(item.task.createdAt));
  consider(_idRecencyMillis(item.task.id));
  return best;
}

int _checklistIndex(HomeDueTodayItem item) {
  final sub = item.subtask;
  if (sub == null) return -1;
  return item.task.subtasks.indexWhere((s) => s.id == sub.id);
}

/// Newest → oldest by created/updated (for Home preview, View all, Planner).
int compareHomeDueItems(HomeDueTodayItem a, HomeDueTodayItem b) {
  final recencyCmp =
      homeDueRecencyMillis(b).compareTo(homeDueRecencyMillis(a));
  if (recencyCmp != 0) return recencyCmp;

  // Same stamps / missing: later checklist row is usually newer (append).
  if (a.task.id == b.task.id) {
    final ai = _checklistIndex(a);
    final bi = _checklistIndex(b);
    if (ai >= 0 && bi >= 0 && ai != bi) return bi.compareTo(ai);
  }

  return a.title.compareTo(b.title);
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

  /// Checklist items (and leaf tasks) for Due Tasks — assigned to current user.
  final List<HomeDueTodayItem> dueTodayItems;

  /// Board (non-planner) due rows — newest created/updated first.
  List<HomeDueTodayItem> get dueTodayBoardItems =>
      dueTodayItems.where((item) => !item.fromPlanner).toList()
        ..sort(compareHomeDueItems);

  /// Planner / recurring due rows — newest created/updated first.
  List<HomeDueTodayItem> get dueTodayPlannerItems =>
      dueTodayItems.where((item) => item.fromPlanner).toList()
        ..sort(compareHomeDueItems);

  /// Legacy parent-task list (API / older callers). Prefer [dueTodayItems].
  final List<Task> dueTodayTasks;

  /// Aggregate Total / Overdue from board (non-planner) tasks, and Due Tasks
  /// from [dueTodayCandidates] as **checklist items** assigned to [currentUserId].
  factory HomeDashboard.fromWorkspaceTasks(
    List<Task> tasks, {
    List<Task>? dueTodayCandidates,
    String? currentUserId,
    Map<String, String>? projectNamesById,
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
    final userId = currentUserId?.trim() ?? '';

    for (final t in todaySource) {
      final fromPlanner = isRecurringTask(t);

      if (t.subtasks.isNotEmpty) {
        var addedParent = false;
        for (final sub in t.subtasks) {
          if (_isSubtaskDone(sub)) continue;
          if (userId.isEmpty ||
              !_isAssignedToUser(task: t, subtask: sub, userId: userId)) {
            continue;
          }
          final undated = !_hasDateOrTime(sub.dueDate, sub.dueTime) &&
              !_hasDateOrTime(t.dueDate, t.dueTime);
          final item = HomeDueTodayItem(
            task: t,
            subtask: sub,
            fromPlanner: fromPlanner,
            isUndated: undated,
            projectName: projectNamesById?[t.projectId],
          );
          if (!item.belongsInDueList) continue;
          final key = '${t.id}:${sub.id}';
          if (!seen.add(key)) continue;
          dueTodayItems.add(item);
          if (!addedParent) {
            dueTodayParents.add(t);
            addedParent = true;
          }
        }
        continue;
      }

      // Leaf task (no checklist): only if assigned to the user and still open.
      if (isCompleted(t)) continue;
      if (userId.isEmpty ||
          !_isAssignedToUser(task: t, userId: userId)) {
        continue;
      }
      final leaf = HomeDueTodayItem(
        task: t,
        fromPlanner: fromPlanner,
        isUndated: !_hasDateOrTime(t.dueDate, t.dueTime),
        projectName: projectNamesById?[t.projectId],
      );
      if (!leaf.belongsInDueList) continue;
      if (!seen.add(t.id)) continue;
      dueTodayItems.add(leaf);
      dueTodayParents.add(t);
    }

    dueTodayItems.sort(compareHomeDueItems);

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
        dueToday: dueTodayItems.where((i) => !i.isCompleted).length,
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
      dueTodayItems: [
        for (final t in parents)
          if (t.subtasks.isEmpty)
            HomeDueTodayItem(
              task: t,
              fromPlanner: isRecurringTask(t),
              isUndated: !_hasDateOrTime(t.dueDate, t.dueTime),
            )
          else
            for (final s in t.subtasks)
              if (!_isSubtaskDone(s))
                HomeDueTodayItem(
                  task: t,
                  subtask: s,
                  fromPlanner: isRecurringTask(t),
                  isUndated: !_hasDateOrTime(s.dueDate, s.dueTime) &&
                      !_hasDateOrTime(t.dueDate, t.dueTime),
                ),
      ]..sort(compareHomeDueItems),
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
