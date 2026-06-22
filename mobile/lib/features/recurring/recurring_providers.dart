import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/preferences/app_preferences.dart';
import '../../data/models/recurring.dart';
import '../../data/models/task.dart';
import '../../data/repositories/recurring_repository.dart';
import '../auth/session_controller.dart';
import '../projects/projects_providers.dart';

final recurringRepositoryProvider = Provider<RecurringRepository>((ref) {
  return RecurringRepository(apiClient: ref.watch(apiClientProvider));
});

final recurringProjectIdProvider = StateProvider<String?>((ref) => null);

final recurringSummaryProvider =
    FutureProvider.autoDispose<RecurringSummary>((ref) async {
  final orgId = ref.watch(sessionControllerProvider).orgId;
  if (orgId == null) throw StateError('No workspace');
  final projectId = ref.watch(recurringProjectIdProvider);
  return ref.watch(recurringRepositoryProvider).fetchSummary(projectId: projectId);
});

final recurringTemplatesProvider =
    FutureProvider.autoDispose<List<RecurringTemplate>>((ref) async {
  final orgId = ref.watch(sessionControllerProvider).orgId;
  if (orgId == null) throw StateError('No workspace');
  final projectId = ref.watch(recurringProjectIdProvider);
  return ref.watch(recurringRepositoryProvider).fetchTemplates(projectId: projectId);
});

final recurringBoardTasksProvider =
    FutureProvider.autoDispose<List<Task>>((ref) async {
  final orgId = ref.watch(sessionControllerProvider).orgId;
  if (orgId == null) throw StateError('No workspace');
  final projectId = ref.watch(recurringProjectIdProvider);
  if (projectId == null || projectId.isEmpty) return const [];
  return ref.watch(recurringRepositoryProvider).fetchBoardTasks(projectId: projectId);
});

final recurringProjectInitProvider = FutureProvider.autoDispose<void>((ref) async {
  if (ref.read(recurringProjectIdProvider) != null) return;
  final projects = await ref.watch(projectsProvider.future);
  if (projects.isEmpty) return;
  final lastId = ref.read(lastProjectIdProvider);
  String? picked;
  for (final project in projects) {
    if (project.id == lastId) {
      picked = project.id;
      break;
    }
  }
  ref.read(recurringProjectIdProvider.notifier).state =
      picked ?? projects.first.id;
});
