import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/home_dashboard.dart';
import '../../data/models/workflow.dart';
import '../../shared/widgets/app_widgets.dart';
import '../kanban/kanban_providers.dart';
import '../kanban/task_detail_sheet.dart';
import 'home_due_item_card.dart';
import 'home_providers.dart';

/// Full list of checklist items / leaf tasks due today across the workspace.
class DueTodayScreen extends ConsumerStatefulWidget {
  const DueTodayScreen({super.key});

  @override
  ConsumerState<DueTodayScreen> createState() => _DueTodayScreenState();
}

class _DueTodayScreenState extends ConsumerState<DueTodayScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final dashboardAsync = ref.watch(homeDashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Due Tasks'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textMuted,
          indicatorColor: AppColors.primary,
          tabs: const [
            Tab(text: 'Due Tasks'),
            Tab(text: 'Due from Planner'),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(workspaceAllProjectTasksProvider);
          ref.invalidate(homeDashboardProvider);
          await ref.read(homeDashboardProvider.future);
        },
        child: dashboardAsync.when(
          loading: () => ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(AppSpacing.md),
            children: const [
              ShimmerBox(height: 72),
              SizedBox(height: AppSpacing.sm),
              ShimmerBox(height: 72),
              SizedBox(height: AppSpacing.sm),
              ShimmerBox(height: 72),
            ],
          ),
          error: (_, __) => ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(AppSpacing.md),
            children: [
              SurfaceCard(
                child: Text(
                  'Could not load items due today.',
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium
                      ?.copyWith(color: AppColors.textMuted),
                ),
              ),
            ],
          ),
          data: (dashboard) {
            return TabBarView(
              controller: _tabController,
              children: [
                _DueTodayList(
                  items: dashboard.dueTodayBoardItems,
                  emptyTitle: 'Nothing due today',
                  emptyBody:
                      'Board checklist items and tasks due today will show up here.',
                  onOpenItem: (item) => _openItem(context, ref, item),
                ),
                _DueTodayList(
                  items: dashboard.dueTodayPlannerItems,
                  emptyTitle: 'No planner items due today',
                  emptyBody:
                      'Planner checklist items and runs due today will show up here.',
                  onOpenItem: (item) => _openItem(context, ref, item),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Future<void> _openItem(
    BuildContext context,
    WidgetRef ref,
    HomeDueTodayItem item,
  ) async {
    List<WorkflowStatus> statuses = const [];
    try {
      statuses = await ref
          .read(projectWorkflowStatusesProvider(item.task.projectId).future);
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
          task: item.task,
          statuses: statuses,
          projectId: item.task.projectId,
          initialSubtaskId: item.subtask?.id,
          onUpdated: () {
            ref.invalidate(workspaceAllProjectTasksProvider);
            ref.invalidate(homeDashboardProvider);
          },
          onDeleted: () {
            ref.invalidate(workspaceAllProjectTasksProvider);
            ref.invalidate(homeDashboardProvider);
          },
        );
      },
    );
  }
}

class _DueTodayList extends StatelessWidget {
  const _DueTodayList({
    required this.items,
    required this.emptyTitle,
    required this.emptyBody,
    required this.onOpenItem,
  });

  final List<HomeDueTodayItem> items;
  final String emptyTitle;
  final String emptyBody;
  final ValueChanged<HomeDueTodayItem> onOpenItem;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          SurfaceCard(
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.success.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check_rounded,
                    color: AppColors.success,
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(emptyTitle, style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 2),
                      Text(emptyBody, style: Theme.of(context).textTheme.bodyMedium),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.sm,
        AppSpacing.md,
        AppSpacing.xl,
      ),
      itemCount: items.length + 1,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.xs),
      itemBuilder: (context, index) {
        if (index == 0) {
          return Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.xs),
            child: Text(
              '${items.length} item${items.length == 1 ? '' : 's'}',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
            ),
          );
        }
        final item = items[index - 1];
        return HomeDueItemCard(
          item: item,
          onTap: () => onOpenItem(item),
        );
      },
    );
  }
}
