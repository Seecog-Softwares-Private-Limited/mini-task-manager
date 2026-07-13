import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/my_tasks.dart';
import '../../data/models/task.dart';
import '../../data/models/workflow.dart';
import '../../shared/widgets/app_widgets.dart';
import '../kanban/kanban_providers.dart';
import '../kanban/task_detail_sheet.dart';
import '../projects/projects_providers.dart';
import 'home_providers.dart';
import 'my_work_providers.dart';

class MyWorkScreen extends ConsumerStatefulWidget {
  const MyWorkScreen({super.key, required this.initialFilter});

  final MyWorkFilter initialFilter;

  @override
  ConsumerState<MyWorkScreen> createState() => _MyWorkScreenState();
}

class _MyWorkScreenState extends ConsumerState<MyWorkScreen> {
  @override
  void initState() {
    super.initState();
    // Seed the active filter before the first build reads myWorkProvider.
    ref.read(myWorkFilterProvider.notifier).state = widget.initialFilter;
  }

  Future<void> _openTask(Task task) async {
    List<WorkflowStatus> statuses = const [];
    try {
      statuses = await ref
          .read(projectWorkflowStatusesProvider(task.projectId).future);
    } catch (_) {
      statuses = const [];
    }
    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) {
        return TaskDetailSheet(
          task: task,
          statuses: statuses,
          projectId: task.projectId,
          onUpdated: () {
            ref.invalidate(myWorkProvider);
            ref.invalidate(homeDashboardProvider);
          },
          onDeleted: () {
            ref.invalidate(myWorkProvider);
            ref.invalidate(homeDashboardProvider);
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final activeFilter = ref.watch(myWorkFilterProvider);
    final resultAsync = ref.watch(myWorkProvider);
    final counts = resultAsync.valueOrNull?.counts;
    final projects = ref.watch(projectsProvider).valueOrNull ?? const [];
    final projectNames = {for (final p in projects) p.id: p.name};

    return Scaffold(
      appBar: AppBar(title: const Text('My work')),
      body: Column(
        children: [
          _FilterBar(
            active: activeFilter,
            counts: counts,
            onSelected: (f) =>
                ref.read(myWorkFilterProvider.notifier).state = f,
          ),
          const Divider(height: 1),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(myWorkProvider);
                await ref.read(myWorkProvider.future);
              },
              child: resultAsync.when(
                data: (result) => _TaskList(
                  result: result,
                  filter: activeFilter,
                  projectNames: projectNames,
                  onOpenTask: _openTask,
                ),
                loading: () => ListView(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  children: const [
                    ShimmerBox(height: 64),
                    SizedBox(height: AppSpacing.sm),
                    ShimmerBox(height: 64),
                    SizedBox(height: AppSpacing.sm),
                    ShimmerBox(height: 64),
                  ],
                ),
                error: (error, __) => ListView(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      child: EmptyState(
                        icon: Icons.error_outline_rounded,
                        title: 'Could not load tasks',
                        message: error.toString(),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterBar extends StatelessWidget {
  const _FilterBar({
    required this.active,
    required this.counts,
    required this.onSelected,
  });

  final MyWorkFilter active;
  final MyTasksCounts? counts;
  final ValueChanged<MyWorkFilter> onSelected;

  int? _countFor(MyWorkFilter f) {
    final c = counts;
    if (c == null) return null;
    return switch (f) {
      MyWorkFilter.overdue => c.overdue,
      MyWorkFilter.today => c.today,
      MyWorkFilter.week => c.week,
      MyWorkFilter.completed => c.completed,
      MyWorkFilter.open => c.open,
      MyWorkFilter.all => c.all,
    };
  }

  @override
  Widget build(BuildContext context) {
    const order = [
      MyWorkFilter.overdue,
      MyWorkFilter.today,
      MyWorkFilter.week,
      MyWorkFilter.open,
      MyWorkFilter.completed,
      MyWorkFilter.all,
    ];
    return SizedBox(
      height: 56,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
        children: [
          for (final f in order)
            Padding(
              padding: const EdgeInsets.only(right: AppSpacing.xs),
              child: Center(
                child: ChoiceChip(
                  selected: active == f,
                  label: Text(
                    _countFor(f) != null
                        ? '${f.label} ${_countFor(f)}'
                        : f.label,
                  ),
                  onSelected: (_) => onSelected(f),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _TaskList extends StatelessWidget {
  const _TaskList({
    required this.result,
    required this.filter,
    required this.projectNames,
    required this.onOpenTask,
  });

  final MyTasksResult result;
  final MyWorkFilter filter;
  final Map<String, String> projectNames;
  final ValueChanged<Task> onOpenTask;

  @override
  Widget build(BuildContext context) {
    if (result.data.isEmpty) {
      return ListView(
        children: [
          Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: EmptyState(
              icon: filter == MyWorkFilter.completed
                  ? Icons.emoji_events_outlined
                  : Icons.check_circle_outline_rounded,
              title: _emptyTitle(filter),
              message: _emptyMessage(filter),
            ),
          ),
        ],
      );
    }

    final hasMore = result.meta.total > result.data.length;
    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.md),
      itemCount: result.data.length + (hasMore ? 1 : 0),
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
      itemBuilder: (context, index) {
        if (index >= result.data.length) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
            child: Text(
              'Showing ${result.data.length} of ${result.meta.total}',
              textAlign: TextAlign.center,
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: AppColors.textMuted),
            ),
          );
        }
        final task = result.data[index];
        return _MyTaskRow(
          task: task,
          projectName: projectNames[task.projectId],
          onTap: () => onOpenTask(task),
        );
      },
    );
  }

  String _emptyTitle(MyWorkFilter f) => switch (f) {
        MyWorkFilter.overdue => 'Nothing overdue',
        MyWorkFilter.today => 'Nothing due today',
        MyWorkFilter.week => 'Clear this week',
        MyWorkFilter.completed => 'No completions yet',
        MyWorkFilter.open => 'No open tasks',
        MyWorkFilter.all => 'Nothing here',
      };

  String _emptyMessage(MyWorkFilter f) => switch (f) {
        MyWorkFilter.completed =>
          'Finish a task and it will show up here.',
        MyWorkFilter.overdue =>
          'You are on top of your deadlines. Nice work.',
        _ => 'No tasks assigned to you match this filter.',
      };
}

class _MyTaskRow extends StatelessWidget {
  const _MyTaskRow({
    required this.task,
    required this.projectName,
    required this.onTap,
  });

  final Task task;
  final String? projectName;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final completed = task.completedAt != null;
    final color = _priorityColor(task.priority);
    final due = _dueMeta(task);

    return SurfaceCard(
      padding: const EdgeInsets.all(AppSpacing.sm),
      onTap: onTap,
      child: Row(
        children: [
          Container(
            width: 4,
            height: 40,
            decoration: BoxDecoration(
              color: completed ? AppColors.success : color,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  task.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        decoration:
                            completed ? TextDecoration.lineThrough : null,
                        color: completed ? AppColors.textMuted : null,
                      ),
                ),
                if (projectName != null && projectName!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      const Icon(Icons.folder_outlined,
                          size: 13, color: AppColors.textMuted),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          projectName!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context)
                              .textTheme
                              .labelMedium
                              ?.copyWith(color: AppColors.textMuted),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          if (due != null) ...[
            const SizedBox(width: AppSpacing.xs),
            StatusChip(label: due.$1, color: due.$2),
          ],
        ],
      ),
    );
  }
}

/// Returns (label, color) describing the task's due state, or null.
(String, Color)? _dueMeta(Task task) {
  if (task.completedAt != null) return ('Done', AppColors.success);
  final raw = task.dueDate;
  if (raw == null || raw.isEmpty) return null;
  final parsed = DateTime.tryParse(raw);
  if (parsed == null) return null;
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final due = DateTime(parsed.year, parsed.month, parsed.day);
  final diff = due.difference(today).inDays;
  if (diff < 0) {
    final d = -diff;
    return (d == 1 ? '1d overdue' : '${d}d overdue', AppColors.danger);
  }
  if (diff == 0) return ('Today', AppColors.sky);
  if (diff == 1) return ('Tomorrow', AppColors.warning);
  if (diff <= 7) return ('${diff}d', AppColors.textMuted);
  return null;
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
