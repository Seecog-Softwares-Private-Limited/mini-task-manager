import '../../data/models/organization.dart';
import '../../data/models/project_member.dart';
import '../../data/models/task.dart';

String normalizeUserId(String id) => id.trim().toLowerCase().replaceAll('-', '');

List<String> storedTaskAssigneeIds(Task task) {
  if (task.assigneeIds.isNotEmpty) return List.of(task.assigneeIds);
  if (task.assigneeId != null && task.assigneeId!.isNotEmpty) {
    return [task.assigneeId!];
  }
  return const [];
}

List<String> activeTaskAssigneeIds(Task task, List<ProjectMember> members) {
  final memberIds = members.map((m) => normalizeUserId(m.userId)).toSet();
  final seen = <String>{};
  final active = <String>[];
  for (final id in storedTaskAssigneeIds(task)) {
    final key = normalizeUserId(id);
    if (memberIds.contains(key) && seen.add(key)) {
      active.add(id);
    }
  }
  return active;
}

bool isUserTaskReporter({
  required Task task,
  required String? userId,
}) {
  if (userId == null || userId.isEmpty) return false;
  return normalizeUserId(task.reporterId) == normalizeUserId(userId);
}

/// True when the user is a workspace owner or admin.
bool isOwnerOrAdmin({
  required Organization? org,
  required String? userId,
}) {
  if (userId == null || userId.isEmpty) return false;
  final role = org?.myRole?.toLowerCase();
  if (role == 'owner' || role == 'admin') return true;
  final ownerId = org?.ownerId;
  if (ownerId != null && ownerId.isNotEmpty) {
    return normalizeUserId(ownerId) == normalizeUserId(userId);
  }
  return false;
}

bool canManageTaskSubtasks({
  required Organization? org,
  required String? userId,
}) =>
    isOwnerOrAdmin(org: org, userId: userId);

/// Owner/admin can edit every task field on any task.
bool canFullyEditTask({
  required Organization? org,
  required String? userId,
  required Task task,
  required List<ProjectMember> members,
}) {
  if (isOwnerOrAdmin(org: org, userId: userId)) return true;
  return isUserTaskReporter(task: task, userId: userId) &&
      isUserAssignedToTask(task: task, members: members, userId: userId);
}

/// Owner/admin can edit task title and description (matches web `canEditAll` for workspace managers).
bool canEditTaskTitleAndDescription({
  required Organization? org,
  required String? userId,
  required Task task,
  required List<ProjectMember> members,
}) =>
    canFullyEditTask(
      org: org,
      userId: userId,
      task: task,
      members: members,
    );

/// Owner/admin or task assignee can add/edit subtasks.
bool canEditTaskSubtasks({
  required Organization? org,
  required String? userId,
  required Task task,
}) {
  if (userId == null || userId.isEmpty) return false;
  if (isOwnerOrAdmin(org: org, userId: userId)) return true;
  return isUserStoredAssigneeOnTask(task: task, userId: userId);
}

/// Owner/admin can delete any task; task creator can delete their own task.
bool canDeleteTask({
  required Organization? org,
  required String? userId,
  required Task task,
}) {
  if (isOwnerOrAdmin(org: org, userId: userId)) return true;
  return isUserTaskReporter(task: task, userId: userId);
}

/// Owner/admin or active assignee can update status/priority-style workflow fields.
bool canEditTaskWorkflowFields({
  required Organization? org,
  required String? userId,
  required Task task,
  required List<ProjectMember> members,
}) {
  if (userId == null || userId.isEmpty) return false;
  if (isOwnerOrAdmin(org: org, userId: userId)) return true;
  return isUserAssignedToTask(task: task, members: members, userId: userId);
}

bool isUserStoredAssigneeOnTask({
  required Task task,
  required String? userId,
}) {
  if (userId == null || userId.isEmpty) return false;
  final normalized = normalizeUserId(userId);
  return storedTaskAssigneeIds(task)
      .any((id) => normalizeUserId(id) == normalized);
}

bool isUserAssignedToTask({
  required Task task,
  required List<ProjectMember> members,
  required String? userId,
}) {
  if (userId == null || userId.isEmpty) return false;
  final normalized = normalizeUserId(userId);
  return activeTaskAssigneeIds(task, members)
      .any((id) => normalizeUserId(id) == normalized);
}

bool isSubtaskDone(TaskSubtask subtask) {
  final status = subtask.status?.toUpperCase();
  if (status == 'DONE') return true;
  return subtask.completed;
}

bool isCriticalPriority(String? priority) =>
    (priority ?? '').toUpperCase() == 'CRITICAL';
