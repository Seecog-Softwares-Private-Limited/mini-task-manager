import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/utils/recurrence_display.dart';
import '../../data/models/home_dashboard.dart';
import '../../data/models/task.dart';
import '../auth/session_controller.dart';
import '../kanban/kanban_providers.dart';
import '../projects/projects_providers.dart';
import '../recurring/recurring_providers.dart';

/// Non-planner tasks from every active project in the current workspace.
/// Same source as the Projects tab boards — used by Tasks tab filters.
final workspaceBoardTasksProvider = FutureProvider<List<Task>>((ref) async {
  final all = await ref.watch(workspaceAllProjectTasksProvider.future);
  return all.where((task) => !isRecurringTask(task)).toList();
});

/// Board + planner tasks across active projects.
///
/// `/tasks/project/:id` intentionally omits recurring runs (those live in
/// Planner). Home Due today needs both, so we also load `/recurring-tasks/board`.
final workspaceAllProjectTasksProvider = FutureProvider<List<Task>>((ref) async {
  final orgId = ref.watch(
    sessionControllerProvider.select((session) => session.orgId),
  );
  if (orgId == null || orgId.isEmpty) {
    throw StateError('No workspace selected');
  }

  final projects = await ref.watch(projectsProvider.future);
  final active = projects.where((p) => !p.isArchived).toList();
  if (active.isEmpty) return const [];

  final tasksRepo = ref.watch(tasksRepositoryProvider);
  final recurringRepo = ref.watch(recurringRepositoryProvider);
  final byId = <String, Task>{};

  for (final project in active) {
    final board = await tasksRepo.fetchAllByProject(
      projectId: project.id,
      organizationId: orgId,
    );
    for (final task in board) {
      byId[task.id] = task;
    }

    try {
      final planner = await recurringRepo.fetchBoardTasks(
        organizationId: orgId,
        projectId: project.id,
        // Include today's materialized runs, not calendar projections only.
        calendarOnly: false,
      );
      for (final task in planner) {
        byId.putIfAbsent(task.id, () => task);
      }
    } catch (_) {
      // Planner fetch failure should not blank Home board stats.
    }
  }

  return byId.values.toList();
});

final homeDashboardProvider = FutureProvider<HomeDashboard>((ref) async {
  final allTasks = await ref.watch(workspaceAllProjectTasksProvider.future);
  final boardTasks = allTasks.where((task) => !isRecurringTask(task)).toList();
  return HomeDashboard.fromWorkspaceTasks(
    boardTasks,
    dueTodayCandidates: allTasks,
  );
});
