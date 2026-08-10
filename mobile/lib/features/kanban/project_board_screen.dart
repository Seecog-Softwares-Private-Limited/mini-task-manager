import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_exception.dart';
import '../../core/preferences/app_preferences.dart';
import '../../core/router/app_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/calendar_date.dart';
import '../../data/models/task.dart';
import '../../data/models/workflow.dart';
import '../../shared/widgets/app_widgets.dart';
import '../auth/session_controller.dart';
import '../home/my_work_providers.dart';
import 'create_task_sheet.dart';
import 'kanban_providers.dart';
import 'project_switcher.dart';
import 'task_detail_sheet.dart';

class ProjectBoardScreen extends ConsumerStatefulWidget {
  const ProjectBoardScreen({
    super.key,
    required this.projectId,
    this.embedded = false,
  });

  final String projectId;

  /// When true, hides standalone chrome (back / project switcher) for the Tasks tab.
  final bool embedded;

  @override
  ConsumerState<ProjectBoardScreen> createState() => _ProjectBoardScreenState();
}

class _ProjectBoardScreenState extends ConsumerState<ProjectBoardScreen> {
  late final PageController _pageController;
  int _selectedColumn = 0;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _selectColumn(int index) {
    if (index == _selectedColumn) return;
    HapticFeedback.selectionClick();
    setState(() => _selectedColumn = index);
    _pageController.animateToPage(
      index,
      duration: const Duration(milliseconds: 280),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    final boardAsync = ref.watch(projectBoardProvider(widget.projectId));
    final session = ref.watch(sessionControllerProvider);
    final orgId = session.orgId;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final allProjects = isAllProjectsSelection(widget.projectId);

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0B1220) : const Color(0xFFF1F5F9),
      body: boardAsync.when(
        loading: () => const _BoardLoadingSkeleton(),
        error: (error, _) {
          final message = error is ApiException
              ? error.message
              : 'Unable to load board.';
          return _BoardScaffold(
            embedded: widget.embedded,
            header: const _BoardTitleHeader(title: 'Board'),
            child: EmptyState(
              title: 'Board unavailable',
              message: message,
              icon: Icons.view_kanban_outlined,
            ),
          );
        },
        data: (rawBoard) {
          final board = widget.embedded
              ? _applyEmbeddedFilters(
                  rawBoard,
                  memberId: ref.watch(tasksMemberFilterProvider),
                  filters: ref.watch(tasksBoardFiltersProvider),
                  currentUserId: session.user?.id,
                )
              : rawBoard;

          if (board.statuses.isEmpty) {
            return _BoardScaffold(
              embedded: widget.embedded,
              header: widget.embedded
                  ? _BoardTitleHeader(
                      title: allProjects ? 'All projects' : 'Board',
                      subtitle: 'No workflow columns',
                    )
                  : ProjectSwitcher(
                      selectedProjectId: widget.projectId,
                      subtitle: 'No workflow columns',
                    ),
              child: const EmptyState(
                title: 'No workflow columns',
                message: 'Create a workflow in the web app first.',
                icon: Icons.view_column_outlined,
              ),
            );
          }

          if (_selectedColumn >= board.statuses.length) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) setState(() => _selectedColumn = 0);
            });
          }

          final totalTasks = board.tasks.length;
          final overdueCount = board.overdueCount;
          final boardBody = Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _StatusStrip(
                statuses: board.statuses,
                selectedIndex: _selectedColumn,
                taskCounts: {
                  for (final status in board.statuses)
                    status.id: board.countForStatus(status.id),
                },
                colorForStatus: (status) => _parseColor(status.color),
                onSelect: _selectColumn,
              ),
              Expanded(
                child: PageView.builder(
                  controller: _pageController,
                  itemCount: board.statuses.length,
                  onPageChanged: (index) {
                    HapticFeedback.selectionClick();
                    setState(() => _selectedColumn = index);
                  },
                  itemBuilder: (context, index) {
                    final status = board.statuses[index];
                    final tasks = board.tasksForStatus(status.id);
                    return _ColumnPage(
                      status: status,
                      statusColor: _parseColor(status.color),
                      tasks: tasks,
                      onRefresh: () async {
                        ref.invalidate(projectBoardProvider(widget.projectId));
                        await ref
                            .read(projectBoardProvider(widget.projectId).future);
                      },
                      onOpenTask: (task) => _openTaskSheet(
                        context,
                        ref,
                        task: task,
                        board: rawBoard,
                      ),
                    );
                  },
                ),
              ),
            ],
          );

          return _BoardScaffold(
            embedded: widget.embedded,
            header: widget.embedded
                ? _BoardTitleHeader(
                    title: allProjects ? 'All projects' : 'Board',
                    subtitle:
                        '$totalTasks tasks · ${board.statuses.length} columns',
                  )
                : ProjectSwitcher(
                    selectedProjectId: widget.projectId,
                    taskCount: totalTasks,
                    subtitle:
                        '$totalTasks tasks · ${board.statuses.length} columns',
                  ),
            onRefresh: () async {
              ref.invalidate(projectBoardProvider(widget.projectId));
              await ref.read(projectBoardProvider(widget.projectId).future);
            },
            headerStats: [
              _HeaderStat(
                icon: Icons.task_alt_rounded,
                label: 'Total',
                value: '$totalTasks',
                color: AppColors.primary,
              ),
              _HeaderStat(
                icon: Icons.warning_amber_rounded,
                label: 'Overdue',
                value: '$overdueCount',
                color:
                    overdueCount > 0 ? AppColors.danger : AppColors.textMuted,
              ),
              _HeaderStat(
                icon: Icons.view_column_rounded,
                label: 'Columns',
                value: '${board.statuses.length}',
                color: AppColors.violet,
              ),
            ],
            child: boardBody,
          );
        },
      ),
      floatingActionButton: allProjects
          ? null
          : boardAsync.maybeWhen(
              data: (board) => orgId == null || board.statuses.isEmpty
                  ? null
                  : _CreateTaskFab(
                      onPressed: () => _openCreateTask(context, ref, board, orgId),
                    ),
              orElse: () => null,
            ),
    );
  }

  Future<void> _openCreateTask(
    BuildContext context,
    WidgetRef ref,
    ProjectBoardData board,
    String orgId,
  ) async {
    final defaultStatus = board.statuses.length > _selectedColumn
        ? board.statuses[_selectedColumn].id
        : board.statuses.first.id;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) {
        final height = MediaQuery.of(context).size.height * 0.92;
        return SizedBox(
          height: height,
          child: CreateTaskSheet(
            projectId: widget.projectId,
            organizationId: orgId,
            statuses: board.statuses,
            defaultStatusId: defaultStatus,
            onCreated: () {
              ref.invalidate(projectBoardProvider(widget.projectId));
              ref.read(lastProjectIdProvider.notifier).setProjectId(widget.projectId);
            },
          ),
        );
      },
    );
  }

  Future<void> _openTaskSheet(
    BuildContext context,
    WidgetRef ref, {
    required Task task,
    required ProjectBoardData board,
  }) async {
    final allProjects = isAllProjectsSelection(widget.projectId);
    final projectId = allProjects ? task.projectId : widget.projectId;
    final statuses = allProjects
        ? await ref.read(projectWorkflowStatusesProvider(projectId).future)
        : board.statuses;

    if (!context.mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return TaskDetailSheet(
          task: task,
          statuses: statuses,
          projectId: projectId,
          onUpdated: () {
            ref.invalidate(projectBoardProvider(widget.projectId));
            if (allProjects) {
              ref.invalidate(projectBoardProvider(projectId));
            }
          },
        );
      },
    );
  }

  Color _parseColor(String? raw) {
    if (raw == null || raw.isEmpty) return AppColors.primary;
    var value = raw.replaceAll('#', '');
    if (value.length == 6) value = 'FF$value';
    final parsed = int.tryParse(value, radix: 16);
    if (parsed == null) return AppColors.primary;
    return Color(parsed);
  }
}

