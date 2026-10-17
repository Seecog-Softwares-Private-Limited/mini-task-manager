import '../../data/models/task.dart';
import 'subtask_completion_utils.dart';
import 'subtask_row_style.dart';

/// Checklist display buckets — must match [subtaskRowStyle] accents:
/// 0. Blue — To Do (open, not overdue)
/// 1. Red — Overdue (any open item past due, including in-progress)
/// 2. Yellow — In Progress (not overdue)
/// 3. Green — Done
int _displayBucket(TaskSubtask subtask) {
  final status = resolveSubtaskStatusValue(subtask);
  if (isSubtaskDone(subtask) || status == 'DONE') return 3;
  // Overdue before In Progress so red/yellow groups never interleave.
  if (isSubtaskOverdue(subtask)) return 1;
  if (status == 'IN_PROGRESS') return 2;
  return 0;
}

int _parseMillis(String? raw) {
  final value = raw?.trim();
  if (value == null || value.isEmpty) return 0;
  return DateTime.tryParse(value)?.millisecondsSinceEpoch ?? 0;
}

/// Client ids are often `{epochMicros}_{suffix}` — use as recency fallback.
int _idRecencyMillis(String id) {
  final head = id.split('_').first;
  final n = int.tryParse(head);
  if (n == null || n <= 0) return 0;
  if (n > 100000000000000) return n ~/ 1000; // micros → ms
  if (n > 100000000000) return n; // already ms
  return 0;
}

/// Prefer [updatedAt], then created / completed / id — newest on top.
int _recencyMillis(TaskSubtask subtask) {
  final updated = _parseMillis(subtask.updatedAt);
  if (updated > 0) return updated;
  final created = _parseMillis(subtask.createdAt);
  if (created > 0) return created;
  final completed = _parseMillis(subtask.effectiveCompletedAt);
  if (completed > 0) return completed;
  return _idRecencyMillis(subtask.id);
}

int compareSubtasksByDisplayOrder(TaskSubtask a, TaskSubtask b) {
  final bucketCmp = _displayBucket(a).compareTo(_displayBucket(b));
  if (bucketCmp != 0) return bucketCmp;

  final recencyCmp = _recencyMillis(b).compareTo(_recencyMillis(a));
  if (recencyCmp != 0) return recencyCmp;

  return a.title.compareTo(b.title);
}

List<TaskSubtask> sortSubtasksByDisplayOrder(List<TaskSubtask> subtasks) {
  final next = List<TaskSubtask>.of(subtasks);
  next.sort(compareSubtasksByDisplayOrder);
  return next;
}
