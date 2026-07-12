import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/home_dashboard.dart';
import '../auth/session_controller.dart';
import '../kanban/kanban_providers.dart';

/// Per-user home dashboard (my overdue/due-today work, counts, weekly trend).
final homeDashboardProvider = FutureProvider<HomeDashboard>((ref) async {
  final orgId = ref.watch(
    sessionControllerProvider.select((session) => session.orgId),
  );
  if (orgId == null || orgId.isEmpty) {
    throw StateError('No workspace selected');
  }
  final repo = ref.watch(tasksRepositoryProvider);
  return repo.fetchHomeDashboard(organizationId: orgId);
});
