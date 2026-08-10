import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/utils/calendar_date.dart';
import '../../core/utils/recurrence_display.dart';
import '../../data/models/task.dart';
import '../../data/models/workflow.dart';
import '../../data/repositories/attachments_repository.dart';
import '../../data/repositories/tasks_repository.dart';
import '../../data/repositories/workflows_repository.dart';
import '../auth/session_controller.dart';
import '../home/my_work_providers.dart';
import '../projects/projects_providers.dart';

class ProjectBoardData {
  ProjectBoardData({
    required this.statuses,
    required this.tasks,
    required this.projectName,
    required Map<String, List<Task>> tasksByStatus,
    required this.overdueCount,
  }) : _tasksByStatus = tasksByStatus;

  final List<WorkflowStatus> statuses;
  final List<Task> tasks;
  final String projectName;
  final int overdueCount;
  final Map<String, List<Task>> _tasksByStatus;

  List<Task> tasksForStatus(String statusId) {
    return _tasksByStatus[statusId] ?? const [];
  }

  int countForStatus(String statusId) {
    return _tasksByStatus[statusId]?.length ?? 0;
  }
}

final tasksRepositoryProvider = Provider<TasksRepository>((ref) {
  return TasksRepository(apiClient: ref.watch(apiClientProvider));
});

final attachmentsRepositoryProvider = Provider<AttachmentsRepository>((ref) {
  return AttachmentsRepository(apiClient: ref.watch(apiClientProvider));
});

final workflowsRepositoryProvider = Provider<WorkflowsRepository>((ref) {
  return WorkflowsRepository(apiClient: ref.watch(apiClientProvider));
});

final projectBoardProvider =
    FutureProvider.family<ProjectBoardData, String>((ref, projectId) async {
  ref.keepAlive();
  final orgId = ref.watch(
    sessionControllerProvider.select((session) => session.orgId),
  );
  if (orgId == null || orgId.isEmpty) {
    throw StateError('No workspace selected');
  }

  if (isAllProjectsSelection(projectId)) {
    return _buildAllProjectsBoard(ref, orgId);
  }

  final workflowsRepo = ref.watch(workflowsRepositoryProvider);
  final tasksRepo = ref.watch(tasksRepositoryProvider);

  var workflows = await workflowsRepo.fetchByProject(projectId);
  if (workflows.isEmpty) {
    await workflowsRepo.createDefaultWorkflow(projectId);
    workflows = await workflowsRepo.fetchByProject(projectId);
  }

  final workflow = workflows.firstWhere(
    (item) => item.isDefault,
    orElse: () => workflows.first,
  );
  final statuses = await workflowsRepo.fetchStatuses(workflow.id);
  final projectTasks = await tasksRepo.fetchAllByProject(
    projectId: projectId,
    organizationId: orgId,
  );
  // Match web board: planner/recurring runs belong in Planner only.
  final tasks = projectTasks.where((task) => !isRecurringTask(task)).toList();

  var projectName = 'Project board';
  final cachedProjects = ref.read(projectsProvider).valueOrNull;
  if (cachedProjects != null) {
    for (final project in cachedProjects) {
      if (project.id == projectId) {
        projectName = project.name;
        break;
      }
    }
  }

  final tasksByStatus = <String, List<Task>>{
    for (final status in statuses) status.id: <Task>[],
  };
  var overdueCount = 0;
  for (final task in tasks) {
    final statusId = task.statusId;
    if (statusId != null && statusId.isNotEmpty) {
      tasksByStatus.putIfAbsent(statusId, () => []).add(task);
    }
    if (_isTaskOverdue(task.dueDate)) {
      overdueCount++;
    }
  }

  return ProjectBoardData(
    statuses: statuses,
    tasks: tasks,
    projectName: projectName,
    tasksByStatus: tasksByStatus,
    overdueCount: overdueCount,
  );
});

