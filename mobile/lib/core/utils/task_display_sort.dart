import '../../data/models/task.dart';
import '../../data/models/workflow.dart';

int _priorityRank(String? priority) {
  switch ((priority ?? '').toUpperCase()) {
    case 'CRITICAL':
      return 0;
    case 'HIGH':
      return 1;
    case 'MEDIUM':
      return 2;
    case 'LOW':
      return 3;
    default:
      return 99;
  }
}

String _normalizeStatusType(String? raw) =>
    (raw ?? '').trim().toUpperCase().replaceAll('-', '_');

bool _isDoneType(String type) =>
    type == 'DONE' || type == 'CANCELLED' || type == 'CANCELED';

bool _isInProgressType(String type) =>
    type == 'IN_PROGRESS' || type == 'INPROGRESS' || type == 'PROGRESS';

String _statusTypeOf(
  Task task,
  Map<String, String>? statusTypeById,
) {
  if (statusTypeById == null) return '';
  final id = task.statusId;
  if (id == null || id.isEmpty) return '';
  return _normalizeStatusType(statusTypeById[id]);
}

/// Default list/board order:
/// Critical (open) → In Progress → other open → Done at bottom.
int compareTasksByDisplayOrder(
  Task a,
  Task b, {
  Map<String, String>? statusTypeById,
}) {
  final aType = _statusTypeOf(a, statusTypeById);
  final bType = _statusTypeOf(b, statusTypeById);
  final aDone = _isDoneType(aType) ||
      (a.completedAt != null && a.completedAt!.trim().isNotEmpty);
  final bDone = _isDoneType(bType) ||
      (b.completedAt != null && b.completedAt!.trim().isNotEmpty);
  if (aDone != bDone) return aDone ? 1 : -1;

  final aCrit = (a.priority).toUpperCase() == 'CRITICAL';
  final bCrit = (b.priority).toUpperCase() == 'CRITICAL';
  if (aCrit != bCrit) return aCrit ? -1 : 1;

  final aProg = _isInProgressType(aType);
  final bProg = _isInProgressType(bType);
  if (aProg != bProg) return aProg ? -1 : 1;

  final pa = _priorityRank(a.priority);
  final pb = _priorityRank(b.priority);
  if (pa != pb) return pa.compareTo(pb);

  final da = a.dueDate ?? '9999';
  final db = b.dueDate ?? '9999';
  final dueCmp = da.compareTo(db);
  if (dueCmp != 0) return dueCmp;

  return a.title.toLowerCase().compareTo(b.title.toLowerCase());
}

Map<String, String> statusTypeMapFrom(List<WorkflowStatus> statuses) {
  return {
    for (final status in statuses)
      status.id: _normalizeStatusType(status.type),
  };
}

List<Task> sortTasksForDisplay(
  List<Task> tasks, {
  Map<String, String>? statusTypeById,
}) {
  final sorted = List<Task>.of(tasks);
  sorted.sort(
    (a, b) => compareTasksByDisplayOrder(
      a,
      b,
      statusTypeById: statusTypeById,
    ),
  );
  return sorted;
}

Map<String, List<Task>> sortTasksByStatusMap(
  Map<String, List<Task>> tasksByStatus, {
  Map<String, String>? statusTypeById,
}) {
  return {
    for (final entry in tasksByStatus.entries)
      entry.key: sortTasksForDisplay(
        entry.value,
        statusTypeById: statusTypeById,
      ),
  };
}
