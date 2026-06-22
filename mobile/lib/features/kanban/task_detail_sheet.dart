import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/task.dart';
import '../../data/models/workflow.dart';
import '../../shared/widgets/app_widgets.dart';
import '../kanban/kanban_providers.dart';

class TaskDetailSheet extends ConsumerStatefulWidget {
  const TaskDetailSheet({
    super.key,
    required this.task,
    required this.statuses,
    required this.projectId,
    required this.onUpdated,
  });

  final Task task;
  final List<WorkflowStatus> statuses;
  final String projectId;
  final VoidCallback onUpdated;

  @override
  ConsumerState<TaskDetailSheet> createState() => _TaskDetailSheetState();
}

class _TaskDetailSheetState extends ConsumerState<TaskDetailSheet> {
  late TextEditingController _titleController;
  late List<TaskSubtask> _subtasks;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.task.title);
    _subtasks = List.of(widget.task.subtasks);
  }

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  Future<void> _saveTitle() async {
    final title = _titleController.text.trim();
    if (title.isEmpty || title == widget.task.title) return;
    await _run(() => ref.read(tasksRepositoryProvider).updateTask(
          taskId: widget.task.id,
          title: title,
        ));
  }

  Future<void> _moveStatus(String? statusId) async {
    await _run(() => ref.read(tasksRepositoryProvider).updateTask(
          taskId: widget.task.id,
          statusId: statusId,
        ));
    if (mounted) Navigator.of(context).pop();
  }

  Future<void> _toggleSubtask(int index, bool? value) async {
    if (value == null) return;
    final updated = List<TaskSubtask>.from(_subtasks);
    final item = updated[index];
    updated[index] = TaskSubtask(
      id: item.id,
      title: item.title,
      completed: value,
    );
    setState(() => _subtasks = updated);
    await _run(() => ref.read(tasksRepositoryProvider).updateTask(
          taskId: widget.task.id,
          subtasks: updated,
        ));
  }

  Future<void> _run(Future<Task> Function() action) async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await action();
      widget.onUpdated();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.78,
      minChildSize: 0.45,
      maxChildSize: 0.92,
      builder: (context, scrollController) {
        return Material(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              AppSpacing.sm,
              AppSpacing.md,
              AppSpacing.lg,
            ),
            children: [
              Center(
                child: Container(
                  width: 42,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              TextField(
                controller: _titleController,
                style: Theme.of(context).textTheme.headlineSmall,
                decoration: const InputDecoration(
                  border: InputBorder.none,
                  hintText: 'Task title',
                ),
                onSubmitted: (_) => _saveTitle(),
              ),
              if (_saving)
                const Padding(
                  padding: EdgeInsets.only(bottom: AppSpacing.sm),
                  child: LinearProgressIndicator(),
                ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: Text(_error!, style: const TextStyle(color: AppColors.danger)),
                ),
              PrimaryButton(
                label: 'Save title',
                expand: false,
                loading: _saving,
                onPressed: _saveTitle,
              ),
              const SizedBox(height: AppSpacing.lg),
              Text('Move to column', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: AppSpacing.sm),
              ...widget.statuses.map((status) {
                final selected = widget.task.statusId == status.id;
                return Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                  child: ListTile(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(
                        color: selected ? AppColors.primary : AppColors.border,
                      ),
                    ),
                    title: Text(status.name),
                    trailing: selected
                        ? const Icon(Icons.check_circle, color: AppColors.primary)
                        : null,
                    onTap: selected ? null : () => _moveStatus(status.id),
                  ),
                );
              }),
              if (_subtasks.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.lg),
                Text('Checklist', style: Theme.of(context).textTheme.titleMedium),
                ...List.generate(_subtasks.length, (index) {
                  final item = _subtasks[index];
                  return CheckboxListTile(
                    value: item.completed,
                    onChanged: _saving ? null : (v) => _toggleSubtask(index, v),
                    title: Text(item.title),
                    controlAffinity: ListTileControlAffinity.leading,
                    contentPadding: EdgeInsets.zero,
                  );
                }),
              ],
            ],
          ),
        );
      },
    );
  }
}
