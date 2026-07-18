import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/client_id.dart';
import '../../data/models/pending_attachment.dart';
import '../../data/models/workflow.dart';
import '../../data/repositories/tasks_repository.dart';
import '../../shared/widgets/app_widgets.dart';
import 'attachment_picker_section.dart';
import 'kanban_providers.dart';

class CreateTaskSheet extends ConsumerStatefulWidget {
  const CreateTaskSheet({
    super.key,
    required this.projectId,
    required this.organizationId,
    required this.statuses,
    required this.defaultStatusId,
    required this.onCreated,
    this.scrollController,
  });

  final String projectId;
  final String organizationId;
  final List<WorkflowStatus> statuses;
  final String? defaultStatusId;
  final VoidCallback onCreated;
  final ScrollController? scrollController;

  @override
  ConsumerState<CreateTaskSheet> createState() => _CreateTaskSheetState();
}

class _CreateTaskSheetState extends ConsumerState<CreateTaskSheet> {
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _subtasksSectionKey = GlobalKey();
  final _subtasks = <_SubtaskDraft>[];

  String _priority = 'MEDIUM';
  String? _statusId;
  DateTime? _dueDate;
  TimeOfDay? _dueTime;
  final _taskAttachments = <PendingAttachment>[];

  bool _loading = false;
  String? _error;
  String? _uploadWarning;

  static const _priorities = [
    _PriorityOption('LOW', 'Low', AppColors.success),
    _PriorityOption('MEDIUM', 'Medium', AppColors.warning),
    _PriorityOption('HIGH', 'High', Color(0xFFF97316)),
    _PriorityOption('CRITICAL', 'Critical', AppColors.danger),
  ];

  @override
  void initState() {
    super.initState();
    _statusId = widget.defaultStatusId ??
        (widget.statuses.isNotEmpty ? widget.statuses.first.id : null);
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    for (final subtask in _subtasks) {
      subtask.dispose();
    }
    super.dispose();
  }

  void _addSubtask() {
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {
      // Keep new drafts near the Add button (top), not at the bottom of the list.
      _subtasks.insert(0, _SubtaskDraft(clientId: generateClientId()));
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final ctx = _subtasksSectionKey.currentContext;
      if (ctx != null && mounted) {
        Scrollable.ensureVisible(
          ctx,
          alignment: 0.05,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _removeSubtask(int index) {
    setState(() {
      _subtasks.removeAt(index).dispose();
    });
  }

  Future<void> _pickDueDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365 * 5)),
    );
    if (picked == null) return;
    setState(() => _dueDate = picked);
  }

  Future<void> _pickDueTime() async {
    if (_dueDate == null) return;
    final time = await showTimePicker(
      context: context,
      initialTime: _dueTime ?? const TimeOfDay(hour: 9, minute: 0),
      helpText: 'Due time (optional)',
    );
    if (time == null || !mounted) return;
    setState(() => _dueTime = time);
  }

