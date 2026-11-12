import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../data/models/epic.dart';
import '../../data/repositories/epics_repository.dart';
import '../auth/session_controller.dart';
import '../home/my_work_providers.dart';

final epicsRepositoryProvider = Provider<EpicsRepository>((ref) {
  return EpicsRepository(apiClient: ref.watch(apiClientProvider));
});

/// Epics for one project's board tab, or every epic in the workspace when
/// [projectId] is the "All projects" sentinel.
final epicsForProjectProvider =
    FutureProvider.family<List<Epic>, String>((ref, projectId) async {
  ref.keepAlive();
  final orgId = ref.watch(
    sessionControllerProvider.select((session) => session.orgId),
  );
  if (orgId == null || orgId.isEmpty) {
    throw StateError('No workspace selected');
  }
  final repo = ref.watch(epicsRepositoryProvider);
  if (isAllProjectsSelection(projectId)) {
    return repo.fetchEpics(organizationId: orgId);
  }
  return repo.fetchEpics(organizationId: orgId, projectId: projectId);
});
