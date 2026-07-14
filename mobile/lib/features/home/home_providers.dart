import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/utils/recurrence_display.dart';
import '../../data/models/home_dashboard.dart';
import '../../data/models/task.dart';
import '../auth/session_controller.dart';
import '../kanban/kanban_providers.dart';
import '../projects/projects_providers.dart';

/// Non-planner tasks from every active project in the current workspace.
/// Same source as the Projects tab boards — no separate home DB endpoint.
final workspaceBoardTasksProvider = FutureProvider<List<Task>>((ref) async {
  final orgId = ref.watch(
    sessionControllerProvider.select((session) => session.orgId),
  );
  if (orgId == null || orgId.isEmpty) {
    throw StateError('No workspace selected');
  }

  final projects = await ref.watch(projectsProvider.future);
  final active = projects.where((p) => !p.isArchived).toList();
  if (active.isEmpty) return const [];

  final repo = ref.watch(tasksRepositoryProvider);
  final tasks = <Task>[];

  // Sequential: surface API errors, and page within each project (max limit 100).
  for (final project in active) {
    final pageTasks = await repo.fetchAllByProject(
      projectId: project.id,
      organizationId: orgId,
    );
    tasks.addAll(pageTasks.where((task) => !isRecurringTask(task)));
  }

  return tasks;
});

final homeDashboardProvider = FutureProvider<HomeDashboard>((ref) async {
  final tasks = await ref.watch(workspaceBoardTasksProvider.future);
  return HomeDashboard.fromWorkspaceTasks(tasks);
});
