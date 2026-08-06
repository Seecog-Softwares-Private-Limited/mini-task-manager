import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/workspace_logo.dart';
import '../../data/models/pending_attachment.dart';
import '../../data/models/subtask_completion_record.dart';
import '../../data/models/project_member.dart';
import '../../data/models/task.dart';
import '../../data/models/task_attachment.dart';
import '../../shared/widgets/app_widgets.dart';
import '../../shared/widgets/user_avatar.dart';
import '../auth/session_controller.dart';
import 'attachment_preview.dart';
import 'attachment_picker_section.dart';
import 'kanban_providers.dart';
import 'assignee_picker_sheet.dart';

import 'subtask_completion_utils.dart';
import 'require_location_toggle.dart';
import '../recurring/subtask_note_sheet.dart';

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
    this.onDelete,
    this.onMove,
    this.onNoteChanged,
    this.fallbackReporterId,
    this.fallbackCreatedAt,
    this.canEditRequireLocation = false,
    /// Planner-template editing: no completion/attachments/status; due time only.
    this.templateMode = false,
    /// Daily recurring run: completion ritual only — setup lives on the series.
    this.dailyRunMode = false,
  });

  final TaskSubtask subtask;
  final List<ProjectMember> members;
  final String taskId;
  final String organizationId;
  final String? fallbackReporterId;
  final String? fallbackCreatedAt;
  final bool saving;
  final bool canComplete;
  final bool canEditRequireLocation;
  final bool templateMode;
  final bool dailyRunMode;
  final SubtaskCompletionRequest onRequestCompletion;
  final VoidCallback onCancel;
  final ValueChanged<TaskSubtask> onSave;
  final VoidCallback? onDelete;
  /// Move this checklist item under another task in the same project.
  final VoidCallback? onMove;
  /// Latest comment preview after the comments sheet closes.
  final ValueChanged<String?>? onNoteChanged;

  @override
  ConsumerState<SubtaskDetailPanel> createState() => _SubtaskDetailPanelState();
}