  Future<void> _submit() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) {
      setState(() => _error = 'Title is required');
      return;
    }

    final subtaskInputs = <CreateTaskSubtaskInput>[];
    for (final draft in _subtasks) {
      final subtaskTitle = draft.titleController.text.trim();
      if (subtaskTitle.isEmpty) continue;
      subtaskInputs.add(
        CreateTaskSubtaskInput(
          clientId: draft.clientId,
          title: subtaskTitle,
          description: draft.descriptionController.text,
          priority: draft.priority,
        ),
      );
    }

    setState(() {
      _loading = true;
      _error = null;
      _uploadWarning = null;
    });

    try {
      final tasksRepo = ref.read(tasksRepositoryProvider);
      final attachmentsRepo = ref.read(attachmentsRepositoryProvider);

      final task = await tasksRepo.createTask(
        projectId: widget.projectId,
        organizationId: widget.organizationId,
        title: title,
        description: _descriptionController.text,
        statusId: _statusId,
        priority: _priority,
        dueDate: _dueDate == null ? null : DateFormat('yyyy-MM-dd').format(_dueDate!),
        dueTime: _dueDate == null || _dueTime == null
            ? null
            : '${_dueTime!.hour.toString().padLeft(2, '0')}:${_dueTime!.minute.toString().padLeft(2, '0')}',
        subtasks: subtaskInputs,
      );

      final uploadErrors = <String>[];

      for (final attachment in _taskAttachments) {
        try {
          await attachmentsRepo.uploadTaskAttachment(
            taskId: task.id,
            organizationId: widget.organizationId,
            file: attachment,
          );
        } on ApiException catch (e) {
          uploadErrors.add('${attachment.fileName}: ${e.message}');
        }
      }

      for (final draft in _subtasks) {
        if (draft.attachments.isEmpty) continue;
        final hasSubtask = subtaskInputs.any((s) => s.clientId == draft.clientId);
        if (!hasSubtask) continue;

        for (final attachment in draft.attachments) {
          try {
            await attachmentsRepo.uploadSubtaskAttachment(
              subtaskId: draft.clientId,
              taskId: task.id,
              organizationId: widget.organizationId,
              file: attachment,
            );
          } on ApiException catch (e) {
            uploadErrors.add('${attachment.fileName}: ${e.message}');
          }
        }
      }

      widget.onCreated();
      if (!mounted) return;

      if (uploadErrors.isNotEmpty) {
        setState(() {
          _uploadWarning =
              'Task created, but some files failed to upload:\n${uploadErrors.take(3).join('\n')}';
          _loading = false;
        });
        await Future<void>.delayed(const Duration(seconds: 2));
      }

      if (mounted) Navigator.of(context).pop();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? const Color(0xFF1E293B) : AppColors.surface;

    return Material(
      color: surface,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      child: Column(
        children: [
          const SizedBox(height: 8),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.border,
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.sm, AppSpacing.xs, AppSpacing.sm),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'New task',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                ),
                IconButton(
                  onPressed: _loading ? null : () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: ListView(
              controller: widget.scrollController,
              padding: EdgeInsets.fromLTRB(
                AppSpacing.md,
                AppSpacing.md,
                AppSpacing.md,
                MediaQuery.of(context).viewInsets.bottom + AppSpacing.md,
              ),
              children: [
                _SectionLabel('Title'),
                TextField(
                  controller: _titleController,
                  autofocus: true,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: const InputDecoration(hintText: 'What needs to be done?'),
                ),
                const SizedBox(height: AppSpacing.md),
                _SectionLabel('Description'),
                TextField(
                  controller: _descriptionController,
                  minLines: 3,
                  maxLines: 6,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: const InputDecoration(
                    hintText: 'Add details, links, or notes…',
                    alignLabelWithHint: true,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                _SectionLabel('Priority'),
                Wrap(
                  spacing: AppSpacing.xs,
                  runSpacing: AppSpacing.xs,
                  children: _priorities.map((option) {
                    final selected = _priority == option.value;
                    return ChoiceChip(
                      label: Text(option.label),
                      selected: selected,
                      onSelected: _loading
                          ? null
                          : (_) => setState(() => _priority = option.value),
                      selectedColor: option.color.withValues(alpha: 0.18),
                      labelStyle: TextStyle(
                        color: selected ? option.color : null,
                        fontWeight: selected ? FontWeight.w600 : null,
                      ),
                      side: BorderSide(
                        color: selected
                            ? option.color.withValues(alpha: 0.5)
                            : AppColors.border,
                      ),
                    );
                  }).toList(),
                ),
                if (widget.statuses.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.md),
                  _SectionLabel('Status'),
                  Wrap(
                    spacing: AppSpacing.xs,
                    runSpacing: AppSpacing.xs,
                    children: widget.statuses.map((status) {
                      final selected = _statusId == status.id;
                      return ChoiceChip(
                        label: Text(status.name),
                        selected: selected,
                        onSelected: _loading
                            ? null
                            : (_) => setState(() => _statusId = status.id),
                      );
                    }).toList(),
                  ),
                ],
                const SizedBox(height: AppSpacing.md),
                _SectionLabel('Due date & time'),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _loading ? null : _pickDueDate,
                        icon: const Icon(Icons.calendar_today_rounded, size: 18),
                        label: Text(
                          _dueDate == null
                              ? 'Date'
                              : DateFormat.yMMMd().format(_dueDate!),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.xs),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _loading || _dueDate == null ? null : _pickDueTime,
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 12,
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.schedule_rounded, size: 18),
                            const SizedBox(width: 8),
                            Flexible(
                              child: Text(
                                _dueTime == null
                                    ? 'Time'
                                    : _dueTime!.format(context),
                                overflow: TextOverflow.ellipsis,
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                if (_dueDate != null) ...[
                  const SizedBox(height: AppSpacing.xs),
                  Row(
                    children: [
                      if (_dueTime != null)
                        TextButton(
                          onPressed:
                              _loading ? null : () => setState(() => _dueTime = null),
                          child: const Text('Clear time'),
                        ),
                      TextButton(
                        onPressed: _loading
                            ? null
                            : () => setState(() {
                                  _dueDate = null;
                                  _dueTime = null;
                                }),
                        child: const Text('Clear date'),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: AppSpacing.md),
                _SectionLabel('Attachments'),
                AttachmentPickerSection(
                  attachments: _taskAttachments,
                  disabled: _loading,
                  onChanged: (items) => setState(() {
                    _taskAttachments
                      ..clear()
                      ..addAll(items);
                  }),
                ),
                const SizedBox(height: AppSpacing.lg),
                Row(
                  key: _subtasksSectionKey,
                  children: [
                    Expanded(
                      child: _SectionLabel('Subtasks'),
                    ),
                    TextButton.icon(
                      onPressed: _loading ? null : _addSubtask,
                      icon: const Icon(Icons.add_rounded, size: 18),
                      label: const Text('Add subtask'),
                    ),
                  ],
                ),
                if (_subtasks.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border.withValues(alpha: 0.8)),
                    ),
                    child: Text(
                      'Break work into smaller steps. Each subtask can have its own files and camera photos.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.textMuted,
                          ),
                    ),
                  )
                else
                  ...List.generate(_subtasks.length, (index) {
                    final draft = _subtasks[index];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: _SubtaskEditorCard(
                        draft: draft,
                        index: index,
                        disabled: _loading,
                        onRemove: () => _removeSubtask(index),
                        onChanged: () => setState(() {}),
                      ),
                    );
                  }),
                if (_error != null) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    _error!,
                    style: TextStyle(color: Theme.of(context).colorScheme.error),
                  ),
                ],
                if (_uploadWarning != null) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    _uploadWarning!,
                    style: const TextStyle(color: AppColors.warning),
                  ),
                ],
                const SizedBox(height: AppSpacing.lg),
                PrimaryButton(
                  label: 'Create task',
                  loading: _loading,
                  onPressed: _submit,
                ),
                const SizedBox(height: AppSpacing.sm),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SubtaskDraft {
  _SubtaskDraft({required this.clientId})
      : titleController = TextEditingController(),
        descriptionController = TextEditingController();

  final String clientId;
  final TextEditingController titleController;
  final TextEditingController descriptionController;
  final List<PendingAttachment> attachments = [];
  String priority = 'MEDIUM';

  void dispose() {
    titleController.dispose();
    descriptionController.dispose();
  }
}

class _SubtaskEditorCard extends StatelessWidget {
  const _SubtaskEditorCard({
    required this.draft,
    required this.index,
    required this.disabled,
    required this.onRemove,
    required this.onChanged,
  });

  final _SubtaskDraft draft;
  final int index;
  final bool disabled;
  final VoidCallback onRemove;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.85)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Text(
                'Subtask ${index + 1}',
                style: Theme.of(context).textTheme.labelLarge,
              ),
              const Spacer(),
              IconButton(
                visualDensity: VisualDensity.compact,
                onPressed: disabled ? null : onRemove,
                icon: const Icon(Icons.delete_outline_rounded),
              ),
            ],
          ),
          TextField(
            controller: draft.titleController,
            enabled: !disabled,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(hintText: 'Subtask title'),
            onChanged: (_) => onChanged(),
          ),
          const SizedBox(height: AppSpacing.xs),
          TextField(
            controller: draft.descriptionController,
            enabled: !disabled,
            minLines: 2,
            maxLines: 4,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(hintText: 'Subtask description (optional)'),
            onChanged: (_) => onChanged(),
          ),
          const SizedBox(height: AppSpacing.sm),
          AttachmentPickerSection(
            attachments: draft.attachments,
            disabled: disabled,
            compact: true,
            onChanged: (items) {
              draft.attachments
                ..clear()
                ..addAll(items);
              onChanged();
            },
          ),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: Text(
        text,
        style: Theme.of(context).textTheme.labelLarge?.copyWith(
              fontWeight: FontWeight.w600,
            ),
      ),
    );
  }
}

class _PriorityOption {
  const _PriorityOption(this.value, this.label, this.color);

  final String value;
  final String label;
  final Color color;
}
