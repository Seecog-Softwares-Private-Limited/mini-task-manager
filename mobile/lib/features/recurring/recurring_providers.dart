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

/// Set by the summary KPIs to ask the calendar tab to jump to a given day.
/// The calendar consumes and resets it once handled.
final recurringJumpToDateProvider = StateProvider<DateTime?>((ref) => null);

/// Trailing window (in days) used by the Insights analytics tab.
final recurringAnalyticsRangeProvider = StateProvider<int>((ref) => 30);

final recurringAnalyticsProvider =
    FutureProvider<RecurringAnalytics>((ref) async {
  final session = ref.watch(sessionControllerProvider);
  if (session.status != SessionStatus.authenticated) {
    throw StateError('Session not ready');
  }

  final orgId = session.orgId;
  if (orgId == null || orgId.isEmpty) {
    throw StateError('No workspace selected');
  }

  final projectId = ref.watch(recurringSelectedProjectIdProvider);
  final days = ref.watch(recurringAnalyticsRangeProvider);
  final repo = ref.watch(recurringRepositoryProvider);
  return repo.fetchAnalytics(
    organizationId: orgId,
    projectId: projectId,
    days: days,
  );
});

/// Resolves the active project immediately from cache/selection (no async init).
final recurringSelectedProjectIdProvider = Provider<String?>((ref) {
  final selected = ref.watch(recurringProjectIdProvider);
  if (selected != null && selected.isNotEmpty) return selected;

  final projects = ref.watch(projectsProvider).valueOrNull;
  if (projects == null || projects.isEmpty) return null;

  final lastId = ref.read(lastProjectIdProvider);
  for (final project in projects) {
    if (project.id == lastId) return project.id;
  }
  return projects.first.id;
});

final recurringSummaryProvider = FutureProvider<RecurringSummary>((ref) async {
  final session = ref.watch(sessionControllerProvider);
  if (session.status != SessionStatus.authenticated) {
    throw StateError('Session not ready');
  }

  final orgId = session.orgId;
  if (orgId == null || orgId.isEmpty) {
    throw StateError('No workspace selected');
  }

  final projectId = ref.watch(recurringSelectedProjectIdProvider);
  final repo = ref.watch(recurringRepositoryProvider);
  return repo.fetchSummary(organizationId: orgId, projectId: projectId);
});

final recurringTemplatesProvider =
    FutureProvider<List<RecurringTemplate>>((ref) async {
  final session = ref.watch(sessionControllerProvider);
  if (session.status != SessionStatus.authenticated) {
    throw StateError('Session not ready');
  }

  final orgId = session.orgId;
  if (orgId == null || orgId.isEmpty) {
    throw StateError('No workspace selected');
  }

  final projectId = ref.watch(recurringSelectedProjectIdProvider);
  final repo = ref.watch(recurringRepositoryProvider);
  return repo.fetchTemplates(organizationId: orgId, projectId: projectId);
});

final recurringBoardTasksProvider = FutureProvider<List<Task>>((ref) async {
  ref.keepAlive();

  final session = ref.watch(sessionControllerProvider);
  if (session.status != SessionStatus.authenticated) return const [];

  final orgId = session.orgId;
  if (orgId == null || orgId.isEmpty) return const [];

  final projectId = ref.watch(recurringSelectedProjectIdProvider);
  if (projectId == null || projectId.isEmpty) return const [];

  final repo = ref.watch(recurringRepositoryProvider);
  return repo.fetchBoardTasks(
    organizationId: orgId,
    projectId: projectId,
    sync: false,
    calendarOnly: true,
  );
});

final recurringTemplateHistoryProvider =
    FutureProvider.family<List<RecurringOccurrence>, String>((ref, templateId) async {
  final session = ref.watch(sessionControllerProvider);
  if (session.status != SessionStatus.authenticated) {
    throw StateError('Session not ready');
  }

  final orgId = session.orgId;
  if (orgId == null || orgId.isEmpty) {
    throw StateError('No workspace selected');
  }

  final repo = ref.watch(recurringRepositoryProvider);
  return repo.fetchTemplateHistory(
    templateId: templateId,
    organizationId: orgId,
  );
});
