import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/utils/recurrence_display.dart';
import '../../data/models/task.dart';
import '../../data/models/workflow.dart';
import '../../data/repositories/attachments_repository.dart';
import '../../data/repositories/tasks_repository.dart';
import '../../data/repositories/workflows_repository.dart';
import '../auth/session_controller.dart';
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
  final tasksResult = await tasksRepo.fetchByProject(
    projectId: projectId,
    organizationId: orgId,
  );
  final tasks =
      tasksResult.data.where((task) => !isRecurringTask(task)).toList();

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
  if (dueDate == null || dueDate.isEmpty) return false;
  final parsed = DateTime.tryParse(dueDate);
  if (parsed == null) return false;
  final local = parsed.toLocal();
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final due = DateTime(local.year, local.month, local.day);
  return due.isBefore(today);
}
