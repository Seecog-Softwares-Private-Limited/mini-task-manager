import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/pending_attachment.dart';
import '../../data/models/subtask_completion_record.dart';
import '../../data/models/project_member.dart';
import '../../data/models/task.dart';
import '../../data/models/task_attachment.dart';
import '../../shared/widgets/app_widgets.dart';
import '../auth/session_controller.dart';
import 'attachment_preview.dart';
import 'attachment_picker_section.dart';
import 'kanban_providers.dart';
import 'assignee_picker_sheet.dart';

import 'subtask_completion_utils.dart';

typedef SubtaskCompletionRequest = Future<SubtaskCompletionRecord?> Function({
  required String subtaskId,
  required String subtaskTitle,
  required String? subtaskPriority,
});

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
    required this.canComplete,
    required this.onRequestCompletion,
    required this.onCancel,
    required this.onSave,
  });

  final TaskSubtask subtask;
  final List<ProjectMember> members;
  final String taskId;
  final String organizationId;
  final bool saving;
  final bool canComplete;
  final SubtaskCompletionRequest onRequestCompletion;
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
  SubtaskCompletionRecord? _completionRecord;

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
    _completionRecord = widget.subtask.completionRecord;
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

  Future<void> _pickAndUpload(Future<PendingAttachment?> Function() pick) async {
    final picked = await pick();
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

  void _showNotAssigned() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Only assigned team members can complete this subtask.'),
      ),
    );
  }

  Future<void> _handleStatusChange(String value) async {
    if (value == 'DONE' && _status != 'DONE') {
      if (!widget.canComplete) {
        _showNotAssigned();
        return;
      }
      final record = await widget.onRequestCompletion(
        subtaskId: widget.subtask.id,
        subtaskTitle: _titleController.text.trim().isEmpty
            ? widget.subtask.title
            : _titleController.text.trim(),
        subtaskPriority: _priority,
      );
      if (record == null) return;
      if (!mounted) return;
      setState(() {
        _status = 'DONE';
        _completionRecord = record;
      });
      widget.onSave(
        widget.subtask.copyWith(
          title: _titleController.text.trim().isEmpty
              ? widget.subtask.title
              : _titleController.text.trim(),
          description: _descriptionController.text.trim().isEmpty
              ? null
              : _descriptionController.text,
          status: 'DONE',
          completed: true,
          priority: _priority,
          dueDate: _dueDate,
          assigneeIds: _assigneeIds,
          assigneeId: _assigneeIds.isNotEmpty ? _assigneeIds.first : null,
          completionRecord: record,
        ),
      );
      return;
    }

    setState(() {
      _status = value;
      if (value != 'DONE') _completionRecord = null;
    });
  }

  Future<void> _handleSave() async {
    final title = _titleController.text.trim();
    if (title.isEmpty || title.length > subtaskTitleMaxLength) return;

    final movingToDone = _status == 'DONE' && !isSubtaskDone(widget.subtask);
    var record = _completionRecord ?? widget.subtask.completionRecord;
    if (movingToDone && record == null) {
      if (!widget.canComplete) {
        _showNotAssigned();
        return;
      }
      record = await widget.onRequestCompletion(
        subtaskId: widget.subtask.id,
        subtaskTitle: title,
        subtaskPriority: _priority,
      );
      if (record == null) return;
      _completionRecord = record;
    }

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
        completionRecord: completed ? record : null,
        clearCompletionRecord: !completed,
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
          AttachmentUploadActions(
            disabled: widget.saving,
            uploading: _uploadingAttachment,
            onPickAndUpload: _pickAndUpload,
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
            AttachmentGrid(
              organizationId: widget.organizationId,
              enabled: !widget.saving,
              items: _attachments.asMap().entries.map(
                (entry) => AttachmentGridEntry(
                  attachment: entry.value,
                  index: entry.key + 1,
                  onDelete: () => _deleteAttachment(entry.value.id),
                ),
              ).toList(),
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
                  enabled: !widget.saving && (widget.canComplete || _status == 'DONE'),
                  items: _subtaskStatuses
                      .map(
                        (status) => DropdownMenuItem(
                          value: status,
                          enabled: widget.canComplete || status != 'DONE',
                          child: Text(_labelForSubtaskStatus(status)),
                        ),
                      )
                      .toList(),
                  onChanged: _handleStatusChange,
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
          if (!widget.canComplete) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Only assigned team members can mark this subtask as Done.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.warning),
            ),
          ],
          if (_completionRecord != null) ...[
            const SizedBox(height: AppSpacing.md),
            _CompletionRecordCard(record: _completionRecord!),
          ],
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

class _CompletionRecordCard extends StatelessWidget {
  const _CompletionRecordCard({required this.record});

  final SubtaskCompletionRecord record;

  @override
  Widget build(BuildContext context) {
    final completedAt = DateTime.tryParse(record.completedAt);
    final timestamp = completedAt == null
        ? record.completedAt
        : DateFormat('MMM d, yyyy · h:mm a').format(completedAt.toLocal());

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.successSoft.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.success.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Completion record',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: AppSpacing.sm),
          _row('Completed', timestamp),
          _row('By', record.employeeName),
          _row(
            'Location',
            '${record.latitude.toStringAsFixed(5)}, ${record.longitude.toStringAsFixed(5)}',
          ),
          _row(
            'Geofence',
            record.geofenceValid ? 'Validated on site' : 'Outside site',
          ),
          if (record.notes != null && record.notes!.isNotEmpty) _row('Notes', record.notes!),
          if (record.beforePhotoFileNames.isNotEmpty)
            _row('Before photos', '${record.beforePhotoFileNames.length} attached'),
          if (record.afterPhotoFileNames.isNotEmpty)
            _row('After photos', '${record.afterPhotoFileNames.length} attached'),
          if (record.voiceNoteFileName != null) _row('Voice note', record.voiceNoteFileName!),
          if (record.videoFileName != null) _row('Video', record.videoFileName!),
        ],
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: RichText(
        text: TextSpan(
          style: const TextStyle(color: AppColors.textPrimary, fontSize: 13, height: 1.35),
          children: [
            TextSpan(
              text: '$label: ',
              style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.textMuted),
            ),
            TextSpan(text: value),
          ],
        ),
      ),
    );
  }
}

String _normalizeUserId(String id) =>
    id.trim().toLowerCase().replaceAll('-', '');
