import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/project_member.dart';
import '../../data/models/task.dart';
import '../../data/models/task_attachment.dart';
import '../../shared/widgets/app_widgets.dart';
import '../auth/session_controller.dart';
import 'attachment_preview.dart';
import 'attachment_picker_section.dart';
import 'kanban_providers.dart';
import 'assignee_picker_sheet.dart';

const subtaskTitleMaxLength = 200;

const _subtaskStatuses = ['TODO', 'IN_PROGRESS', 'DONE'];

const _priorities = [
  ('LOW', 'Low'),
  ('MEDIUM', 'Medium'),
  ('HIGH', 'High'),
  ('CRITICAL', 'Critical'),
];

class SubtaskDetailPanel extends ConsumerStatefulWidget {
  const SubtaskDetailPanel({
    super.key,
    required this.subtask,
    required this.members,
    required this.taskId,
    required this.organizationId,
    required this.saving,
    required this.onCancel,
    required this.onSave,
  });

  final TaskSubtask subtask;
  final List<ProjectMember> members;
  final String taskId;
  final String organizationId;
  final bool saving;
  final VoidCallback onCancel;
  final ValueChanged<TaskSubtask> onSave;

  @override
  ConsumerState<SubtaskDetailPanel> createState() => _SubtaskDetailPanelState();
}

