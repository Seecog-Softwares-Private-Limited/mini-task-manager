import '../../data/models/task.dart';
import 'subtask_completion_utils.dart';
import 'subtask_row_style.dart';

bool _hasDueAssigned(TaskSubtask subtask) {
  final date = subtask.dueDate?.trim() ?? '';
  final time = subtask.dueTime?.trim() ?? '';
  return date.isNotEmpty || time.isNotEmpty;
}

/// Checklist display buckets:
/// 1. No date/time assigned (open)
/// 2. Due today and still completable (not overdue)
/// 3. Overdue (open)
/// 4. In Progress
/// 5. Completed (most recently marked done first)
int _displayBucket(TaskSubtask subtask) {
  final status = resolveSubtaskStatusValue(subtask);
  if (isSubtaskDone(subtask) || status == 'DONE') return 4;
  if (status == 'IN_PROGRESS') return 3;
  if (!_hasDueAssigned(subtask)) return 0;
  if (isSubtaskOverdue(subtask)) return 2;
  return 1;
}

String _dueSortKey(TaskSubtask subtask) {
  final date = subtask.dueDate?.trim() ?? '';
  final time = subtask.dueTime?.trim() ?? '';
  if (date.isEmpty && time.isEmpty) return '9999';
  if (date.isEmpty) return '0000-00-00T$time';
  if (time.isEmpty) return date;
  return '${date}T$time';
}

int _completedAtMillis(TaskSubtask subtask) {
  final raw = subtask.effectiveCompletedAt?.trim();
  if (raw == null || raw.isEmpty) return 0;
  return DateTime.tryParse(raw)?.millisecondsSinceEpoch ?? 0;
}

int compareSubtasksByDisplayOrder(TaskSubtask a, TaskSubtask b) {
  final bucketCmp = _displayBucket(a).compareTo(_displayBucket(b));
  if (bucketCmp != 0) return bucketCmp;

  // Within done: newest completion on top.
  if (_displayBucket(a) == 4) {
    final doneCmp = _completedAtMillis(b).compareTo(_completedAtMillis(a));
    if (doneCmp != 0) return doneCmp;
    return a.title.compareTo(b.title);
  }

  final dueCmp = _dueSortKey(a).compareTo(_dueSortKey(b));
  if (dueCmp != 0) return dueCmp;

  return a.title.compareTo(b.title);
}

List<TaskSubtask> sortSubtasksByDisplayOrder(List<TaskSubtask> subtasks) {
  final next = List<TaskSubtask>.of(subtasks);
  next.sort(compareSubtasksByDisplayOrder);
  return next;
}