ProjectBoardData _applyEmbeddedFilters(
  ProjectBoardData board, {
  String? memberId,
  required TasksBoardFilters filters,
  String? currentUserId,
}) {
  final hasMember = memberId != null && memberId.isNotEmpty;
  if (!hasMember && !filters.isActive) return board;

  // Preserve column placement from the source board (important for All projects
  // where column ids are synthetic and differ from task.statusId).
  final taskColumn = <String, String>{};
  for (final status in board.statuses) {
    for (final task in board.tasksForStatus(status.id)) {
      taskColumn[task.id] = status.id;
    }
  }

  final filtered = board.tasks
      .where(
        (task) => matchesTasksBoardFilters(
          task,
          memberId: memberId,
          filters: filters,
          currentUserId: currentUserId,
        ),
      )
      .toList();

  final tasksByStatus = <String, List<Task>>{
    for (final status in board.statuses) status.id: <Task>[],
  };
  var overdueCount = 0;
  for (final task in filtered) {
    final columnId = taskColumn[task.id] ?? task.statusId;
    if (columnId != null && columnId.isNotEmpty) {
      tasksByStatus.putIfAbsent(columnId, () => []).add(task);
    }
    if (isTaskDueOverdue(task.dueDate)) overdueCount++;
  }

  return ProjectBoardData(
    statuses: board.statuses,
    tasks: filtered,
    projectName: board.projectName,
    tasksByStatus: tasksByStatus,
    overdueCount: overdueCount,
  );
}

