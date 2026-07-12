import 'paginated_result.dart';
import 'task.dart';

/// Result of `GET /tasks/my` — a filtered page of the user's tasks plus
/// global counts per filter (used to badge the filter chips).
class MyTasksResult {
  const MyTasksResult({
    required this.data,
    required this.meta,
    required this.counts,
  });

  final List<Task> data;
  final PaginatedMeta meta;
  final MyTasksCounts counts;

  factory MyTasksResult.fromJson(Map<String, dynamic> json) {
    return MyTasksResult(
      data: (json['data'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(Task.fromJson)
          .toList(),
      meta: PaginatedMeta.fromJson(
        (json['meta'] as Map<String, dynamic>?) ?? const {},
      ),
      counts: MyTasksCounts.fromJson(
        (json['counts'] as Map<String, dynamic>?) ?? const {},
      ),
    );
  }
}

class MyTasksCounts {
  const MyTasksCounts({
    required this.overdue,
    required this.today,
    required this.week,
    required this.completed,
    required this.open,
    required this.all,
  });

  final int overdue;
  final int today;
  final int week;
  final int completed;
  final int open;
  final int all;

  factory MyTasksCounts.fromJson(Map<String, dynamic> json) {
    return MyTasksCounts(
      overdue: json['overdue'] as int? ?? 0,
      today: json['today'] as int? ?? 0,
      week: json['week'] as int? ?? 0,
      completed: json['completed'] as int? ?? 0,
      open: json['open'] as int? ?? 0,
      all: json['all'] as int? ?? 0,
    );
  }
}