/// Workspace-wide board: columns by status type, tasks from every active project.
Future<ProjectBoardData> _buildAllProjectsBoard(Ref ref, String orgId) async {
  final projects = await ref.watch(projectsProvider.future);
  final active = projects.where((p) => !p.isArchived).toList();
  final workflowsRepo = ref.watch(workflowsRepositoryProvider);
  final tasksRepo = ref.watch(tasksRepositoryProvider);

  final statusById = <String, WorkflowStatus>{};
  final allTasks = <Task>[];

  for (final project in active) {
    var workflows = await workflowsRepo.fetchByProject(project.id);
    if (workflows.isEmpty) {
      await workflowsRepo.createDefaultWorkflow(project.id);
      workflows = await workflowsRepo.fetchByProject(project.id);
    }
    if (workflows.isEmpty) continue;

    final workflow = workflows.firstWhere(
      (item) => item.isDefault,
      orElse: () => workflows.first,
    );
    final statuses = await workflowsRepo.fetchStatuses(workflow.id);
    for (final status in statuses) {
      statusById[status.id] = status;
    }

    final projectTasks = await tasksRepo.fetchAllByProject(
      projectId: project.id,
      organizationId: orgId,
    );
    allTasks.addAll(projectTasks.where((task) => !isRecurringTask(task)));
  }

  const typeOrder = <String>['todo', 'in_progress', 'review', 'done', 'cancelled'];
  const typeLabels = <String, String>{
    'todo': 'To Do',
    'in_progress': 'In Progress',
    'review': 'Review',
    'done': 'Done',
    'cancelled': 'Cancelled',
  };
  const typeColors = <String, String>{
    'todo': '#94A3B8',
    'in_progress': '#3B82F6',
    'review': '#A855F7',
    'done': '#22C55E',
    'cancelled': '#EF4444',
  };

  final usedTypes = <String>{};
  for (final task in allTasks) {
    final statusId = task.statusId;
    if (statusId == null || statusId.isEmpty) {
      usedTypes.add('todo');
      continue;
    }
    final status = statusById[statusId];
    usedTypes.add(_normalizeStatusType(status?.type, status?.name));
  }
  if (usedTypes.isEmpty) {
    usedTypes.addAll(['todo', 'in_progress', 'done']);
  }

  final orderedTypes = [
    ...typeOrder.where(usedTypes.contains),
    ...usedTypes.where((t) => !typeOrder.contains(t)),
  ];

  final statuses = <WorkflowStatus>[
    for (var i = 0; i < orderedTypes.length; i++)
      WorkflowStatus(
        id: 'all:${orderedTypes[i]}',
        workflowId: 'all-projects',
        name: typeLabels[orderedTypes[i]] ?? _titleCase(orderedTypes[i]),
        position: i,
        type: orderedTypes[i],
        color: typeColors[orderedTypes[i]],
      ),
  ];

  final tasksByStatus = <String, List<Task>>{
    for (final status in statuses) status.id: <Task>[],
  };
  var overdueCount = 0;
  for (final task in allTasks) {
    final real = task.statusId == null ? null : statusById[task.statusId];
    final type = _normalizeStatusType(real?.type, real?.name);
    final bucketId = 'all:$type';
    tasksByStatus.putIfAbsent(bucketId, () => []).add(task);
    if (_isTaskOverdue(task.dueDate)) {
      overdueCount++;
    }
  }

  return ProjectBoardData(
    statuses: statuses,
    tasks: allTasks,
    projectName: 'All projects',
    tasksByStatus: tasksByStatus,
    overdueCount: overdueCount,
  );
}

String _normalizeStatusType(String? type, String? name) {
  final raw = (type ?? '').trim().toLowerCase().replaceAll(' ', '_');
  if (raw.isNotEmpty) {
    if (raw.contains('progress') || raw == 'doing' || raw == 'active') {
      return 'in_progress';
    }
    if (raw.contains('review') || raw == 'qa') return 'review';
    if (raw.contains('done') || raw == 'complete' || raw == 'completed') {
      return 'done';
    }
    if (raw.contains('cancel')) return 'cancelled';
    if (raw.contains('todo') || raw == 'open' || raw == 'backlog') return 'todo';
    return raw;
  }
  final label = (name ?? '').trim().toLowerCase();
  if (label.contains('progress') || label.contains('doing')) return 'in_progress';
  if (label.contains('review')) return 'review';
  if (label.contains('done') || label.contains('complete')) return 'done';
  if (label.contains('cancel')) return 'cancelled';
  return 'todo';
}

String _titleCase(String value) {
  if (value.isEmpty) return value;
  return value
      .split('_')
      .where((part) => part.isNotEmpty)
      .map((part) => '${part[0].toUpperCase()}${part.substring(1)}')
      .join(' ');
}

/// Lightweight cached statuses for task detail — avoids loading the full board.
final projectWorkflowStatusesProvider =
    FutureProvider.family<List<WorkflowStatus>, String>((ref, projectId) async {
  ref.keepAlive();
  final workflowsRepo = ref.watch(workflowsRepositoryProvider);
  var workflows = await workflowsRepo.fetchByProject(projectId);
  if (workflows.isEmpty) {
    await workflowsRepo.createDefaultWorkflow(projectId);
    workflows = await workflowsRepo.fetchByProject(projectId);
  }
  final workflow = workflows.firstWhere(
    (item) => item.isDefault,
    orElse: () => workflows.first,
  );
  return workflowsRepo.fetchStatuses(workflow.id);
});

bool _isTaskOverdue(String? dueDate) {
  return isCalendarDateBeforeToday(dueDate);
}