class _BoardScaffold extends StatelessWidget {
  const _BoardScaffold({
    required this.header,
    required this.child,
    this.headerStats,
    this.onRefresh,
    this.embedded = false,
  });

  final Widget header;
  final List<_HeaderStat>? headerStats;
  final Widget child;
  final Future<void> Function()? onRefresh;
  final bool embedded;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final topGradient = isDark
        ? [const Color(0xFF1E293B), const Color(0xFF0B1220)]
        : [const Color(0xFFFFFFFF), const Color(0xFFF1F5F9)];

    final headerPadding = embedded
        ? const EdgeInsets.fromLTRB(
            AppSpacing.md, AppSpacing.sm, AppSpacing.md, AppSpacing.sm)
        : const EdgeInsets.fromLTRB(
            AppSpacing.xs, AppSpacing.xs, AppSpacing.md, AppSpacing.md);

    final headerBlock = Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: topGradient,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: headerPadding,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                if (!embedded) ...[
                  _CircleIconButton(
                    icon: Icons.arrow_back_rounded,
                    onPressed: () => AppRoutes.leaveProjectBoard(context),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                ],
                Expanded(child: header),
                if (onRefresh != null)
                  _CircleIconButton(
                    icon: Icons.refresh_rounded,
                    onPressed: () => onRefresh!(),
                  ),
              ],
            ),
            if (headerStats != null) ...[
              SizedBox(height: embedded ? AppSpacing.sm : AppSpacing.md),
              Row(
                children: [
                  for (var i = 0; i < headerStats!.length; i++) ...[
                    if (i > 0) const SizedBox(width: AppSpacing.sm),
                    Expanded(child: headerStats![i]),
                  ],
                ],
              ),
            ],
          ],
        ),
      ),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (embedded)
          headerBlock
        else
          SafeArea(bottom: false, child: headerBlock),
        Expanded(child: child),
      ],
    );
  }
}

class _BoardTitleHeader extends StatelessWidget {
  const _BoardTitleHeader({required this.title, this.subtitle});

  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 2),
          Text(
            subtitle!,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontSize: 13),
          ),
        ],
      ],
    );
  }
}

class _CircleIconButton extends StatelessWidget {
  const _CircleIconButton({required this.icon, required this.onPressed});

  final IconData icon;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Material(
      color: isDark
          ? Colors.white.withValues(alpha: 0.08)
          : AppColors.surface,
      shape: const CircleBorder(),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onPressed,
        child: SizedBox(
          width: 44,
          height: 44,
          child: Icon(icon, size: 22),
        ),
      ),
    );
  }
}

