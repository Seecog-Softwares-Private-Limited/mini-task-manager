import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/my_tasks.dart';
import '../auth/session_controller.dart';
import '../kanban/kanban_providers.dart';

enum MyWorkFilter { overdue, today, week, completed, open, all }

extension MyWorkFilterX on MyWorkFilter {
  /// Wire value sent to `GET /tasks/my?filter=`.
  String get wire => switch (this) {
        MyWorkFilter.overdue => 'overdue',
        MyWorkFilter.today => 'today',
        MyWorkFilter.week => 'week',
        MyWorkFilter.completed => 'completed',
        MyWorkFilter.open => 'open',
        MyWorkFilter.all => 'all',
      };

  String get label => switch (this) {
        MyWorkFilter.overdue => 'Overdue',
        MyWorkFilter.today => 'Today',
        MyWorkFilter.week => 'This week',
        MyWorkFilter.completed => 'Done',
        MyWorkFilter.open => 'Open',
        MyWorkFilter.all => 'All',
      };

  static MyWorkFilter fromWire(String? value) {
    return MyWorkFilter.values.firstWhere(
      (f) => f.wire == value,
      orElse: () => MyWorkFilter.open,
    );
  }
}

/// Active filter for the My Work screen; seeded from the route on open.
final myWorkFilterProvider =
    StateProvider<MyWorkFilter>((ref) => MyWorkFilter.open);

final myWorkProvider = FutureProvider.autoDispose<MyTasksResult>((ref) async {
  final orgId = ref.watch(
    sessionControllerProvider.select((session) => session.orgId),
  );
  if (orgId == null || orgId.isEmpty) {
    throw StateError('No workspace selected');
  }
  final filter = ref.watch(myWorkFilterProvider);
  final repo = ref.watch(tasksRepositoryProvider);
  return repo.fetchMyTasks(
    organizationId: orgId,
    filter: filter.wire,
    limit: 100,
  );
});
