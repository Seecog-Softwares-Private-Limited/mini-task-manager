import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/preferences/app_preferences.dart';
import '../../core/router/app_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../shared/widgets/app_widgets.dart';
import '../../shared/widgets/workspace_avatar.dart';
import '../auth/session_controller.dart';
import '../projects/projects_providers.dart';
import '../recurring/recurring_providers.dart';
import '../workspaces/workspace_switcher_sheet.dart';

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
    final summaryAsync = ref.watch(recurringSummaryProvider);
    final lastProjectId = ref.watch(lastProjectIdProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(projectsProvider);
        ref.invalidate(recurringSummaryProvider);
        await ref.read(projectsProvider.future);
      },
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          SurfaceCard(
            onTap: () => showWorkspaceSwitcherSheet(context: context, ref: ref),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    WorkspaceAvatar(
                      logoUrl: org?.logoUrl,
                      name: org?.name ?? 'Workspace',
                      size: 48,
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          StatusChip(
                            label: 'Workspace',
                            color: AppColors.violet,
                            background: AppColors.violet.withValues(alpha: 0.1),
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            org?.name ?? 'Your workspace',
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  session.user?.fullName != null
                      ? 'Welcome back, ${session.user!.fullName}.'
                      : 'Manage tasks and projects from your phone.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    Icon(Icons.swap_horiz_rounded, size: 16, color: AppColors.primary),
                    const SizedBox(width: 6),
                    Text(
                      'Tap to see all workspaces',
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            color: AppColors.primary,
                          ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              _MetricCard(
                label: 'Projects',
                value: projectsAsync.maybeWhen(
                  data: (projects) => '${projects.length}',
                  orElse: () => '—',
                ),
                color: AppColors.primary,
              ),
              const SizedBox(width: AppSpacing.sm),
              _MetricCard(
                label: 'Due this week',
                value: summaryAsync.maybeWhen(
                  data: (s) => '${s.dueThisWeek}',
                  orElse: () => '—',
                ),
                color: AppColors.sky,
              ),
              const SizedBox(width: AppSpacing.sm),
              _MetricCard(
                label: 'Overdue',
                value: summaryAsync.maybeWhen(
                  data: (s) => '${s.overdue}',
                  orElse: () => '—',
                ),
                color: AppColors.danger,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          Text('Quick actions', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              Expanded(
                child: _QuickAction(
                  icon: Icons.folder_open_rounded,
                  label: 'Projects',
                  color: AppColors.primary,
                  onTap: () => onNavigateTab(1),
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
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          projectsAsync.maybeWhen(
            data: (projects) {
              if (projects.isEmpty) return const SizedBox.shrink();
              final project = projects.where((p) => p.id == lastProjectId).firstOrNull ??
                  projects.first;
              return SecondaryButton(
                label: 'Open ${project.name} board',
                onPressed: () {
                  ref.read(lastProjectIdProvider.notifier).setProjectId(project.id);
                  context.push(AppRoutes.projectBoard(project.id));
                },
              );
            },
            orElse: () => const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }
}

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull {
    final it = iterator;
    if (!it.moveNext()) return null;
    return it.current;
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: SurfaceCard(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(context).textTheme.labelMedium),
            const SizedBox(height: AppSpacing.xs),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: color),
            ),
          ],
        ),
      ),
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
              style: Theme.of(context).textTheme.labelMedium?.copyWith(color: color),
            ),
          ],
        ),
      ),
    );
  }
}