class _HeaderStat extends StatelessWidget {
  const _HeaderStat({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.sm),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.06)
            : AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.08)
              : AppColors.border.withValues(alpha: 0.8),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 16, color: color),
          ),
          const SizedBox(width: AppSpacing.xs),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  value,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: color,
                        fontWeight: FontWeight.w700,
                      ),
                ),
                Text(
                  label,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusStrip extends StatelessWidget {
  const _StatusStrip({
    required this.statuses,
    required this.selectedIndex,
    required this.taskCounts,
    required this.colorForStatus,
    required this.onSelect,
  });

  final List<WorkflowStatus> statuses;
  final int selectedIndex;
  final Map<String, int> taskCounts;
  final Color Function(WorkflowStatus) colorForStatus;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final chipBackground = isDark ? const Color(0xFF1E293B) : AppColors.surface;

    return SizedBox(
      height: 52,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.sm, AppSpacing.md, AppSpacing.xs),
        itemCount: statuses.length,
        separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.xs),
        itemBuilder: (context, index) {
          final status = statuses[index];
          final selected = index == selectedIndex;
          final color = colorForStatus(status);
          final count = taskCounts[status.id] ?? 0;

          return AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOutCubic,
            child: Material(
              color: selected
                  ? color.withValues(alpha: 0.14)
                  : chipBackground,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(999),
                side: BorderSide(
                  color: selected
                      ? color.withValues(alpha: 0.55)
                      : AppColors.border.withValues(alpha: 0.7),
                  width: selected ? 1.5 : 1,
                ),
              ),
              child: InkWell(
                borderRadius: BorderRadius.circular(999),
                onTap: () => onSelect(index),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        status.name,
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                              fontSize: 13,
                              color: selected ? color : null,
                            ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: selected
                              ? color.withValues(alpha: 0.2)
                              : AppColors.border.withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          '$count',
                          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                                fontSize: 11,
                                color: selected ? color : AppColors.textMuted,
                              ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _ColumnPage extends StatelessWidget {
  const _ColumnPage({
    required this.status,
    required this.statusColor,
    required this.tasks,
    required this.onOpenTask,
    this.onRefresh,
  });

  final WorkflowStatus status;
  final Color statusColor;
  final List<Task> tasks;
  final ValueChanged<Task> onOpenTask;
  final Future<void> Function()? onRefresh;

  @override
  Widget build(BuildContext context) {
    final listView = tasks.isEmpty
        ? ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              const SizedBox(height: AppSpacing.xl),
              _EmptyColumnState(statusName: status.name, statusColor: statusColor),
            ],
          )
        : ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.xs, AppSpacing.md, 100),
            itemCount: tasks.length,
            separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
            itemBuilder: (context, index) {
              final task = tasks[index];
              return RepaintBoundary(
                child: _PremiumTaskCard(
                  task: task,
                  onTap: () => onOpenTask(task),
                ),
              );
            },
          );

    if (onRefresh == null) return listView;

    return RefreshIndicator(
      edgeOffset: 0,
      onRefresh: onRefresh!,
      child: listView,
    );
  }
}

class _EmptyColumnState extends StatelessWidget {
  const _EmptyColumnState({
    required this.statusName,
    required this.statusColor,
  });

  final String statusName;
  final Color statusColor;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            color: statusColor.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(Icons.inbox_rounded, size: 34, color: statusColor),
        ),
        const SizedBox(height: AppSpacing.md),
        Text(
          'Nothing in $statusName',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          'Tasks moved here will show up in this column.',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      ],
    );
  }
}

class _PremiumTaskCard extends StatelessWidget {
  const _PremiumTaskCard({required this.task, required this.onTap});

  final Task task;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final priority = _priorityMeta(task.priority);
    final dueMeta = _dueMeta(task.dueDate);
    final subtaskProgress = task.subtasks.isEmpty
        ? null
        : task.completedSubtasks / task.subtasks.length;
    final borderColor = isDark
        ? Colors.white.withValues(alpha: 0.08)
        : AppColors.border.withValues(alpha: 0.75);

    final title = task.title.trim().isEmpty ? 'Untitled task' : task.title;
    final titleColor = isDark ? Colors.white : AppColors.textPrimary;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: borderColor),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.05),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Stack(
            children: [
              Positioned(
                left: 0,
                top: 0,
                bottom: 0,
                child: Container(
                  width: 4,
                  decoration: BoxDecoration(
                    color: priority.color,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(16),
                      bottomLeft: Radius.circular(16),
                    ),
                  ),
                ),
              ),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(
                        AppSpacing.sm + 4,
                        AppSpacing.sm,
                        AppSpacing.xs,
                        AppSpacing.sm,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  height: 1.3,
                                  fontWeight: FontWeight.w600,
                                  color: titleColor,
                                ),
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          Wrap(
                            spacing: AppSpacing.xs,
                            runSpacing: AppSpacing.xs,
                            children: [
                              _MetaPill(
                                icon: priority.icon,
                                label: priority.label,
                                color: priority.color,
                                background: priority.background,
                              ),
                              if (dueMeta != null)
                                _MetaPill(
                                  icon: dueMeta.icon,
                                  label: dueMeta.label,
                                  color: dueMeta.color,
                                  background: dueMeta.background,
                                ),
                            ],
                          ),
                          if (subtaskProgress != null) ...[
                            const SizedBox(height: AppSpacing.sm),
                            Row(
                              children: [
                                const Icon(Icons.checklist_rounded, size: 14, color: AppColors.violet),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(999),
                                    child: LinearProgressIndicator(
                                      value: subtaskProgress,
                                      minHeight: 5,
                                      backgroundColor: AppColors.violet.withValues(alpha: 0.12),
                                      color: AppColors.violet,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  '${task.completedSubtasks}/${task.subtasks.length}',
                                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                                        color: AppColors.violet,
                                        fontSize: 11,
                                      ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(right: AppSpacing.xs, top: AppSpacing.sm),
                    child: Icon(
                      Icons.chevron_right_rounded,
                      color: AppColors.textMuted.withValues(alpha: 0.7),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MetaPill extends StatelessWidget {
  const _MetaPill({
    required this.icon,
    required this.label,
    required this.color,
    required this.background,
  });

  final IconData icon;
  final String label;
  final Color color;
  final Color background;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: color,
                  fontSize: 11,
                ),
          ),
        ],
      ),
    );
  }
}

