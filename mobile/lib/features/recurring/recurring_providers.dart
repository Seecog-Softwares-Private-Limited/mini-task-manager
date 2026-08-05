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

/// UI-only: when true, the Planner tab's floating “Add planner” button hides
/// while the user scrolls down (so it never covers the run cards).
final recurringFabHiddenProvider = StateProvider<bool>((ref) => false);

/// Set by the summary KPIs to ask the calendar tab to jump to a given day.
/// The calendar consumes and resets it once handled.
final recurringJumpToDateProvider = StateProvider<DateTime?>((ref) => null);

/// Trailing window (in days) used by the Insights analytics tab.
final recurringAnalyticsRangeProvider = StateProvider<int>((ref) => 30);

final recurringAnalyticsProvider =
    FutureProvider<RecurringAnalytics>((ref) async {
  final session = ref.watch(sessionControllerProvider);
  final empty = RecurringAnalytics(
    rangeDays: ref.watch(recurringAnalyticsRangeProvider),
    overall: const RecurringAnalyticsOverall(
      habits: 0,
      totalRuns: 0,
      completed: 0,
      missed: 0,
      skipped: 0,
      successRate: 0,
      bestStreak: 0,
    ),
    habits: const [],
  );

  if (session.status != SessionStatus.authenticated) {
    return empty;
  }

  final orgId = session.orgId;
  if (orgId == null || orgId.isEmpty) {
    return empty;
  }

  final projectId = ref.watch(recurringSelectedProjectIdProvider);
  final days = ref.watch(recurringAnalyticsRangeProvider);
  final repo = ref.watch(recurringRepositoryProvider);
  try {
    return await repo.fetchAnalytics(
      organizationId: orgId,
      projectId: projectId,
      days: days,
    );
  } catch (_) {
    // Analytics route may be missing on older backends — don't break Home.
    return empty;
  }
});

/// Resolves the active project immediately from cache/selection (no async init).
/// Returns null when projects are still loading or the workspace has none.
final recurringSelectedProjectIdProvider = Provider<String?>((ref) {
  final projectsAsync = ref.watch(projectsProvider);
  final projects = projectsAsync.valueOrNull;
  // Still loading — callers should show a brief loader, not treat as empty forever.
  if (projects == null && projectsAsync.isLoading) return null;

  final active = (projects ?? const [])
      .where((p) => !p.isArchived)
      .toList(growable: false);
  if (active.isEmpty) return null;

  final selected = ref.watch(recurringProjectIdProvider);
  if (selected != null &&
      selected.isNotEmpty &&
      active.any((p) => p.id == selected)) {
    return selected;
  }

  final lastId = ref.read(lastProjectIdProvider);
  for (final project in active) {
    if (project.id == lastId) return project.id;
  }
  return active.first.id;
});

final recurringSummaryProvider = FutureProvider<RecurringSummary>((ref) async {
  final session = ref.watch(sessionControllerProvider);
  if (session.status != SessionStatus.authenticated) {
    return const RecurringSummary(
      totalRecurringTasks: 0,
      dueThisWeek: 0,
      overdue: 0,
      completedThisMonth: 0,
      paused: 0,
    );
  }

  final orgId = session.orgId;
  if (orgId == null || orgId.isEmpty) {
    return const RecurringSummary(
      totalRecurringTasks: 0,
      dueThisWeek: 0,
      overdue: 0,
      completedThisMonth: 0,
      paused: 0,
    );
  }

  final projectId = ref.watch(recurringSelectedProjectIdProvider);
  if (projectId == null || projectId.isEmpty) {
    return const RecurringSummary(
      totalRecurringTasks: 0,
      dueThisWeek: 0,
      overdue: 0,
      completedThisMonth: 0,
      paused: 0,
    );
  }

  final repo = ref.watch(recurringRepositoryProvider);
  return repo.fetchSummary(organizationId: orgId, projectId: projectId);
});

final recurringTemplatesProvider =
    FutureProvider<List<RecurringTemplate>>((ref) async {
  final session = ref.watch(sessionControllerProvider);
  if (session.status != SessionStatus.authenticated) {
    return const [];
  }

  final orgId = session.orgId;
  if (orgId == null || orgId.isEmpty) {
    return const [];
  }

  final projectId = ref.watch(recurringSelectedProjectIdProvider);
  if (projectId == null || projectId.isEmpty) {
    return const [];
  }

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
