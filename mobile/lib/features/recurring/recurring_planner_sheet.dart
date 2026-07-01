import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/recurring.dart';
import '../../data/models/task.dart';
import '../../data/models/workflow.dart';
import '../../shared/widgets/app_widgets.dart';
import '../auth/session_controller.dart';
import '../kanban/kanban_providers.dart';
import '../kanban/task_detail_sheet.dart';
import 'recurring_providers.dart';

Future<void> showRecurringPlannerSheet({
  required BuildContext context,
  required WidgetRef ref,
  required RecurringTemplate template,
  required String projectId,
}) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (sheetContext) {
      return DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.82,
        minChildSize: 0.45,
        maxChildSize: 0.95,
        builder: (context, scrollController) {
          return _RecurringPlannerSheet(
            template: template,
            projectId: projectId,
            scrollController: scrollController,
          );
        },
      );
    },
  );
}

class _RecurringPlannerSheet extends ConsumerStatefulWidget {
  const _RecurringPlannerSheet({
    required this.template,
    required this.projectId,
    required this.scrollController,
  });

  final RecurringTemplate template;
  final String projectId;
  final ScrollController scrollController;

  @override
  ConsumerState<_RecurringPlannerSheet> createState() => _RecurringPlannerSheetState();
}

class _RecurringPlannerSheetState extends ConsumerState<_RecurringPlannerSheet> {
  String? _openingTaskId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(projectWorkflowStatusesProvider(widget.projectId));
    });
  }

  RecurringTemplate get template => widget.template;
  String get projectId => widget.projectId;
  ScrollController get scrollController => widget.scrollController;

  Map<String, Task> _cachedTasksById() {
    final tasks = ref.read(recurringBoardTasksProvider).valueOrNull ?? const [];
    return {for (final task in tasks) task.id: task};
  }

  @override
  Widget build(BuildContext context) {
    final historyAsync = ref.watch(recurringTemplateHistoryProvider(template.id));
    final next = DateTime.tryParse(template.nextDueDate);
    final nextLabel = next != null ? DateFormat('MMM d, yyyy').format(next.toLocal()) : '—';

    return Material(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              AppSpacing.sm,
              AppSpacing.md,
              AppSpacing.sm,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        template.title,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                    ),
                    StatusChip(
                      label: template.isPaused ? 'Paused' : template.repeatType,
                      color: template.isPaused ? AppColors.warning : AppColors.violet,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Next run: $nextLabel · ${template.completed}/${template.generatedCount} done',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.textMuted,
                      ),
                ),
                if (template.completionHealth != null) ...[
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    'Health ${(template.completionHealth! * 100).round()}%',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: AppColors.sky,
                        ),
                  ),
                ],
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    if (template.isPaused)
                      TextButton(
                        onPressed: () => _togglePause(ref, resume: true),
                        child: const Text('Resume'),
                      )
                    else
                      TextButton(
                        onPressed: () => _togglePause(ref, resume: false),
                        child: const Text('Pause'),
                      ),
                  ],
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              AppSpacing.md,
              AppSpacing.md,
              AppSpacing.xs,
            ),
            child: Text(
              'Planner runs',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ),
          Expanded(
            child: historyAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(error.toString(), textAlign: TextAlign.center),
                      const SizedBox(height: AppSpacing.md),
                      PrimaryButton(
                        label: 'Retry',
                        expand: false,
                        onPressed: () =>
                            ref.invalidate(recurringTemplateHistoryProvider(template.id)),
                      ),
                    ],
                  ),
                ),
              ),
              data: (occurrences) {
                if (occurrences.isEmpty) {
                  return const Center(
                    child: EmptyState(
                      title: 'No runs yet',
                      message: 'Scheduled runs for this planner will appear here.',
                      icon: Icons.event_repeat_rounded,
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(recurringTemplateHistoryProvider(template.id));
                    await ref.read(recurringTemplateHistoryProvider(template.id).future);
                  },
                  child: ListView.separated(
                    controller: scrollController,
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.md,
                      0,
                      AppSpacing.md,
                      AppSpacing.lg,
                    ),
                    itemCount: occurrences.length,
                    separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.xs),
                    itemBuilder: (context, index) {
                      final occurrence = occurrences[index];
                      final taskId = occurrence.taskId;
                      return _OccurrenceTile(
                        occurrence: occurrence,
                        loading: taskId != null && taskId == _openingTaskId,
                        onOpen: taskId == null || taskId.isEmpty
                            ? null
                            : () => _openTask(context, taskId),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _togglePause(WidgetRef ref, {required bool resume}) async {
    final orgId = ref.read(sessionControllerProvider).orgId;
    if (orgId == null) return;
    final repo = ref.read(recurringRepositoryProvider);
    if (resume) {
      await repo.resumeTemplate(templateId: template.id, organizationId: orgId);
    } else {
      await repo.pauseTemplate(templateId: template.id, organizationId: orgId);
    }
    ref.invalidate(recurringTemplatesProvider);
    ref.invalidate(recurringSummaryProvider);
  }

  Future<void> _openTask(BuildContext context, String taskId) async {
    if (_openingTaskId != null) return;
    setState(() => _openingTaskId = taskId);

    try {
      final cached = _cachedTasksById()[taskId];
      final statusesFuture = ref.read(projectWorkflowStatusesProvider(projectId).future);
      final taskFuture = cached != null
          ? Future<Task>.value(cached)
          : ref.read(tasksRepositoryProvider).fetchTask(taskId);

      final results = await Future.wait<Object>([
        taskFuture,
        statusesFuture,
      ]);
      final task = results[0] as Task;
      final statuses = results[1] as List<WorkflowStatus>;

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
              ref.invalidate(recurringBoardTasksProvider);
              ref.invalidate(recurringTemplateHistoryProvider(template.id));
              ref.invalidate(recurringTemplatesProvider);
              ref.invalidate(recurringSummaryProvider);
            },
          );
        },
      );
    } on ApiException catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    } finally {
      if (mounted) setState(() => _openingTaskId = null);
    }
  }
}

class _OccurrenceTile extends StatelessWidget {
  const _OccurrenceTile({
    required this.occurrence,
    this.onOpen,
    this.loading = false,
  });

  final RecurringOccurrence occurrence;
  final VoidCallback? onOpen;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final due = DateTime.tryParse(occurrence.dueDate);
    final dueLabel = due != null ? DateFormat('MMM d, yyyy').format(due.toLocal()) : occurrence.dueDate;
    final state = occurrence.state.toUpperCase();
    final stateColor = switch (state) {
      'COMPLETED' => AppColors.success,
      'SKIPPED' => AppColors.warning,
      'MISSED' => AppColors.danger,
      _ => AppColors.sky,
    };

    return SurfaceCard(
      child: InkWell(
        onTap: loading ? null : onOpen,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            children: [
              Icon(Icons.event_repeat_rounded, color: AppColors.violet, size: 20),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Run #${occurrence.sequenceNumber}',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                    Text(
                      dueLabel,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.textMuted,
                          ),
                    ),
                  ],
                ),
              ),
              StatusChip(label: state, color: stateColor),
              if (loading) ...[
                const SizedBox(width: AppSpacing.xs),
                const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ] else if (onOpen != null) ...[
                const SizedBox(width: AppSpacing.xs),
                Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