class _CreateTaskFab extends StatelessWidget {
  const _CreateTaskFab({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          colors: [AppColors.primary, AppColors.primaryGradientEnd],
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.4),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: FloatingActionButton.extended(
        elevation: 0,
        highlightElevation: 0,
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        onPressed: onPressed,
        icon: const Icon(Icons.add_rounded),
        label: const Text('New task'),
      ),
    );
  }
}

class _BoardLoadingSkeleton extends StatelessWidget {
  const _BoardLoadingSkeleton();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                ShimmerBox(width: 180, height: 22),
                SizedBox(height: AppSpacing.sm),
                ShimmerBox(width: 120, height: 14),
                SizedBox(height: AppSpacing.lg),
                Row(
                  children: [
                    Expanded(child: ShimmerBox(height: 56)),
                    SizedBox(width: AppSpacing.sm),
                    Expanded(child: ShimmerBox(height: 56)),
                    SizedBox(width: AppSpacing.sm),
                    Expanded(child: ShimmerBox(height: 56)),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        SizedBox(
          height: 44,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            itemCount: 4,
            separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.xs),
            itemBuilder: (_, __) => const ShimmerBox(width: 110, height: 36, radius: 999),
          ),
        ),
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.all(AppSpacing.md),
            itemCount: 5,
            separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
            itemBuilder: (_, __) => const ShimmerBox(height: 96),
          ),
        ),
      ],
    );
  }
}

class _PriorityMeta {
  const _PriorityMeta({
    required this.label,
    required this.color,
    required this.background,
    required this.icon,
  });

  final String label;
  final Color color;
  final Color background;
  final IconData icon;
}

class _DueMeta {
  const _DueMeta({
    required this.label,
    required this.color,
    required this.background,
    required this.icon,
  });

  final String label;
  final Color color;
  final Color background;
  final IconData icon;
}

_PriorityMeta _priorityMeta(String priority) {
  return switch (priority.toLowerCase()) {
    'urgent' || 'critical' => const _PriorityMeta(
        label: 'Urgent',
        color: AppColors.danger,
        background: AppColors.dangerSoft,
        icon: Icons.priority_high_rounded,
      ),
    'high' => const _PriorityMeta(
        label: 'High',
        color: AppColors.warning,
        background: Color(0xFFFEF3C7),
        icon: Icons.arrow_upward_rounded,
      ),
    'low' => const _PriorityMeta(
        label: 'Low',
        color: AppColors.textMuted,
        background: Color(0xFFF1F5F9),
        icon: Icons.arrow_downward_rounded,
      ),
    _ => const _PriorityMeta(
        label: 'Medium',
        color: AppColors.sky,
        background: Color(0xFFE0F2FE),
        icon: Icons.remove_rounded,
      ),
  };
}

_DueMeta? _dueMeta(String? dueDate) {
  final due = parseCalendarDate(dueDate);
  if (due == null) return null;

  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final overdue = due.isBefore(today);
  final dueToday = due == today;

  final label = overdue
      ? 'Overdue · ${DateFormat('MMM d').format(due)}'
      : dueToday
          ? 'Due today'
          : DateFormat('MMM d').format(due);

  return _DueMeta(
    label: label,
    color: overdue ? AppColors.danger : dueToday ? AppColors.warning : AppColors.sky,
    background: overdue
        ? AppColors.dangerSoft
        : dueToday
            ? const Color(0xFFFEF3C7)
            : const Color(0xFFE0F2FE),
    icon: overdue ? Icons.event_busy_rounded : Icons.calendar_today_rounded,
  );
}
