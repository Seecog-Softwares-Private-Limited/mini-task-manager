import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../shared/widgets/app_widgets.dart';
import '../projects/projects_providers.dart';
import '../auth/session_controller.dart';
import 'recurring_calendar_tab.dart';
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
      length: 2,
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
                return DropdownButtonFormField<String>(
                  initialValue: selectedProjectId,
                  decoration: const InputDecoration(labelText: 'Project'),
                  items: [
                    for (final project in projects)
                      DropdownMenuItem(value: project.id, child: Text(project.name)),
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
                  _Kpi(label: 'Due week', value: '${summary.dueThisWeek}', color: AppColors.sky),
                  const SizedBox(width: AppSpacing.sm),
                  _Kpi(label: 'Overdue', value: '${summary.overdue}', color: AppColors.danger),
                  const SizedBox(width: AppSpacing.sm),
                  _Kpi(label: 'Paused', value: '${summary.paused}', color: AppColors.warning),
                ],
              ),
            ),
            orElse: () => const SizedBox(height: AppSpacing.sm),
          ),
          const TabBar(
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
            ],
          ),
          const Expanded(
            child: TabBarView(
              children: [
                RecurringCalendarTab(),
                RecurringSeriesTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Kpi extends StatelessWidget {
  const _Kpi({required this.label, required this.value, required this.color});

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: SurfaceCard(
        padding: const EdgeInsets.all(AppSpacing.sm),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(context).textTheme.labelMedium),
            Text(
              value,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(color: color),
            ),
          ],
        ),
      ),
    );
  }
}