class _SubtaskDetailPanelState extends ConsumerState<SubtaskDetailPanel> {
  late TextEditingController _titleController;
  late TextEditingController _descriptionController;
  late String _status;
  late String _priority;
  String? _dueDate;
  late List<String> _assigneeIds;
  List<TaskAttachment> _attachments = const [];
  bool _loadingAttachments = true;
  bool _uploadingAttachment = false;
  String? _attachmentError;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.subtask.title);
    _descriptionController =
        TextEditingController(text: widget.subtask.description ?? '');
    _status = _resolveSubtaskStatus(widget.subtask);
    _priority = (widget.subtask.priority ?? 'MEDIUM').toUpperCase();
    _dueDate = widget.subtask.dueDate;
    _assigneeIds = _storedAssigneeIds(widget.subtask);
    _loadAttachments();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _loadAttachments() async {
    setState(() {
      _loadingAttachments = true;
      _attachmentError = null;
    });
    try {
      final items = await ref.read(attachmentsRepositoryProvider).fetchEntityAttachments(
            entityType: 'SUBTASK',
            entityId: widget.subtask.id,
            organizationId: widget.organizationId,
            taskId: widget.taskId,
          );
      if (!mounted) return;
      setState(() {
        _attachments = items;
        _loadingAttachments = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _attachmentError = e.message;
        _loadingAttachments = false;
      });
    }
  }

  Future<void> _uploadAttachment() async {
    final picked = await AttachmentPickerUtils.pickFile();
    if (picked == null) return;
    setState(() {
      _uploadingAttachment = true;
      _attachmentError = null;
    });
    try {
      await ref.read(attachmentsRepositoryProvider).uploadSubtaskAttachment(
            subtaskId: widget.subtask.id,
            taskId: widget.taskId,
            organizationId: widget.organizationId,
            file: picked,
          );
      await _loadAttachments();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _attachmentError = e.message;
        _uploadingAttachment = false;
      });
    } finally {
      if (mounted) setState(() => _uploadingAttachment = false);
    }
  }

  Future<void> _deleteAttachment(String attachmentId) async {
    setState(() => _attachmentError = null);
    try {
      await ref.read(attachmentsRepositoryProvider).deleteAttachment(
            attachmentId: attachmentId,
            organizationId: widget.organizationId,
          );
      if (!mounted) return;
      setState(() {
        _attachments = _attachments.where((item) => item.id != attachmentId).toList();
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _attachmentError = e.message);
    }
  }

  Future<void> _pickDueDate() async {
    final current = _parseDueDate(_dueDate);
    final picked = await showDatePicker(
      context: context,
      initialDate: current ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
    );
    if (picked == null) return;
    setState(() => _dueDate = DateFormat('yyyy-MM-dd').format(picked));
  }

  void _clearDueDate() => setState(() => _dueDate = null);

  void _openAssigneeSheet() {
    showAssigneePickerSheet(
      context: context,
      members: widget.members,
      selectedAssigneeIds: _assigneeIds,
      sessionUser: ref.read(sessionControllerProvider).user,
      enabled: !widget.saving,
      title: 'Assignees',
      showDoneButton: true,
      onSelectionChanged: (next) {
        setState(() => _assigneeIds = next);
      },
    );
  }

  bool get _isDirty {
    final title = _titleController.text.trim();
    final description = _descriptionController.text;
    return title != widget.subtask.title.trim() ||
        description != (widget.subtask.description ?? '') ||
        _status != _resolveSubtaskStatus(widget.subtask) ||
        _priority != (widget.subtask.priority ?? 'MEDIUM').toUpperCase() ||
        _dueDate != widget.subtask.dueDate ||
        !_assigneeListsEqual(_assigneeIds, _storedAssigneeIds(widget.subtask));
  }

  void _handleCancel() {
    if (!_isDirty) {
      widget.onCancel();
      return;
    }
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Discard unsaved changes?'),
        content: const Text(
          'Title, description, and other field edits have not been saved. Attachments already uploaded will remain.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Keep editing'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              widget.onCancel();
            },
            child: const Text('Discard'),
          ),
        ],
      ),
    );
  }

  void _handleSave() {
    final title = _titleController.text.trim();
    if (title.isEmpty || title.length > subtaskTitleMaxLength) return;
    final completed = _status == 'DONE';
    widget.onSave(
      widget.subtask.copyWith(
        title: title,
        description: _descriptionController.text.trim().isEmpty
            ? null
            : _descriptionController.text,
        status: _status,
        completed: completed,
        priority: _priority,
        dueDate: _dueDate,
        assigneeIds: _assigneeIds,
        assigneeId: _assigneeIds.isNotEmpty ? _assigneeIds.first : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dueDate = _parseDueDate(_dueDate);
    final priority = _findPriority(_priority);
    final assigneeCount = _assigneeIds.length;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                'Title',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.textMuted,
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const Spacer(),
              Text(
                '${_titleController.text.length}/$subtaskTitleMaxLength',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: _titleController.text.length >= subtaskTitleMaxLength
                          ? AppColors.danger
                          : AppColors.textMuted,
                    ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          TextField(
            controller: _titleController,
            enabled: !widget.saving,
            maxLength: subtaskTitleMaxLength,
            decoration: InputDecoration(
              hintText: 'Subtask title',
              counterText: '',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'Description',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppColors.textMuted,
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: AppSpacing.xs),
          TextField(
            controller: _descriptionController,
            enabled: !widget.saving,
            minLines: 4,
            maxLines: 8,
            decoration: InputDecoration(
              hintText: 'Add detailed notes...',
              alignLabelWithHint: true,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'SUBTASK ATTACHMENTS',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  letterSpacing: 1.2,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textMuted,
                ),
          ),
          const SizedBox(height: AppSpacing.sm),
          OutlinedButton.icon(
            onPressed: widget.saving || _uploadingAttachment ? null : _uploadAttachment,
            icon: _uploadingAttachment
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.upload_rounded, size: 18),
            label: const Text('Upload'),
          ),
          if (_loadingAttachments)
            const Padding(
              padding: EdgeInsets.only(top: AppSpacing.sm),
              child: LinearProgressIndicator(minHeight: 2),
            )
          else if (_attachments.isEmpty)
            Padding(
              padding: const EdgeInsets.only(top: AppSpacing.sm),
              child: Text(
                'No subtask attachments yet',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.textMuted,
                    ),
              ),
            )
          else
            ..._attachments.map(
              (item) => AttachmentListTile(
                attachment: item,
                organizationId: widget.organizationId,
                enabled: !widget.saving,
                onDelete: () => _deleteAttachment(item.id),
              ),
            ),
          if (_attachmentError != null) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(_attachmentError!, style: const TextStyle(color: AppColors.danger)),
          ],
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: _SubtaskDropdown<String>(
                  label: 'Status',
                  value: _status,
                  enabled: !widget.saving,
                  items: _subtaskStatuses
                      .map(
                        (status) => DropdownMenuItem(
                          value: status,
                          child: Text(_labelForSubtaskStatus(status)),
                        ),
                      )
                      .toList(),
                  onChanged: (value) => setState(() => _status = value),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: _SubtaskDropdown<String>(
                  label: 'Priority',
                  value: priority.$1,
                  enabled: !widget.saving,
                  items: _priorities
                      .map(
                        (item) => DropdownMenuItem(
                          value: item.$1,
                          child: Row(
                            children: [
                              _StatusDot(color: _priorityColor(item.$1)),
                              const SizedBox(width: 8),
                              Text(item.$2),
                            ],
                          ),
                        ),
                      )
                      .toList(),
                  selectedChild: Row(
                    children: [
                      _StatusDot(color: _priorityColor(priority.$1)),
                      const SizedBox(width: 8),
                      Expanded(child: Text(priority.$2)),
                    ],
                  ),
                  onChanged: (value) => setState(() => _priority = value),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: widget.saving ? null : _pickDueDate,
                  icon: const Icon(Icons.calendar_today_rounded, size: 18),
                  label: Text(
                    dueDate == null ? 'Due' : DateFormat('MMM d, yyyy').format(dueDate),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
              if (_dueDate != null) ...[
                const SizedBox(width: AppSpacing.xs),
                TextButton(onPressed: widget.saving ? null : _clearDueDate, child: const Text('Clear')),
              ],
              const SizedBox(width: AppSpacing.sm),
              OutlinedButton(
                onPressed: widget.saving ? null : _openAssigneeSheet,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.person_add_alt_1_rounded, size: 18),
                    const SizedBox(width: 6),
                    Text(assigneeCount == 0 ? 'Assign' : '$assigneeCount'),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(
                onPressed: widget.saving ? null : _handleCancel,
                child: const Text('Cancel'),
              ),
              const SizedBox(width: AppSpacing.sm),
              PrimaryButton(
                label: widget.saving ? 'Saving...' : 'Save',
                expand: false,
                loading: widget.saving,
                onPressed: widget.saving ||
                        _titleController.text.trim().isEmpty ||
                        _titleController.text.length > subtaskTitleMaxLength
                    ? null
                    : _handleSave,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SubtaskDropdown<T> extends StatelessWidget {
  const _SubtaskDropdown({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
    required this.enabled,
    this.selectedChild,
  });

  final String label;
  final T value;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T> onChanged;
  final bool enabled;
  final Widget? selectedChild;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppColors.textMuted,
                fontWeight: FontWeight.w500,
              ),
        ),
        const SizedBox(height: AppSpacing.xs),
        DropdownButtonFormField<T>(
          initialValue: value,
          items: items,
          onChanged: enabled ? (next) { if (next != null) onChanged(next); } : null,
          isExpanded: true,
          decoration: InputDecoration(
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
          selectedItemBuilder: selectedChild == null
              ? null
              : (context) => List.generate(items.length, (_) => selectedChild!),
        ),
      ],
    );
  }
}

class _StatusDot extends StatelessWidget {
  const _StatusDot({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 10,
      height: 10,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }
}

String _resolveSubtaskStatus(TaskSubtask subtask) {
  final status = subtask.status?.toUpperCase();
  if (status != null && _subtaskStatuses.contains(status)) return status;
  return subtask.completed ? 'DONE' : 'TODO';
}

List<String> _storedAssigneeIds(TaskSubtask subtask) {
  if (subtask.assigneeIds.isNotEmpty) return List.of(subtask.assigneeIds);
  if (subtask.assigneeId != null && subtask.assigneeId!.isNotEmpty) {
    return [subtask.assigneeId!];
  }
  return const [];
}

bool _assigneeListsEqual(List<String> a, List<String> b) {
  if (a.length != b.length) return false;
  final normalized = a.map(_normalizeUserId).toSet();
  return b.every((id) => normalized.contains(_normalizeUserId(id)));
}

(String, String) _findPriority(String priorityValue) {
  final upper = priorityValue.toUpperCase();
  for (final item in _priorities) {
    if (item.$1 == upper) return item;
  }
  return _priorities[1];
}

String _labelForSubtaskStatus(String status) {
  return switch (status) {
    'IN_PROGRESS' => 'In Progress',
    'DONE' => 'Done',
    _ => 'To Do',
  };
}

DateTime? _parseDueDate(String? raw) {
  if (raw == null || raw.isEmpty) return null;
  return DateTime.tryParse(raw);
}

Color _priorityColor(String priority) {
  return switch (priority.toUpperCase()) {
    'LOW' => AppColors.textMuted,
    'HIGH' => AppColors.warning,
    'CRITICAL' => AppColors.danger,
    _ => AppColors.sky,
  };
}

String _normalizeUserId(String id) =>
    id.trim().toLowerCase().replaceAll('-', '');
