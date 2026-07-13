import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/preferences/app_preferences.dart';
import '../../core/router/app_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/home_dashboard.dart';
import '../../data/models/recurring.dart';
import '../../data/models/task.dart';
import '../../data/models/workflow.dart';
import '../../shared/widgets/app_widgets.dart';
import '../../shared/widgets/workspace_avatar.dart';
import '../auth/session_controller.dart';
import '../kanban/kanban_providers.dart';
import '../kanban/task_detail_sheet.dart';
import '../projects/projects_providers.dart';
import '../recurring/recurring_providers.dart';
import '../workspaces/workspace_switcher_sheet.dart';
import 'home_providers.dart';

class HomeTab extends ConsumerWidget {
  const HomeTab({
    super.key,
    required this.orgId,
    required this.onNavigateTab,
  });

  final String? orgId;
  final ValueChanged<int> onNavigateTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionControllerProvider);
    final org = ref.watch(selectedOrgProvider);
    final projectsAsync = ref.watch(projectsProvider);
    final dashboardAsync = ref.watch(homeDashboardProvider);
    final analyticsAsync = ref.watch(recurringAnalyticsProvider);
    final lastProjectId = ref.watch(lastProjectIdProvider);

    final firstName = _firstName(session.user?.fullName);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(projectsProvider);
        ref.invalidate(homeDashboardProvider);
        ref.invalidate(recurringAnalyticsProvider);
        await ref.read(homeDashboardProvider.future);
      },
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          _HeroCard(
            greeting: _greeting(),
            firstName: firstName,
            org: org,
            projectCount: projectsAsync.maybeWhen(
              data: (p) => p.length,
              orElse: () => null,
            ),
            onTap: () => showWorkspaceSwitcherSheet(context: context, ref: ref),
          ),
          const SizedBox(height: AppSpacing.md),
          _StatRow(dashboardAsync: dashboardAsync),
          const SizedBox(height: AppSpacing.lg),
          _SectionHeader(
            title: 'Needs attention',
            icon: Icons.priority_high_rounded,
            trailing: TextButton(
              onPressed: () => context.push(AppRoutes.myWork('open')),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(horizontal: 8),
                minimumSize: const Size(0, 32),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: const Text('View all'),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          _NeedsAttention(
            dashboardAsync: dashboardAsync,
            onOpenTask: (task) => _openTask(context, ref, task),
          ),
          const SizedBox(height: AppSpacing.lg),
          _MomentumCard(
            dashboardAsync: dashboardAsync,
            analyticsAsync: analyticsAsync,
            onTap: () => onNavigateTab(2),
          ),
          const SizedBox(height: AppSpacing.lg),
          const _SectionHeader(title: 'Quick actions', icon: Icons.bolt_rounded),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              Expanded(
                child: _QuickAction(
                  icon: Icons.view_kanban_rounded,
                  label: 'Open tasks',
                  color: AppColors.sky,
                  onTap: () => _openLastBoard(context, ref, lastProjectId),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: _QuickAction(
                  icon: Icons.event_repeat_rounded,
                  label: 'Planner',
                  color: AppColors.violet,
                  onTap: () => onNavigateTab(2),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: _QuickAction(
                  icon: Icons.folder_open_rounded,
                  label: 'Projects',
                  color: AppColors.primary,
                  onTap: () => onNavigateTab(1),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _openLastBoard(BuildContext context, WidgetRef ref, String? lastId) {
    final projects = ref.read(projectsProvider).valueOrNull ?? const [];
    if (projects.isEmpty) {
      onNavigateTab(1);
      return;
    }
    final project =
        projects.where((p) => p.id == lastId).firstOrNull ?? projects.first;
    ref.read(lastProjectIdProvider.notifier).setProjectId(project.id);
    context.push(AppRoutes.projectBoard(project.id));
  }

  Future<void> _openTask(BuildContext context, WidgetRef ref, Task task) async {
    List<WorkflowStatus> statuses = const [];
    try {
      statuses = await ref
          .read(projectWorkflowStatusesProvider(task.projectId).future);
    } catch (_) {
      statuses = const [];
    }
    if (!context.mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) {
        return TaskDetailSheet(
          task: task,
          statuses: statuses,
          projectId: task.projectId,
          onUpdated: () => ref.invalidate(homeDashboardProvider),
          onDeleted: () => ref.invalidate(homeDashboardProvider),
        );
      },
    );
  }
}

String _greeting() {
  final hour = DateTime.now().hour;
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

String? _firstName(String? fullName) {
  if (fullName == null || fullName.trim().isEmpty) return null;
  return fullName.trim().split(RegExp(r'\s+')).first;
}

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull {
    final it = iterator;
    if (!it.moveNext()) return null;
    return it.current;
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({
    required this.greeting,
    required this.firstName,
    required this.org,
    required this.projectCount,
    required this.onTap,
  });

  final String greeting;
  final String? firstName;
  final dynamic org;
  final int? projectCount;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          gradient: AppColors.primaryGradient,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.28),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              firstName != null ? '$greeting, $firstName' : greeting,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.white.withValues(alpha: 0.85),
                    fontWeight: FontWeight.w500,
                  ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                WorkspaceAvatar(
                  logoUrl: org?.logoUrl,
                  name: org?.name ?? 'Workspace',
                  size: 44,
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        org?.name ?? 'Your workspace',
                        style: Theme.of(context)
                            .textTheme
                            .headlineSmall
                            ?.copyWith(color: Colors.white),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Icon(Icons.swap_horiz_rounded,
                              size: 14,
                              color: Colors.white.withValues(alpha: 0.85)),
                          const SizedBox(width: 4),
                          Text(
                            'Switch workspace',
                            style: Theme.of(context)
                                .textTheme
                                .labelMedium
                                ?.copyWith(
                                  color: Colors.white.withValues(alpha: 0.85),
                                ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                if (projectCount != null)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Column(
                      children: [
                        Text(
                          '$projectCount',
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                        Text(
                          projectCount == 1 ? 'project' : 'projects',
                          style: Theme.of(context)
                              .textTheme
                              .labelMedium
                              ?.copyWith(
                                color: Colors.white.withValues(alpha: 0.85),
                              ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatRow extends StatelessWidget {
  const _StatRow({required this.dashboardAsync});

  final AsyncValue<HomeDashboard> dashboardAsync;

  @override
  Widget build(BuildContext context) {
    return dashboardAsync.when(
      data: (d) => Row(
        children: [
          _StatCard(
            label: 'Due today',
            value: '${d.counts.dueToday}',
            color: AppColors.sky,
            icon: Icons.today_rounded,
            onTap: () => context.push(AppRoutes.myWork('today')),
          ),
          const SizedBox(width: AppSpacing.sm),
          _StatCard(
            label: 'Overdue',
            value: '${d.counts.overdue}',
            color: AppColors.danger,
            icon: Icons.error_rounded,
            onTap: () => context.push(AppRoutes.myWork('overdue')),
          ),
          const SizedBox(width: AppSpacing.sm),
          _StatCard(
            label: 'Done this week',
            value: '${d.counts.completedThisWeek}',
            color: AppColors.success,
            icon: Icons.check_circle_rounded,
            onTap: () => context.push(AppRoutes.myWork('completed')),
          ),
        ],
      ),
      loading: () => const Row(
        children: [
          Expanded(child: ShimmerBox(height: 78)),
          SizedBox(width: AppSpacing.sm),
          Expanded(child: ShimmerBox(height: 78)),
          SizedBox(width: AppSpacing.sm),
          Expanded(child: ShimmerBox(height: 78)),
        ],
      ),
      error: (_, __) => const Row(
        children: [
          _StatCard(
              label: 'Due today',
              value: '—',
              color: AppColors.sky,
              icon: Icons.today_rounded),
          SizedBox(width: AppSpacing.sm),
          _StatCard(
              label: 'Overdue',
              value: '—',
              color: AppColors.danger,
              icon: Icons.error_rounded),
          SizedBox(width: AppSpacing.sm),
          _StatCard(
              label: 'Done this week',
              value: '—',
              color: AppColors.success,
              icon: Icons.check_circle_rounded),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
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
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Ink(
          padding: const EdgeInsets.all(AppSpacing.sm),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: color.withValues(alpha: 0.18)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 18, color: color),
              const SizedBox(height: AppSpacing.xs),
              Text(
                value,
                style: Theme.of(context)
                    .textTheme
                    .headlineSmall
                    ?.copyWith(color: color, fontWeight: FontWeight.w800),
              ),
              Text(
                label,
                style: Theme.of(context)
                    .textTheme
                    .labelMedium
                    ?.copyWith(color: AppColors.textSecondary),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, required this.icon, this.trailing});

  final String title;
  final IconData icon;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.textMuted),
        const SizedBox(width: 6),
        Text(title, style: Theme.of(context).textTheme.titleMedium),
        if (trailing != null) ...[const Spacer(), trailing!],
      ],
    );
  }
}

class _NeedsAttention extends StatelessWidget {
  const _NeedsAttention({
    required this.dashboardAsync,
    required this.onOpenTask,
  });

  final AsyncValue<HomeDashboard> dashboardAsync;
  final ValueChanged<Task> onOpenTask;

  @override
  Widget build(BuildContext context) {
    return dashboardAsync.when(
      data: (d) {
        final items = <_AttentionItem>[
          for (final t in d.overdueTasks) _AttentionItem(t, overdue: true),
          for (final t in d.dueTodayTasks) _AttentionItem(t, overdue: false),
        ];
        if (items.isEmpty) {
          return SurfaceCard(
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.success.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check_rounded,
                      color: AppColors.success),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('You are all caught up',
                          style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 2),
                      Text(
                        'No tasks assigned to you are overdue or due today.',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        }
        return Column(
          children: [
            for (final item in items) ...[
              _AttentionRow(item: item, onTap: () => onOpenTask(item.task)),
              const SizedBox(height: AppSpacing.xs),
            ],
          ],
        );
      },
      loading: () => const Column(
        children: [
          ShimmerBox(height: 64),
          SizedBox(height: AppSpacing.xs),
          ShimmerBox(height: 64),
        ],
      ),
      error: (error, __) => SurfaceCard(
        child: Text(
          'Could not load your tasks.',
          style: Theme.of(context)
              .textTheme
              .bodyMedium
              ?.copyWith(color: AppColors.textMuted),
        ),
      ),
    );
  }
}

class _AttentionItem {
  const _AttentionItem(this.task, {required this.overdue});
  final Task task;
  final bool overdue;
}

class _AttentionRow extends StatelessWidget {
  const _AttentionRow({required this.item, required this.onTap});

  final _AttentionItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = _priorityColor(item.task.priority);
    final chipColor = item.overdue ? AppColors.danger : AppColors.sky;
    final chipLabel = item.overdue ? 'Overdue' : 'Today';
    return SurfaceCard(
      padding: const EdgeInsets.all(AppSpacing.sm),
      onTap: onTap,
      child: Row(
        children: [
          Container(
            width: 4,
            height: 36,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              item.task.title,
              style: Theme.of(context).textTheme.bodyLarge,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: AppSpacing.xs),
          StatusChip(label: chipLabel, color: chipColor),
        ],
      ),
    );
  }
}

class _MomentumCard extends StatelessWidget {
  const _MomentumCard({
    required this.dashboardAsync,
    required this.analyticsAsync,
    required this.onTap,
  });

  final AsyncValue<HomeDashboard> dashboardAsync;
  final AsyncValue<RecurringAnalytics> analyticsAsync;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final trend = dashboardAsync.valueOrNull?.weeklyTrend ?? const [];
    final maxCount = trend.fold<int>(0, (m, p) => p.count > m ? p.count : m);
    final overall = analyticsAsync.valueOrNull?.overall;
    final successRate = overall?.successRate;
    final bestStreak = overall?.bestStreak;

    return SurfaceCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.insights_rounded,
                  size: 18, color: AppColors.violet),
              const SizedBox(width: 6),
              Text('Momentum',
                  style: Theme.of(context).textTheme.titleMedium),
              const Spacer(),
              const Icon(Icons.chevron_right_rounded,
                  color: AppColors.textMuted),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'This week',
                      style: Theme.of(context)
                          .textTheme
                          .labelMedium
                          ?.copyWith(color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    SizedBox(
                      height: 44,
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          for (final p in trend)
                            Expanded(
                              child: Padding(
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 2),
                                child: Container(
                                  height: maxCount == 0
                                      ? 4
                                      : 4 + (40 * (p.count / maxCount)),
                                  decoration: BoxDecoration(
                                    color: p.count == 0
                                        ? AppColors.border
                                        : AppColors.violet
                                            .withValues(alpha: 0.7),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              _MomentumStat(
                value: successRate != null ? '$successRate%' : '—',
                label: 'Habit success',
                color: AppColors.success,
              ),
              const SizedBox(width: AppSpacing.sm),
              _MomentumStat(
                value: bestStreak != null ? '$bestStreak' : '—',
                label: 'Best streak',
                color: AppColors.warning,
                icon: Icons.local_fire_department_rounded,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MomentumStat extends StatelessWidget {
  const _MomentumStat({
    required this.value,
    required this.label,
    required this.color,
    this.icon,
  });

  final String value;
  final String label;
  final Color color;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 15, color: color),
              const SizedBox(width: 2),
            ],
            Text(
              value,
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(color: color, fontWeight: FontWeight.w800),
            ),
          ],
        ),
        Text(
          label,
          style: Theme.of(context)
              .textTheme
              .labelMedium
              ?.copyWith(color: AppColors.textSecondary),
        ),
      ],
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Ink(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.18)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color),
            const SizedBox(height: AppSpacing.xs),
            Text(
              label,
              style: Theme.of(context)
                  .textTheme
                  .labelMedium
                  ?.copyWith(color: color),
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

Color _priorityColor(String priority) {
  switch (priority.toUpperCase()) {
    case 'CRITICAL':
      return AppColors.danger;
    case 'HIGH':
      return AppColors.warning;
    case 'LOW':
      return AppColors.textMuted;
    default:
      return AppColors.sky;
  }
}
