import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/preferences/app_preferences.dart';
import '../../data/models/my_tasks.dart';
import '../../data/models/paginated_result.dart';
import '../../data/models/project_member.dart';
import '../../data/models/task.dart';
import '../auth/session_controller.dart';
import '../projects/projects_providers.dart';
import 'home_providers.dart';

/// Sentinel for Tasks tab "All projects" (workspace-wide board).
const kAllProjectsId = '__all_projects__';

bool isAllProjectsSelection(String? projectId) =>
    projectId != null && projectId == kAllProjectsId;

enum MyWorkFilter { overdue, today, week, completed, open, all }

extension MyWorkFilterX on MyWorkFilter {
  String get wire => switch (this) {
        MyWorkFilter.overdue => 'overdue',
        MyWorkFilter.today => 'today',
        MyWorkFilter.week => 'week',
        MyWorkFilter.completed => 'completed',
        MyWorkFilter.open => 'open',
        MyWorkFilter.all => 'all',
      };

  String get label => switch (this) {
        MyWorkFilter.overdue => 'Overdue',
        MyWorkFilter.today => 'Today',
        MyWorkFilter.week => 'This week',
        MyWorkFilter.completed => 'Done',
        MyWorkFilter.open => 'Open',
        MyWorkFilter.all => 'All',
      };

  static MyWorkFilter fromWire(String? value) {
    return MyWorkFilter.values.firstWhere(
      (f) => f.wire == value,
      orElse: () => MyWorkFilter.open,
    );
  }
}

final myWorkFilterProvider =
    StateProvider<MyWorkFilter>((ref) => MyWorkFilter.open);

/// Explicit project pick on the Tasks tab (`kAllProjectsId` = all projects).
final tasksProjectIdProvider = StateProvider<String?>((ref) => null);

/// Member filter on the Tasks tab (`null` / empty = all members).
final tasksMemberFilterProvider = StateProvider<String?>((ref) => null);

/// Extra board filters (priority, overdue, assigned to me, unassigned).
class TasksBoardFilters {
  const TasksBoardFilters({
    this.priorities = const {},
    this.overdueOnly = false,
    this.assignedToMe = false,
    this.unassignedOnly = false,
  });

  final Set<String> priorities;
  final bool overdueOnly;
  final bool assignedToMe;
  final bool unassignedOnly;

  static const empty = TasksBoardFilters();

  bool get isActive =>
      priorities.isNotEmpty ||
      overdueOnly ||
      assignedToMe ||
      unassignedOnly;

  int get activeCount {
    var n = priorities.length;
    if (overdueOnly) n++;
    if (assignedToMe) n++;
    if (unassignedOnly) n++;
    return n;
  }

  TasksBoardFilters copyWith({
    Set<String>? priorities,
    bool? overdueOnly,
    bool? assignedToMe,
    bool? unassignedOnly,
  }) {
    return TasksBoardFilters(
      priorities: priorities ?? this.priorities,
      overdueOnly: overdueOnly ?? this.overdueOnly,
      assignedToMe: assignedToMe ?? this.assignedToMe,
      unassignedOnly: unassignedOnly ?? this.unassignedOnly,
    );
  }
}

final tasksBoardFiltersProvider =
    StateProvider<TasksBoardFilters>((ref) => TasksBoardFilters.empty);

/// Resolved project for the Tasks tab — mirrors Planner selection behavior.
final tasksSelectedProjectIdProvider = Provider<String?>((ref) {
  final selected = ref.watch(tasksProjectIdProvider);
  final projects = ref.watch(projectsProvider).valueOrNull;
  final active = projects?.where((p) => !p.isArchived).toList() ?? const [];
  if (active.isEmpty) return null;

  if (isAllProjectsSelection(selected)) return kAllProjectsId;

  if (selected != null &&
      selected.isNotEmpty &&
      active.any((p) => p.id == selected)) {
    return selected;
  }

  final lastId = ref.read(lastProjectIdProvider);
  for (final project in active) {
    if (project.id == lastId) return project.id;
  }
  return active.first.id;
});

final projectMembersForTasksProvider = FutureProvider.autoDispose
    .family<List<ProjectMember>, String>((ref, projectId) async {
  final orgId = ref.watch(
    sessionControllerProvider.select((session) => session.orgId),
  );
  if (orgId == null || orgId.isEmpty) return const [];
  if (isAllProjectsSelection(projectId)) {
    return ref.watch(organizationsRepositoryProvider).fetchOrgMembers(orgId);
  }
  return ref.watch(projectsRepositoryProvider).fetchProjectMembers(
        projectId: projectId,
        organizationId: orgId,
      );
});

List<String> taskAssigneeIds(Task task) {
  if (task.assigneeIds.isNotEmpty) return task.assigneeIds;
  final id = task.assigneeId;
  if (id != null && id.isNotEmpty) return [id];
  return const [];
}