class _SubtaskDetailPanelState extends ConsumerState<SubtaskDetailPanel> {
  late TextEditingController _titleController;
  late TextEditingController _descriptionController;
  late String _status;
  late String _priority;
  String? _dueDate;
  String? _dueTime;
  int? _notifyMinutesBefore;
  late List<String> _assigneeIds;
  List<TaskAttachment> _attachments = const [];
  bool _loadingAttachments = true;
  bool _uploadingAttachment = false;
  String? _attachmentError;
  SubtaskCompletionRecord? _completionRecord;
  late bool _requireLocation;
  String? _notePreview;
  /// Daily-run: expand Camera/Gallery/File/Voice only after "Attach proof".
  bool _proofPickerOpen = false;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.subtask.title);
    _descriptionController =
        TextEditingController(text: widget.subtask.description ?? '');
    _status = _resolveSubtaskStatus(widget.subtask);
    _priority = (widget.subtask.priority ?? 'MEDIUM').toUpperCase();
    _dueDate = widget.subtask.dueDate;
    _dueTime = widget.subtask.dueTime;
    _notifyMinutesBefore = widget.subtask.notifyMinutesBefore;
    _assigneeIds = _storedAssigneeIds(widget.subtask);
    _requireLocation = widget.subtask.requireLocation;
    _completionRecord = widget.subtask.completionRecord;
    _notePreview = widget.subtask.note;
    if (!widget.templateMode) {
      _loadAttachments();
    } else {
      _loadingAttachments = false;
    }
  }

  bool get _isDailyRun => widget.dailyRunMode && !widget.templateMode;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant SubtaskDetailPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.subtask.id != widget.subtask.id) {
      _completionRecord = widget.subtask.completionRecord;
      _notePreview = widget.subtask.note;
      _proofPickerOpen = false;
      if (!widget.templateMode) {
        _loadAttachments();
      } else {
        _attachments = const [];
        _attachmentError = null;
        _loadingAttachments = false;
      }
      return;
    }
    if (oldWidget.subtask.note != widget.subtask.note) {
      _notePreview = widget.subtask.note;
    }
    final wasDone = isSubtaskDone(oldWidget.subtask);
    final isDone = isSubtaskDone(widget.subtask);
    if (!wasDone && isDone) {
      _completionRecord = widget.subtask.completionRecord;
      _status = 'DONE';
      if (!widget.templateMode) {
        _loadAttachments();
      }
    } else if (oldWidget.subtask.completionRecord != widget.subtask.completionRecord) {
      _completionRecord = widget.subtask.completionRecord;
    }
  }

  Future<void> _loadAttachments() async {
    if (widget.templateMode) {
      if (!mounted) return;
      setState(() {
        _attachments = const [];
        _attachmentError = null;
        _loadingAttachments = false;
      });
      return;
    }
    final subtaskId = widget.subtask.id.trim();
    final taskId = widget.taskId.trim();
    if (subtaskId.isEmpty ||
        taskId.isEmpty ||
        taskId == 'template-draft') {
      if (!mounted) return;
      setState(() {
        _attachments = const [];
        _attachmentError = null;
        _loadingAttachments = false;
      });
      return;
    }
    setState(() {
      _loadingAttachments = true;
      _attachmentError = null;
    });
    try {
      final items = await ref.read(attachmentsRepositoryProvider).fetchEntityAttachments(
            entityType: 'SUBTASK',
            entityId: subtaskId,
            organizationId: widget.organizationId,
            taskId: taskId,
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
        if (_isDailyRun && _attachments.isEmpty) {
          _proofPickerOpen = false;
        }
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

  Future<void> _pickDueTime() async {
    // Planner daily items only need a wall-clock time; the occurrence date
    // supplies "which day". Do not require a per-item due date.
    final parts = (_dueTime ?? '09:00').split(':');
    final initial = TimeOfDay(
      hour: int.tryParse(parts[0]) ?? 9,
      minute: parts.length > 1 ? (int.tryParse(parts[1]) ?? 0) : 0,
    );
    final picked = await showTimePicker(
      context: context,
      initialTime: initial,
    );
    if (picked == null) return;
    setState(() {
      _dueTime =
          '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
    });
  }

  void _clearDueDate() => setState(() {
        _dueDate = null;
      });

  void _clearDueTime() => setState(() {
        _dueTime = null;
        _notifyMinutesBefore = null;
      });

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
        (_dueTime ?? '') != (widget.subtask.dueTime ?? '') ||
        _notifyMinutesBefore != widget.subtask.notifyMinutesBefore ||
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

  void _handleReset() {
    if (widget.saving) return;
    setState(() {
      _titleController.text = widget.subtask.title;
      _descriptionController.text = widget.subtask.description ?? '';
      _status = _resolveSubtaskStatus(widget.subtask);
      _priority = (widget.subtask.priority ?? 'MEDIUM').toUpperCase();
      _dueDate = widget.subtask.dueDate;
      _dueTime = widget.subtask.dueTime;
      _notifyMinutesBefore = widget.subtask.notifyMinutesBefore;
      _assigneeIds = _storedAssigneeIds(widget.subtask);
      _requireLocation = widget.subtask.requireLocation;
      _completionRecord = widget.subtask.completionRecord;
      _attachmentError = null;
    });
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
      FocusManager.instance.primaryFocus?.unfocus();
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
          dueTime: _dueTime,
          notifyMinutesBefore: _notifyMinutesBefore,
          clearDueDate: _dueDate == null,
          clearDueTime: _dueTime == null,
          clearNotifyMinutesBefore: _dueTime == null || _notifyMinutesBefore == null,
          assigneeIds: _assigneeIds,
          assigneeId: _assigneeIds.isNotEmpty ? _assigneeIds.first : null,
          completionRecord: record,
          completedAt: record.completedAt,
          requireLocation: _requireLocation,
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

    final completed = widget.templateMode ? false : _status == 'DONE';
    widget.onSave(
      widget.subtask.copyWith(
        title: title,
        description: _descriptionController.text.trim().isEmpty
            ? null
            : _descriptionController.text,
        status: widget.templateMode ? 'TODO' : _status,
        completed: completed,
        priority: _priority,
        dueDate: widget.templateMode ? null : _dueDate,
        dueTime: _dueTime,
        notifyMinutesBefore: _notifyMinutesBefore,
        clearDueDate: widget.templateMode || _dueDate == null,
        clearDueTime: _dueTime == null,
        clearNotifyMinutesBefore: _dueTime == null || _notifyMinutesBefore == null,
        assigneeIds: _assigneeIds,
        assigneeId: _assigneeIds.isNotEmpty ? _assigneeIds.first : null,
        completionRecord: completed ? record : null,
        clearCompletionRecord: !completed,
        completedAt: completed ? record?.completedAt : null,
        clearCompletedAt: !completed,
        requireLocation: widget.templateMode ? false : _requireLocation,
      ),
    );
  }

  Future<void> _openComments() async {
    if (widget.templateMode || widget.saving) return;
    final id = widget.subtask.id.trim();
    if (id.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Save this checklist item before adding comments.'),
        ),
      );
      return;
    }
    FocusManager.instance.primaryFocus?.unfocus();
    final live = widget.subtask.copyWith(
      title: _titleController.text.trim().isEmpty
          ? widget.subtask.title
          : _titleController.text.trim(),
      note: _notePreview,
    );
    final result = await showSubtaskNoteSheet(
      context: context,
      subtask: live,
      taskId: widget.taskId,
      organizationId: widget.organizationId,
      title: _isDailyRun ? 'Note' : 'Comments',
    );
    if (!mounted || result == null) return;
    final preview = result.latestNotePreview?.trim();
    final next = result.hasNotes
        ? (preview != null && preview.isNotEmpty ? preview : 'Comments')
        : null;
    setState(() => _notePreview = next);
    widget.onNoteChanged?.call(next);
  }

  String _dailyDueSummary() {
    final due = _parseDueDate(_dueDate);
    if (due == null) {
      return _dueTime == null
          ? 'No due date'
          : 'Due ${_formatDueTimeLabel(_dueTime!)}';
    }
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final day = DateTime(due.year, due.month, due.day);
    final timePart =
        _dueTime == null ? '' : ' · ${_formatDueTimeLabel(_dueTime!)}';
    if (day == today) return 'Due today$timePart';
    if (day == today.add(const Duration(days: 1))) {
      return 'Due tomorrow$timePart';
    }
    return 'Due ${DateFormat('MMM d').format(day)}$timePart';
  }

  String _dailyAssigneeSummary() {
    if (_assigneeIds.isEmpty) return 'Unassigned';

    String nameFor(String userId) {
      final normalized = _normalizeUserId(userId);
      for (final member in widget.members) {
        if (_normalizeUserId(member.userId) != normalized) continue;
        final user = member.user;
        if (user == null) break;
        return user.fullName.trim().isNotEmpty ? user.fullName : user.email;
      }
      final current = ref.read(sessionControllerProvider).user;
      if (current != null &&
          _normalizeUserId(current.id) == normalized) {
        return current.fullName.trim().isNotEmpty
            ? current.fullName
            : current.email;
      }
      return 'Assigned';
    }

    final primary = nameFor(_assigneeIds.first);
    if (_assigneeIds.length == 1) return primary;
    return '$primary +${_assigneeIds.length - 1}';
  }

  Widget _panelShell({required List<Widget> children}) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.9)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }

  Widget _buildDailyNoteTile(BuildContext context) {
    final hasNote =
        _notePreview != null && _notePreview!.trim().isNotEmpty;
    return Material(
      color: AppColors.primary.withValues(alpha: 0.05),
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: widget.saving ? null : _openComments,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.sm + 2),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  hasNote ? Icons.notes_rounded : Icons.note_add_outlined,
                  color: AppColors.primary,
                  size: 22,
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  hasNote ? _notePreview! : 'Add a note',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: hasNote
                            ? AppColors.textPrimary
                            : AppColors.textMuted,
                      ),
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: AppColors.textMuted.withValues(alpha: 0.8),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDailyProofSection(BuildContext context) {
    final showPicker = _proofPickerOpen || _attachments.isNotEmpty;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_loadingAttachments)
          const Padding(
            padding: EdgeInsets.only(top: AppSpacing.xs),
            child: LinearProgressIndicator(minHeight: 2),
          )
        else if (!showPicker)
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: widget.saving || _uploadingAttachment
                  ? null
                  : () => setState(() => _proofPickerOpen = true),
              icon: const Icon(Icons.add_a_photo_outlined, size: 18),
              label: const Text('Attach proof'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          )
        else ...[
          AttachmentUploadActions(
            disabled: widget.saving,
            uploading: _uploadingAttachment,
            onPickAndUpload: (pick) async {
              await _pickAndUpload(pick);
              if (mounted && _attachments.isNotEmpty) {
                setState(() => _proofPickerOpen = true);
              }
            },
          ),
          if (_attachments.isNotEmpty)
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
        ],
        if (_attachmentError != null) ...[
          const SizedBox(height: AppSpacing.xs),
          Text(
            _attachmentError!,
            style: const TextStyle(color: AppColors.danger),
          ),
        ],
      ],
    );
  }

  Widget _buildDailyRunPanel(BuildContext context) {
    final isDone = _status == 'DONE';
    final summary =
        '${_labelForSubtaskStatus(_status)} · ${_dailyDueSummary()} · ${_dailyAssigneeSummary()}';

    return _panelShell(
      children: [
        _PanelSection(
          title: 'Status & schedule',
          child: Text(
            summary,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  height: 1.35,
                ),
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        _PanelSection(
          title: 'Note',
          child: _buildDailyNoteTile(context),
        ),
        const SizedBox(height: AppSpacing.md),
        _PanelSection(
          title: 'Proof',
          child: _buildDailyProofSection(context),
        ),
        if (_completionRecord != null) ...[
          const SizedBox(height: AppSpacing.md),
          _CompletionRecordCard(record: _completionRecord!),
        ],
        if (!widget.canComplete && !isDone) ...[
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Only assigned members can mark this as Done.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppColors.warning,
                ),
          ),
        ],
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            TextButton(
              onPressed: widget.saving ? null : _handleCancel,
              child: const Text('Close'),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: PrimaryButton(
                label: widget.saving
                    ? 'Saving...'
                    : (isDone ? 'Done' : 'Mark done'),
                expand: true,
                loading: widget.saving,
                onPressed: widget.saving || isDone || !widget.canComplete
                    ? null
                    : () => _handleStatusChange('DONE'),
              ),
            ),
          ],
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isDailyRun) {
      return _buildDailyRunPanel(context);
    }

    final dueDate = _parseDueDate(_dueDate);
    final priority = _findPriority(_priority);
    final assigneeCount = _assigneeIds.length;
    final hasCommentPreview =
        _notePreview != null && _notePreview!.trim().isNotEmpty;

    return _panelShell(
      children: [
          _PanelSection(
            title: 'Details',
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
                            color: _titleController.text.length >=
                                    subtaskTitleMaxLength
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
                  scrollPadding: EdgeInsets.zero,
                  decoration: InputDecoration(
                    hintText: 'Subtask title',
                    counterText: '',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: AppSpacing.sm),
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
                  minLines: 2,
                  maxLines: 5,
                  scrollPadding: EdgeInsets.zero,
                  decoration: InputDecoration(
                    hintText: 'Optional details (not the comment thread)',
                    alignLabelWithHint: true,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (!widget.templateMode) ...[
            const SizedBox(height: AppSpacing.md),
            _PanelSection(
              title: 'Comments',
              child: Material(
                color: AppColors.primary.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(12),
                child: InkWell(
                  onTap: widget.saving ? null : _openComments,
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.sm + 2),
                    child: Row(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(
                            Icons.forum_outlined,
                            color: AppColors.primary,
                            size: 22,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                hasCommentPreview
                                    ? 'Open comments'
                                    : 'Add comments',
                                style: Theme.of(context)
                                    .textTheme
                                    .titleSmall
                                    ?.copyWith(fontWeight: FontWeight.w700),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                hasCommentPreview
                                    ? _notePreview!
                                    : 'Threaded replies · files · camera · voice · paste',
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(color: AppColors.textMuted),
                              ),
                            ],
                          ),
                        ),
                        Icon(
                          Icons.chevron_right_rounded,
                          color: AppColors.textMuted.withValues(alpha: 0.8),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            _PanelSection(
              title: 'Files',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
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
                        'No files on this subtask yet',
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
                    Text(
                      _attachmentError!,
                      style: const TextStyle(color: AppColors.danger),
                    ),
                  ],
                ],
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          _PanelSection(
            title: 'Status & schedule',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    if (!widget.templateMode) ...[
                      Expanded(
                        child: _SubtaskDropdown<String>(
                          label: 'Status',
                          value: _status,
                          enabled: !widget.saving &&
                              (widget.canComplete || _status == 'DONE'),
                          items: _subtaskStatuses
                              .map(
                                (status) => DropdownMenuItem(
                                  value: status,
                                  enabled:
                                      widget.canComplete || status != 'DONE',
                                  child: Text(
                                    _labelForSubtaskStatus(status),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              )
                              .toList(),
                          selectedChild: Text(
                            _labelForSubtaskStatus(_status),
                            overflow: TextOverflow.ellipsis,
                          ),
                          onChanged: _handleStatusChange,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                    ],
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
                                    Flexible(child: Text(item.$2)),
                                  ],
                                ),
                              ),
                            )
                            .toList(),
                        selectedChild: Row(
                          children: [
                            _StatusDot(color: _priorityColor(priority.$1)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                priority.$2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
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
                    if (widget.templateMode) ...[
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: widget.saving ? null : _pickDueTime,
                          icon: const Icon(Icons.schedule_rounded, size: 18),
                          label: Text(
                            _dueTime == null
                                ? 'Due time'
                                : _formatDueTimeLabel(_dueTime!),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ),
                      if (_dueTime != null) ...[
                        const SizedBox(width: AppSpacing.xs),
                        IconButton(
                          tooltip: 'Clear time',
                          onPressed: widget.saving ? null : _clearDueTime,
                          icon: const Icon(Icons.clear_rounded),
                        ),
                      ],
                    ] else ...[
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: widget.saving ? null : _pickDueDate,
                          icon:
                              const Icon(Icons.calendar_today_rounded, size: 18),
                          label: Text(
                            dueDate == null
                                ? 'Due date'
                                : DateFormat('MMM d, yyyy').format(dueDate),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.xs),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: widget.saving ? null : _pickDueTime,
                          icon: const Icon(Icons.schedule_rounded, size: 18),
                          label: Text(
                            _dueTime == null
                                ? 'Time'
                                : _formatDueTimeLabel(_dueTime!),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ),
                      if (_dueDate != null || _dueTime != null) ...[
                        const SizedBox(width: AppSpacing.xs),
                        IconButton(
                          tooltip: _dueTime != null ? 'Clear time' : 'Clear date',
                          onPressed: widget.saving
                              ? null
                              : () {
                                  if (_dueTime != null) {
                                    _clearDueTime();
                                  } else {
                                    _clearDueDate();
                                  }
                                },
                          icon: const Icon(Icons.clear_rounded),
                        ),
                      ],
                    ],
                    const SizedBox(width: AppSpacing.sm),
                    OutlinedButton(
                      onPressed: widget.saving ? null : _openAssigneeSheet,
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        minimumSize: const Size(40, 40),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.person_add_alt_1_rounded, size: 18),
                          if (assigneeCount > 0) ...[
                            const SizedBox(width: 6),
                            Text('$assigneeCount'),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
                if (_dueTime != null) ...[
                  const SizedBox(height: AppSpacing.sm),
                  DropdownButtonFormField<int?>(
                    value: _notifyMinutesBefore,
                    decoration: const InputDecoration(
                      labelText: 'Notify checklist members',
                      isDense: true,
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                    ),
                    items: const [
                      DropdownMenuItem<int?>(
                        value: null,
                        child: Text('Off'),
                      ),
                      DropdownMenuItem<int?>(
                        value: 0,
                        child: Text('At due time'),
                      ),
                      DropdownMenuItem<int?>(
                        value: 5,
                        child: Text('5 minutes before'),
                      ),
                      DropdownMenuItem<int?>(
                        value: 15,
                        child: Text('15 minutes before'),
                      ),
                      DropdownMenuItem<int?>(
                        value: 30,
                        child: Text('30 minutes before'),
                      ),
                      DropdownMenuItem<int?>(
                        value: 60,
                        child: Text('1 hour before'),
                      ),
                      DropdownMenuItem<int?>(
                        value: 120,
                        child: Text('2 hours before'),
                      ),
                    ],
                    onChanged: widget.saving
                        ? null
                        : (value) =>
                            setState(() => _notifyMinutesBefore = value),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Notifies this item’s assignees with the item title at the selected time.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.textMuted,
                        ),
                  ),
                ],
                if (!widget.templateMode && _dueDate != null)
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton(
                      onPressed: widget.saving
                          ? null
                          : (_dueTime != null ? _clearDueTime : _clearDueDate),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        visualDensity: VisualDensity.compact,
                      ),
                      child:
                          Text(_dueTime != null ? 'Clear time' : 'Clear date'),
                    ),
                  ),
                if (!widget.templateMode && !widget.canComplete) ...[
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    'Only assigned members can mark this as Done.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.warning,
                        ),
                  ),
                ],
              ],
            ),
          ),
          if (!widget.templateMode) ...[
            const SizedBox(height: AppSpacing.md),
            RequireLocationToggle(
              value: _requireLocation,
              enabled: !widget.saving && widget.canEditRequireLocation,
              title: 'Require location',
              subtitle: widget.canEditRequireLocation
                  ? 'Ask for GPS when this subtask is completed'
                  : 'Only the owner or creator can change this',
              onChanged: widget.canEditRequireLocation
                  ? (value) {
                      FocusManager.instance.primaryFocus?.unfocus();
                      setState(() => _requireLocation = value);
                    }
                  : null,
            ),
          ],
          if (!widget.templateMode && _completionRecord != null) ...[
            const SizedBox(height: AppSpacing.md),
            _CompletionRecordCard(record: _completionRecord!),
          ],
          if (!widget.templateMode) ...[
            const SizedBox(height: AppSpacing.md),
            _buildReporterBadge(context),
          ],
          if (widget.onMove != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: widget.saving ? null : widget.onMove,
                icon: const Icon(Icons.drive_file_move_outlined, size: 18),
                label: const Text('Move to another task'),
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              if (widget.onDelete != null)
                OutlinedButton.icon(
                  onPressed: widget.saving ? null : widget.onDelete,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.danger,
                    side: BorderSide(
                      color: AppColors.danger.withValues(alpha: 0.45),
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 12,
                    ),
                  ),
                  icon: const Icon(Icons.delete_outline_rounded, size: 18),
                  label: const Text('Delete'),
                )
              else
                TextButton(
                  onPressed: widget.saving ? null : _handleCancel,
                  child: const Text('Cancel'),
                ),
              const SizedBox(width: AppSpacing.sm),
              OutlinedButton(
                onPressed: widget.saving || !_isDirty ? null : _handleReset,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 12,
                  ),
                ),
                child: const Text('Reset'),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: PrimaryButton(
                  label: widget.saving ? 'Saving...' : 'Save',
                  expand: true,
                  loading: widget.saving,
                  onPressed: widget.saving ||
                          _titleController.text.trim().isEmpty ||
                          _titleController.text.length > subtaskTitleMaxLength
                      ? null
                      : _handleSave,
                ),
              ),
            ],
          ),
      ],
    );
  }

  Widget _buildReporterBadge(BuildContext context) {
    final reporterId =
        (widget.subtask.reporterId != null &&
                widget.subtask.reporterId!.trim().isNotEmpty)
            ? widget.subtask.reporterId
            : widget.fallbackReporterId;
    final createdAtRaw =
        (widget.subtask.createdAt != null &&
                widget.subtask.createdAt!.trim().isNotEmpty)
            ? widget.subtask.createdAt
            : widget.fallbackCreatedAt;
    final hasDate = createdAtRaw != null && createdAtRaw.trim().isNotEmpty;

    ProjectMember? memberFor(String? userId) {
      if (userId == null || userId.trim().isEmpty) return null;
      final normalized = _normalizeUserId(userId);
      for (final member in widget.members) {
        if (_normalizeUserId(member.userId) == normalized) return member;
      }
      return null;
    }

    String displayNameFor(String? userId) {
      final match = memberFor(userId);
      final memberUser = match?.user;
      if (memberUser != null) {
        return memberUser.fullName.trim().isNotEmpty
            ? memberUser.fullName
            : memberUser.email;
      }
      final currentUser = ref.read(sessionControllerProvider).user;
      if (currentUser != null &&
          userId != null &&
          _normalizeUserId(currentUser.id) == _normalizeUserId(userId)) {
        return currentUser.fullName.trim().isNotEmpty
            ? currentUser.fullName
            : currentUser.email;
      }
      return 'Unknown';
    }

    String? avatarFor(String? userId) {
      final match = memberFor(userId);
      if (match?.user?.avatarUrl != null) return match!.user!.avatarUrl;
      final currentUser = ref.read(sessionControllerProvider).user;
      if (currentUser != null &&
          userId != null &&
          _normalizeUserId(currentUser.id) == _normalizeUserId(userId)) {
        return currentUser.avatarUrl;
      }
      return null;
    }

    final assigneeIds = _assigneeIds;
    final hasAssignees = assigneeIds.isNotEmpty;
    final primaryUserId = hasAssignees ? assigneeIds.first : reporterId;
    final hasPerson =
        primaryUserId != null && primaryUserId.trim().isNotEmpty;
    if (!hasPerson && !hasDate) return const SizedBox.shrink();

    final name = hasPerson ? displayNameFor(primaryUserId) : 'Unassigned';
    final avatarUrl = hasPerson ? avatarFor(primaryUserId) : null;
    final extraAssignees = hasAssignees && assigneeIds.length > 1
        ? ' +${assigneeIds.length - 1}'
        : '';

    String? dateLabel;
    if (hasDate) {
      final parsed = DateTime.tryParse(createdAtRaw);
      dateLabel = parsed == null
          ? createdAtRaw
          : DateFormat('MMM d, yyyy · h:mm a').format(parsed.toLocal());
    }

    final apiBaseUrl = ref.watch(appConfigProvider).apiBaseUrl;
    final imageUrl = resolveUserAvatarUrl(apiBaseUrl, avatarUrl);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary.withValues(alpha: 0.10),
            AppColors.violet.withValues(alpha: 0.08),
          ],
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.18)),
      ),
      child: Row(
        children: [
          _ReporterAvatar(
            name: name,
            imageUrl: imageUrl,
            size: 40,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  hasAssignees ? 'Assignee' : 'Raised by',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: AppColors.textMuted,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.2,
                      ),
                ),
                const SizedBox(height: 2),
                Text(
                  '$name$extraAssignees',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        height: 1.2,
                      ),
                ),
                const SizedBox(height: 4),
                if (dateLabel != null)
                  Row(
                    children: [
                      Icon(
                        Icons.schedule_rounded,
                        size: 14,
                        color: AppColors.textMuted.withValues(alpha: 0.95),
                      ),
                      const SizedBox(width: 5),
                      Expanded(
                        child: Text(
                          dateLabel,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: AppColors.textMuted,
                                    fontWeight: FontWeight.w600,
                                    height: 1.2,
                                  ),
                        ),
                      ),
                    ],
                  )
                else
                  Text(
                    'Created date unavailable',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.textMuted,
                        ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ReporterAvatar extends StatelessWidget {
  const _ReporterAvatar({
    required this.name,
    required this.imageUrl,
    required this.size,
  });

  final String name;
  final String imageUrl;
  final double size;

  @override
  Widget build(BuildContext context) {
    if (imageUrl.isNotEmpty) {
      return ClipOval(
        child: Image.network(
          imageUrl,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _initials(),
        ),
      );
    }
    return _initials();
  }

  Widget _initials() {
    return Container(
      width: size,
      height: size,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          colors: [AppColors.primary, AppColors.violet],
        ),
      ),
      alignment: Alignment.center,
      child: Text(
        workspaceInitials(name),
        style: TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w700,
          fontSize: size * 0.36,
        ),
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

String _formatDueTimeLabel(String raw) {
  final match = RegExp(r'^([01]\d|2[0-3]):([0-5]\d)').firstMatch(raw.trim());
  if (match == null) return raw;
  final hour = int.parse(match.group(1)!);
  final minute = int.parse(match.group(2)!);
  final period = hour >= 12 ? 'PM' : 'AM';
  final hour12 = hour % 12 == 0 ? 12 : hour % 12;
  return '$hour12:${minute.toString().padLeft(2, '0')} $period';
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

class _PanelSection extends StatelessWidget {
  const _PanelSection({
    required this.title,
    required this.child,
  });

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title.toUpperCase(),
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                letterSpacing: 1.1,
                fontWeight: FontWeight.w700,
                color: AppColors.textMuted,
              ),
        ),
        const SizedBox(height: AppSpacing.sm),
        child,
      ],
    );
  }
}

String _normalizeUserId(String id) =>
    id.trim().toLowerCase().replaceAll('-', '');
