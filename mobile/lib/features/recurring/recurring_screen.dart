import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../shared/widgets/app_widgets.dart';
import '../projects/projects_providers.dart';
import '../auth/session_controller.dart';
import 'recurring_calendar_tab.dart';
import 'recurring_insights_tab.dart';
import 'recurring_providers.dart';
import 'recurring_series_tab.dart';

class RecurringScreen extends ConsumerStatefulWidget {
  const RecurringScreen({super.key});

  @override
  ConsumerState<RecurringScreen> createState() => _RecurringScreenState();
}

class _RecurringScreenState extends ConsumerState<RecurringScreen>
    with SingleTickerProviderStateMixin {
  static const _tabCount = 3;

  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    final initial = ref.read(recurringTabIndexProvider).clamp(0, _tabCount - 1);
    _tabController = TabController(
      length: _tabCount,
      vsync: this,
      initialIndex: initial,
    );
    _tabController.addListener(_onTabControllerChanged);
  }

  void _onTabControllerChanged() {
    if (_tabController.indexIsChanging) return;
    final index = _tabController.index;
    if (ref.read(recurringTabIndexProvider) != index) {
      ref.read(recurringTabIndexProvider.notifier).state = index;
    }
  }

  @override
  void dispose() {
    _tabController
      ..removeListener(_onTabControllerChanged)
      ..dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<int>(recurringTabIndexProvider, (prev, next) {
      final index = next.clamp(0, _tabCount - 1);
      if (_tabController.index != index) {
        _tabController.animateTo(index);
      }
    });

    final session = ref.watch(sessionControllerProvider);
    final projectsAsync = ref.watch(projectsProvider);
    final selectedProjectId = ref.watch(recurringSelectedProjectIdProvider);
    final summaryAsync = ref.watch(recurringSummaryProvider);

    if (session.status == SessionStatus.loading) {
      return const Center(child: CircularProgressIndicator());
    }

    final projects = (projectsAsync.valueOrNull ?? const [])
        .where((p) => !p.isArchived)
        .toList();
    final projectsLoading =
        projectsAsync.isLoading && projectsAsync.valueOrNull == null;
    final noProjects = !projectsLoading && projects.isEmpty;

    if (noProjects) {
      return const Padding(
        padding: EdgeInsets.all(AppSpacing.lg),
        child: EmptyState(
          title: 'No projects yet',
          message:
              'Create a project first, then add recurring planners for it here.',
          icon: Icons.folder_off_outlined,
        ),
      );
    }

    return NotificationListener<ScrollNotification>(
      onNotification: (notification) {
        final fabHidden = ref.read(recurringFabHiddenProvider.notifier);
        if (notification is UserScrollNotification) {
          if (notification.direction == ScrollDirection.reverse) {
            if (!ref.read(recurringFabHiddenProvider)) {
              fabHidden.state = true;
            }
          } else if (notification.direction == ScrollDirection.forward) {
            if (ref.read(recurringFabHiddenProvider)) {
              fabHidden.state = false;
            }
          }
        }
        return false;
      },
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              AppSpacing.sm,
              AppSpacing.md,
              0,
            ),
            child: projectsLoading
                ? const LinearProgressIndicator()
                : selectedProjectId == null
                    ? const LinearProgressIndicator()
                    : DropdownButtonFormField<String>(
                        initialValue: selectedProjectId,
                        decoration: const InputDecoration(labelText: 'Project'),
                        items: [
                          for (final project in projects)
                            DropdownMenuItem(
                              value: project.id,
                              child: Text(project.name),
                            ),
                        ],
                        onChanged: (value) {
                          ref.read(recurringProjectIdProvider.notifier).state =
                              value;
                          ref.invalidate(recurringSummaryProvider);
                          ref.invalidate(recurringTemplatesProvider);
                          ref.invalidate(recurringBoardTasksProvider);
                        },
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
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  _Kpi(
                    label: 'Overdue',
                    value: '${summary.overdue}',
                    color: AppColors.danger,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  _Kpi(
                    label: 'Paused',
                    value: '${summary.paused}',
                    color: AppColors.warning,
                  ),
                ],
              ),
            ),
            orElse: () => const SizedBox(height: AppSpacing.sm),
          ),
          TabBar(
            controller: _tabController,
            labelColor: AppColors.primary,
            tabs: const [
              Tab(
                icon: Icon(Icons.calendar_month, color: AppColors.sky),
                text: 'Calendar',
              ),
              Tab(
                icon: Icon(Icons.library_books_outlined, color: AppColors.violet),
                text: 'Series',
              ),
              Tab(
                icon: Icon(Icons.insights_rounded, color: AppColors.primary),
                text: 'Insights',
              ),
            ],
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: const [
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
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(color: color),
            ),
          ],
        ),
      ),
    );
  }
}