bool _assigneeListContains(List<String> assignees, String userId) {
  final target = userId.trim().toLowerCase().replaceAll(RegExp(r'[{}-]'), '');
  for (final id in assignees) {
    final normalized =
        id.trim().toLowerCase().replaceAll(RegExp(r'[{}-]'), '');
    if (normalized == target) return true;
  }
  return false;
}

bool isTaskDueOverdue(String? dueDate) {
  if (dueDate == null || dueDate.isEmpty) return false;
  final parsed = DateTime.tryParse(dueDate);
  if (parsed == null) return false;
  final local = parsed.toLocal();
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final due = DateTime(local.year, local.month, local.day);
  return due.isBefore(today);
}

bool matchesTasksBoardFilters(
  Task task, {
  String? memberId,
  required TasksBoardFilters filters,
  String? currentUserId,
}) {
  final assignees = taskAssigneeIds(task);

  if (memberId != null && memberId.isNotEmpty) {
    if (!_assigneeListContains(assignees, memberId)) return false;
  }

  if (filters.unassignedOnly && assignees.isNotEmpty) return false;

  if (filters.assignedToMe) {
    if (currentUserId == null || currentUserId.isEmpty) return false;
    if (!_assigneeListContains(assignees, currentUserId)) return false;
  }

  if (filters.priorities.isNotEmpty) {
    final priority = task.priority.toLowerCase();
    if (!filters.priorities.contains(priority)) return false;
  }

  if (filters.overdueOnly) {
    final completed =
        task.completedAt != null && task.completedAt!.trim().isNotEmpty;
    if (completed || !isTaskDueOverdue(task.dueDate)) return false;
  }

  return true;
}

/// Tasks tab: board tasks for the selected project (or all projects).
final myWorkProvider = FutureProvider.autoDispose<MyTasksResult>((ref) async {
  final filter = ref.watch(myWorkFilterProvider);
  final projectId = ref.watch(tasksSelectedProjectIdProvider);
  final tasks = await ref.watch(workspaceBoardTasksProvider.future);
  final scoped = projectId == null
      ? const <Task>[]
      : isAllProjectsSelection(projectId)
          ? tasks
          : tasks.where((t) => t.projectId == projectId).toList();
  return _myTasksFromWorkspace(scoped, filter);
});

MyTasksResult _myTasksFromWorkspace(List<Task> tasks, MyWorkFilter filter) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final weekEnd = today.add(const Duration(days: 7));
  final completedSince = today.subtract(const Duration(days: 30));

  DateTime? dateOnly(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) return null;
    final local = parsed.toLocal();
    return DateTime(local.year, local.month, local.day);
  }

  bool isCompleted(Task t) =>
      t.completedAt != null && t.completedAt!.trim().isNotEmpty;

  int byDueAsc(Task a, Task b) {
    final da = dateOnly(a.dueDate);
    final db = dateOnly(b.dueDate);
    if (da != null && db != null) return da.compareTo(db);
    if (da != null) return -1;
    if (db != null) return 1;
    return 0;
  }

  final open = tasks.where((t) => !isCompleted(t)).toList();
  final overdueAll = tasks.where((t) {
    final due = dateOnly(t.dueDate);
    return due != null && due.isBefore(today);
  }).toList()
    ..sort(byDueAsc);
  final todayList = open.where((t) {
    final due = dateOnly(t.dueDate);
    return due != null && due == today;
  }).toList()
    ..sort(byDueAsc);
  final weekList = open.where((t) {
    final due = dateOnly(t.dueDate);
    return due != null && !due.isBefore(today) && due.isBefore(weekEnd);
  }).toList()
    ..sort(byDueAsc);
  final completed = tasks.where((t) {
    if (!isCompleted(t)) return false;
    final done = DateTime.tryParse(t.completedAt!);
    if (done == null) return false;
    return !done.toLocal().isBefore(completedSince);
  }).toList()
    ..sort((a, b) {
      final da = DateTime.tryParse(a.completedAt!)?.millisecondsSinceEpoch ?? 0;
      final db = DateTime.tryParse(b.completedAt!)?.millisecondsSinceEpoch ?? 0;
      return db.compareTo(da);
    });

  final counts = MyTasksCounts(
    overdue: overdueAll.length,
    today: todayList.length,
    week: weekList.length,
    completed: completed.length,
    open: open.length,
    all: open.length + completed.length,
  );

  final List<Task> selected = switch (filter) {
    MyWorkFilter.overdue => overdueAll,
    MyWorkFilter.today => todayList,
    MyWorkFilter.week => weekList,
    MyWorkFilter.completed => completed,
    MyWorkFilter.all => [...open..sort(byDueAsc), ...completed],
    MyWorkFilter.open => open..sort(byDueAsc),
  };

  return MyTasksResult(
    data: selected,
    meta: PaginatedMeta(
      page: 1,
      limit: selected.isEmpty ? 1 : selected.length,
      total: selected.length,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    ),
    counts: counts,
  );
}
