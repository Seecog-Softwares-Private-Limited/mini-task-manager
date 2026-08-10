import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/task.dart';
import 'kanban_providers.dart';

/// Pick another task in the same project to move a checklist item into.
Future<Task?> showMoveSubtaskTargetSheet({
  required BuildContext context,
  required String projectId,
  required String organizationId,
  required String currentTaskId,
  required String subtaskTitle,
}) {
  return showModalBottomSheet<Task>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) {
      return _MoveSubtaskTargetSheet(
        projectId: projectId,
        organizationId: organizationId,
        currentTaskId: currentTaskId,
        subtaskTitle: subtaskTitle,
      );
    },
  );
}

class _MoveSubtaskTargetSheet extends ConsumerStatefulWidget {
  const _MoveSubtaskTargetSheet({
    required this.projectId,
    required this.organizationId,
    required this.currentTaskId,
    required this.subtaskTitle,
  });

  final String projectId;
  final String organizationId;
  final String currentTaskId;
  final String subtaskTitle;

  @override
  ConsumerState<_MoveSubtaskTargetSheet> createState() =>
      _MoveSubtaskTargetSheetState();
}

class _MoveSubtaskTargetSheetState
    extends ConsumerState<_MoveSubtaskTargetSheet> {
  final _search = TextEditingController();
  List<Task> _tasks = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final tasks = await ref.read(tasksRepositoryProvider).fetchAllByProject(
            projectId: widget.projectId,
            organizationId: widget.organizationId,
          );
      if (!mounted) return;
      setState(() {
        _tasks = tasks
            .where((t) => t.id != widget.currentTaskId)
            .toList()
          ..sort(
            (a, b) => a.title.toLowerCase().compareTo(b.title.toLowerCase()),
          );
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = userFacingError(e);
        _loading = false;
      });
    }
  }

  List<Task> get _filtered {
    final q = _search.text.trim().toLowerCase();
    if (q.isEmpty) return _tasks;
    return _tasks
        .where((t) => t.title.toLowerCase().contains(q))
        .toList(growable: false);
  }

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.sizeOf(context).height * 0.72;
    final filtered = _filtered;

    return Container(
      height: height,
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: AppSpacing.sm),
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Move checklist item',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Move “${widget.subtaskTitle}” to another task in this project.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.textMuted,
                      ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _search,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    hintText: 'Search tasks…',
                    prefixIcon: const Icon(Icons.search_rounded),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    isDense: true,
                  ),
                ),
              ],
            ),
          ),
          Divider(height: 1, color: AppColors.border.withValues(alpha: 0.8)),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(AppSpacing.lg),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                _error!,
                                textAlign: TextAlign.center,
                                style: const TextStyle(color: AppColors.danger),
                              ),
                              const SizedBox(height: AppSpacing.md),
                              FilledButton.tonal(
                                onPressed: _load,
                                child: const Text('Retry'),
                              ),
                            ],
                          ),
                        ),
                      )
                    : filtered.isEmpty
                        ? Center(
                            child: Text(
                              _tasks.isEmpty
                                  ? 'No other tasks in this project.'
                                  : 'No matching tasks.',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyMedium
                                  ?.copyWith(color: AppColors.textMuted),
                            ),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
                            itemCount: filtered.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 4),
                            itemBuilder: (context, index) {
                              final task = filtered[index];
                              return ListTile(
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                leading: const Icon(
                                  Icons.task_alt_rounded,
                                  color: AppColors.primary,
                                ),
                                title: Text(
                                  task.title,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                subtitle: Text(
                                  '${task.completedSubtasks}/${task.subtasks.length} checklist done',
                                  style: Theme.of(context)
                                      .textTheme
                                      .labelSmall
                                      ?.copyWith(color: AppColors.textMuted),
                                ),
                                trailing: const Icon(
                                  Icons.chevron_right_rounded,
                                ),
                                onTap: () => Navigator.of(context).pop(task),
                              );
                            },
                          ),
          ),
        ],
      ),
    );
  }
}
