import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/task.dart';
import '../../data/models/workflow.dart';
import '../projects/projects_providers.dart';
import '../auth/session_controller.dart';
import '../kanban/kanban_providers.dart';
import 'recurring_calendar_tab.dart';
import 'recurring_insights_tab.dart';
import 'recurring_providers.dart';
import 'recurring_series_tab.dart';

class RecurringScreen extends ConsumerWidget {
  const RecurringScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionControllerProvider);
    final projectsAsync = ref.watch(projectsProvider);
    final selectedProjectId = ref.watch(recurringSelectedProjectIdProvider);
    final summaryAsync = ref.watch(recurringSummaryProvider);

    if (session.status == SessionStatus.loading) {
      return const Center(child: CircularProgressIndicator());
    }

    return DefaultTabController(
      length: 3,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.sm, AppSpacing.md, 0),
            child: projectsAsync.when(
              data: (projects) {
                if (projects.isEmpty) {
                  return const Text('No projects — create one in the web app.');
                }
                if (selectedProjectId == null) {
                  return const LinearProgressIndicator();
                }
                // Guard the dropdown: de-duplicate by id and only preselect a
                // value that maps to exactly one item, else the Material
                // DropdownButton assertion trips and breaks the whole screen.
                final seenIds = <String>{};
                final uniqueProjects =
                    projects.where((p) => seenIds.add(p.id)).toList();
                final safeValue =
                    uniqueProjects.any((p) => p.id == selectedProjectId)
                        ? selectedProjectId
                        : null;
                return DropdownButtonFormField<String>(
                  initialValue: safeValue,
                  decoration: const InputDecoration(labelText: 'Project'),
                  items: [
                    for (final project in uniqueProjects)
                      DropdownMenuItem(
                          value: project.id, child: Text(project.name)),
                  ],
                  onChanged: (value) {
                    ref.read(recurringProjectIdProvider.notifier).state = value;
                    ref.invalidate(recurringSummaryProvider);
                    ref.invalidate(recurringTemplatesProvider);
                    ref.invalidate(recurringBoardTasksProvider);
                  },
                );
              },
              loading: () => const LinearProgressIndicator(),
              error: (_, __) => const SizedBox.shrink(),
            ),
          ),
          summaryAsync.maybeWhen(
            data: (summary) => Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Row(
                children: [
                  _Kpi(
                    label: 'Due week',
                    value: '${summary.dueThisWeek}',
                    color: AppColors.sky,
                    icon: Icons.calendar_today_rounded,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  _Kpi(
                    label: 'Overdue',
                    value: '${summary.overdue}',
                    color: AppColors.danger,
                    icon: Icons.error_rounded,
                    onTap: summary.overdue == 0
                        ? null
                        : () => _jumpToEarliestOverdue(ref),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  _Kpi(
                    label: 'Paused',
                    value: '${summary.paused}',
                    color: AppColors.warning,
                    icon: Icons.pause_circle_rounded,
                  ),
                ],
              ),
            ),
            orElse: () => const SizedBox(height: AppSpacing.sm),
          ),
          const TabBar(
            isScrollable: true,
            labelColor: AppColors.primary,
            tabs: [
              Tab(
                icon: Icon(Icons.calendar_month, color: AppColors.sky),
                text: 'Calendar',
              ),
              Tab(
                icon: Icon(Icons.library_books_outlined, color: AppColors.violet),
                text: 'Series',
              ),
              Tab(
                icon: Icon(Icons.insights_rounded, color: AppColors.success),
                text: 'Insights',
              ),
            ],
          ),
          const Expanded(
            child: TabBarView(
              children: [
                RecurringCalendarTab(),
                RecurringSeriesTab(),
                RecurringInsightsTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Moves the calendar to the earliest still-unfinished overdue run so the
/// user can start catching up. Completion is derived from the workflow
/// "done" statuses (mirrors the backend), matching the calendar coloring.
void _jumpToEarliestOverdue(WidgetRef ref) {
  final tasks = ref.read(recurringBoardTasksProvider).valueOrNull ?? const <Task>[];
  if (tasks.isEmpty) return;

  final projectId = ref.read(recurringSelectedProjectIdProvider);
  final statuses = projectId == null
      ? const <WorkflowStatus>[]
      : ref.read(projectWorkflowStatusesProvider(projectId)).valueOrNull ??
          const <WorkflowStatus>[];
  final doneStatusIds = statuses
      .where((s) => s.type.toUpperCase() == 'DONE')
      .map((s) => s.id)
      .toSet();

  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  DateTime? earliest;
  for (final task in tasks) {
    if (task.dueDate == null) continue;
    if (task.statusId != null && doneStatusIds.contains(task.statusId)) {
      continue;
    }
    final parsed = DateTime.tryParse(task.dueDate!);
    if (parsed == null) continue;
    final due = DateTime(parsed.year, parsed.month, parsed.day);
    if (!due.isBefore(today)) continue;
    if (earliest == null || due.isBefore(earliest)) earliest = due;
  }

  if (earliest != null) {
    ref.read(recurringJumpToDateProvider.notifier).state = earliest;
  }
}

class _Kpi extends StatelessWidget {
  const _Kpi({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
    this.onTap,
  });

  final String label;
  final String value;
  final Color color;
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
        padding: const EdgeInsets.all(AppSpacing.sm),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.18)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 15, color: color),
                const SizedBox(width: 5),
                Expanded(
                  child: Text(
                    label,
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              value,
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(color: color, fontWeight: FontWeight.w700),
            ),
          ],
        ),
        ),
      ),
    );
  }
}
