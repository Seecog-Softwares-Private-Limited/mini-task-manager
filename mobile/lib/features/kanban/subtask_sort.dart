import '../../data/models/task.dart';
import 'subtask_completion_utils.dart';
import 'subtask_row_style.dart';

const _priorityOrder = <String, int>{
  'CRITICAL': 0,
  'HIGH': 1,
  'MEDIUM': 2,
  'LOW': 3,
};

/// Checklist display order (matches web / board urgency):
/// 1. Critical (open)
/// 2. In Progress (open, non-critical)
/// 3. Other open subtasks (by priority)
/// 4. Done at the bottom
int compareSubtasksByDisplayOrder(TaskSubtask a, TaskSubtask b) {
  final aStatus = resolveSubtaskStatusValue(a);
  final bStatus = resolveSubtaskStatusValue(b);
  final aDone = aStatus == 'DONE' || isSubtaskDone(a);
  final bDone = bStatus == 'DONE' || isSubtaskDone(b);
  if (aDone != bDone) return aDone ? 1 : -1;

  final aCrit = isCriticalPriority(a.priority);
  final bCrit = isCriticalPriority(b.priority);
  if (aCrit != bCrit) return aCrit ? -1 : 1;

  final aProg = aStatus == 'IN_PROGRESS';
  final bProg = bStatus == 'IN_PROGRESS';
  if (aProg != bProg) return aProg ? -1 : 1;

  final pa = _priorityOrder[(a.priority ?? '').toUpperCase()] ?? 99;
  final pb = _priorityOrder[(b.priority ?? '').toUpperCase()] ?? 99;
  if (pa != pb) return pa - pb;

  final aDue = a.dueDate ?? '9999';
  final bDue = b.dueDate ?? '9999';
  final dueCmp = aDue.compareTo(bDue);
  if (dueCmp != 0) return dueCmp;

  return a.title.compareTo(b.title);
}

List<TaskSubtask> sortSubtasksByDisplayOrder(List<TaskSubtask> subtasks) {
  final next = List<TaskSubtask>.of(subtasks);
  next.sort(compareSubtasksByDisplayOrder);
  return next;
}
