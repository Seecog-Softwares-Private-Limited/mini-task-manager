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
