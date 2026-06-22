import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../data/models/task.dart';
import '../../data/models/workflow.dart';
import '../../data/repositories/attachments_repository.dart';
import '../../data/repositories/tasks_repository.dart';
import '../../data/repositories/workflows_repository.dart';
import '../auth/session_controller.dart';
import '../projects/projects_providers.dart';

class ProjectBoardData {
  const ProjectBoardData({
    required this.statuses,
    required this.tasks,
    required this.projectName,
  });

  final List<WorkflowStatus> statuses;
  final List<Task> tasks;
  final String projectName;

  List<Task> tasksForStatus(String statusId) {
    return tasks.where((task) => task.statusId == statusId).toList();
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
    FutureProvider.autoDispose.family<ProjectBoardData, String>((ref, projectId) async {
  final session = ref.watch(sessionControllerProvider);
  final orgId = session.orgId;
  if (orgId == null || orgId.isEmpty) {
    throw StateError('No workspace selected');
  }

  final workflowsRepo = ref.watch(workflowsRepositoryProvider);
  final tasksRepo = ref.watch(tasksRepositoryProvider);
  final projectsRepo = ref.watch(projectsRepositoryProvider);

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

  final projects = await projectsRepo.fetchProjects(organizationId: orgId);
  String projectName = 'Project board';
  for (final project in projects) {
    if (project.id == projectId) {
      projectName = project.name;
      break;
    }
  }

  return ProjectBoardData(
    statuses: statuses,
    tasks: tasksResult.data,
    projectName: projectName,
  );
});
