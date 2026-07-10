import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/client_id.dart';
import '../../core/utils/html_plain_text.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/pending_attachment.dart';
import '../../data/models/subtask_completion_record.dart';
import '../../data/models/project_member.dart';
import '../../data/models/task.dart';
import '../../data/models/task_attachment.dart';
import '../../data/models/task_comment.dart';
import '../../data/repositories/attachments_repository.dart';
import '../../data/models/workflow.dart';
import '../../shared/widgets/app_widgets.dart';
import '../../shared/widgets/user_avatar.dart';
import '../auth/session_controller.dart';
import '../kanban/kanban_providers.dart';
import '../projects/projects_providers.dart';
import 'subtask_completion_sheet.dart';
import 'subtask_completion_utils.dart';
import 'subtask_detail_panel.dart';
import 'attachment_picker_section.dart';
import 'attachment_preview.dart';
import 'assignee_picker_sheet.dart';

class _TaskAttachmentItem {
  const _TaskAttachmentItem({
    required this.attachment,
    required this.source,
  });

  final TaskAttachment attachment;
  final AttachmentSource source;
}

class TaskDetailSheet extends ConsumerStatefulWidget {
  const TaskDetailSheet({
    super.key,
    required this.task,
    required this.statuses,
    required this.projectId,
    required this.onUpdated,
    this.onDeleted,
  });

  final Task task;
  final List<WorkflowStatus> statuses;
  final String projectId;
  final VoidCallback onUpdated;
  final VoidCallback? onDeleted;

  @override
  ConsumerState<TaskDetailSheet> createState() => _TaskDetailSheetState();
}

class _TaskDetailSheetState extends ConsumerState<TaskDetailSheet> {
  late TextEditingController _titleController;
  late TextEditingController _descriptionController;
  late FocusNode _titleFocusNode;
  late FocusNode _descriptionFocusNode;
  late Task _task;
  final _commentController = TextEditingController();
  late List<TaskSubtask> _subtasks;
  int? _expandedSubtaskIndex;
  bool _isEditingTitle = false;
  bool _isEditingDescription = false;
  bool _saving = false;
  bool _deleting = false;
  bool _loadingMeta = true;
  bool _postingComment = false;
  int? _savingSubtaskIndex;
  String? _error;
  List<ProjectMember> _members = const [];
  List<_TaskAttachmentItem> _attachments = const [];
  List<TaskComment> _comments = const [];

  @override
  void initState() {
    super.initState();
    _task = widget.task;
    _titleController = TextEditingController(text: widget.task.title);
    _descriptionController = TextEditingController(
      text: stripHtmlToPlainText(widget.task.description),
    );
    _titleFocusNode = FocusNode();
    _descriptionFocusNode = FocusNode();
    _titleFocusNode.addListener(_onTitleFocusChange);
    _descriptionFocusNode.addListener(_onDescriptionFocusChange);
    _subtasks = List.of(widget.task.subtasks);
    _loadMeta();
  }

  void _onTitleFocusChange() {
    if (!_titleFocusNode.hasFocus && _isEditingTitle) {
      _commitTitleEdit();
    }
  }

  void _onDescriptionFocusChange() {
    if (!_descriptionFocusNode.hasFocus && _isEditingDescription) {
      _commitDescriptionEdit();
    }
  }

  @override
  void dispose() {
    _titleFocusNode
      ..removeListener(_onTitleFocusChange)
      ..dispose();
    _descriptionFocusNode
      ..removeListener(_onDescriptionFocusChange)
      ..dispose();
    _titleController.dispose();
    _descriptionController.dispose();
    _commentController.dispose();
    super.dispose();
  }

  Future<List<_TaskAttachmentItem>> _loadTaskAttachments(
    String orgId,
    String taskId,
  ) async {
    final attachmentsRepo = ref.read(attachmentsRepositoryProvider);
    final tasksRepo = ref.read(tasksRepositoryProvider);
    final results = await Future.wait<List<TaskAttachment>>([
      tasksRepo.fetchAttachments(taskId),
      attachmentsRepo.fetchEntityAttachments(
        entityType: 'TASK',
        entityId: taskId,
        organizationId: orgId,
        taskId: taskId,
      ),
    ]);
    final seen = <String>{};
    final items = <_TaskAttachmentItem>[];
    for (final attachment in results[0]) {
      if (attachment.id.isEmpty || seen.contains(attachment.id)) continue;
      seen.add(attachment.id);
      items.add(
        _TaskAttachmentItem(
          attachment: attachment,
          source: AttachmentSource.task,
        ),
      );
    }
    for (final attachment in results[1]) {
      if (attachment.id.isEmpty || seen.contains(attachment.id)) continue;
      seen.add(attachment.id);
      items.add(
        _TaskAttachmentItem(
          attachment: attachment,
          source: AttachmentSource.entity,
        ),
      );
    }
    return items;
  }

  Future<void> _loadMeta() async {
    final orgId = ref.read(sessionControllerProvider).orgId;
    if (orgId == null || orgId.isEmpty) {
      if (mounted) setState(() => _loadingMeta = false);
      return;
    }
    try {
      final projectsRepo = ref.read(projectsRepositoryProvider);
      final tasksRepo = ref.read(tasksRepositoryProvider);
      final results = await Future.wait<Object>([
        projectsRepo.fetchProjectMembers(
          projectId: widget.projectId,
          organizationId: orgId,
        ),
        tasksRepo.fetchTask(widget.task.id),
        _loadTaskAttachments(orgId, widget.task.id),
        tasksRepo.fetchComments(widget.task.id),
      ]);
      if (!mounted) return;
      final members = results[0] as List<ProjectMember>;
      var task = results[1] as Task;
      final activeAssigneeIds = _activeAssigneeIds(task, members);
      final storedAssigneeIds = _storedAssigneeIds(task);
      if (_assigneeListsDiffer(storedAssigneeIds, activeAssigneeIds)) {
        task = await tasksRepo.updateTask(
          taskId: task.id,
          assigneeIds: activeAssigneeIds,
        );
        widget.onUpdated();
      }
      setState(() {
        _members = members;
        _task = task;
        _subtasks = List.of(task.subtasks);
        _attachments = results[2] as List<_TaskAttachmentItem>;
        _comments = results[3] as List<TaskComment>;
        _loadingMeta = false;
        _syncTextControllersFromTask();
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loadingMeta = false;
      });
    }
  }

  void _syncTextControllersFromTask() {
    _titleController.text = _task.title;
    _descriptionController.text = stripHtmlToPlainText(_task.description);
  }

  Future<void> _saveTitle() async {
    final title = _titleController.text.trim();
    if (title.isEmpty || title == _task.title) return;
    await _patchTask(title: title);
  }

  Future<void> _saveDescription() async {
    final description = _descriptionController.text.trim();
    final current = stripHtmlToPlainText(_task.description);
    if (description == current) return;
    await _patchTask(description: description);
  }

  Future<void> _commitTitleEdit() async {
    if (!_isEditingTitle) return;
    final title = _titleController.text.trim();
    if (title.isEmpty) {
      _titleController.text = _task.title;
    } else if (title != _task.title) {
      await _saveTitle();
    }
    if (mounted) setState(() => _isEditingTitle = false);
  }

  Future<void> _commitDescriptionEdit() async {
    if (!_isEditingDescription) return;
    await _saveDescription();
    if (mounted) setState(() => _isEditingDescription = false);
  }

  void _startEditingTitle() {
    if (_isEditingDescription) {
      _commitDescriptionEdit();
    }
    setState(() => _isEditingTitle = true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _titleFocusNode.requestFocus();
    });
  }

  void _startEditingDescription() {
    if (_isEditingTitle) {
      _commitTitleEdit();
    }
    setState(() => _isEditingDescription = true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _descriptionFocusNode.requestFocus();
    });
  }

  Future<void> _patchTask({
    String? title,
    String? description,
    String? statusId,
    String? priority,
    String? dueDate,
    bool clearDueDate = false,
    List<String>? tags,
    List<String>? assigneeIds,
    List<TaskSubtask>? subtasks,
  }) async {
    await _run(() => ref.read(tasksRepositoryProvider).updateTask(
          taskId: _task.id,
          title: title,
          description: description,
          statusId: statusId,
          priority: priority,
          dueDate: dueDate,
          clearDueDate: clearDueDate,
          tags: tags,
          assigneeIds: assigneeIds,
          subtasks: subtasks,
        ));
  }

  Future<void> _pickDueDate() async {
    final current = _parseDueDate(_task.dueDate);
    final picked = await showDatePicker(
      context: context,
      initialDate: current ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
    );
    if (picked == null) return;
    final formatted = DateFormat('yyyy-MM-dd').format(picked);
    if (formatted == _task.dueDate) return;
    await _patchTask(dueDate: formatted);
  }

  Future<void> _clearDueDate() async {
    if (_task.dueDate == null) return;
    await _patchTask(clearDueDate: true);
  }

  Future<void> _addTag(String rawName) async {
    final name = rawName.trim();
    if (name.isEmpty) return;
    final exists = _task.tags.any((tag) => tag.toLowerCase() == name.toLowerCase());
    if (exists) return;
    await _patchTask(tags: [..._task.tags, name]);
  }

  Future<void> _removeTag(String name) async {
    final next = _task.tags.where((tag) => tag != name).toList();
    if (next.length == _task.tags.length) return;
    await _patchTask(tags: next);
  }

  void _openSubtaskEditor(int index) {
    setState(() => _expandedSubtaskIndex = index);
  }

  void _toggleSubtaskExpanded(int index) {
    setState(() {
      _expandedSubtaskIndex = _expandedSubtaskIndex == index ? null : index;
    });
  }

  bool _canEditSubtasks() {
    final org = ref.read(selectedOrgProvider);
    final userId = ref.read(sessionControllerProvider).user?.id;
    return canEditTaskSubtasks(org: org, userId: userId, task: _task);
  }

  Future<void> _toggleSubtask(int index, bool? value) async {
    if (value == null) return;
    if (!_canEditSubtasks()) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('You do not have permission to update this subtask.'),
        ),
      );
      return;
    }

    if (value) {
      if (isSubtaskDone(_subtasks[index])) return;
      await _completeSubtaskAtIndex(index);
      return;
    }

    final updated = List<TaskSubtask>.from(_subtasks);
    final item = updated[index];
    updated[index] = item.copyWith(
      completed: false,
      status: item.status == 'DONE' ? 'TODO' : item.status,
      clearCompletionRecord: true,
    );
    setState(() => _subtasks = updated);
    await _run(() => ref.read(tasksRepositoryProvider).updateTask(
          taskId: _task.id,
          subtasks: updated,
        ));
  }

  Future<SubtaskCompletionRecord?> _requestSubtaskCompletion({
    required String subtaskId,
    required String subtaskTitle,
    required String? subtaskPriority,
  }) async {
    if (!_canEditSubtasks()) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('You do not have permission to complete this subtask.'),
          ),
        );
      }
      return null;
    }

    final user = ref.read(sessionControllerProvider).user;
    if (user == null) return null;
    final requireVideo =
        isCriticalPriority(subtaskPriority) || isCriticalPriority(_task.priority);
    final result = await showSubtaskCompletionSheet(
      context: context,
      subtaskTitle: subtaskTitle,
      projectId: widget.projectId,
      employee: user,
      requireVideo: requireVideo,
    );
    if (result == null) return null;

    final orgId = ref.read(sessionControllerProvider).orgId ?? '';
    for (final file in result.attachments) {
      await ref.read(attachmentsRepositoryProvider).uploadSubtaskAttachment(
            subtaskId: subtaskId,
            taskId: _task.id,
            organizationId: orgId,
            file: file,
          );
    }
    return result.record;
  }

  Future<void> _completeSubtaskAtIndex(int index) async {
    final item = _subtasks[index];
    final record = await _requestSubtaskCompletion(
      subtaskId: item.id,
      subtaskTitle: item.title,
      subtaskPriority: item.priority,
    );
    if (record == null) return;

    final updated = List<TaskSubtask>.from(_subtasks);
    updated[index] = item.copyWith(
      completed: true,
      status: 'DONE',
      completionRecord: record,
    );
    setState(() => _subtasks = updated);
    await _run(() => ref.read(tasksRepositoryProvider).updateTask(
          taskId: _task.id,
          subtasks: updated,
        ));
  }

  Future<void> _appendSubtask(String rawTitle) async {
    if (_saving || _savingSubtaskIndex != null) return;
    final title = rawTitle.trim();
    if (title.isEmpty || title.length > subtaskTitleMaxLength) return;

    final updated = [
      TaskSubtask(
        id: generateClientId(),
        title: title,
        completed: false,
        status: 'TODO',
        priority: 'MEDIUM',
      ),
      ..._subtasks,
    ];
    setState(() => _subtasks = updated);
    await _run(() => ref.read(tasksRepositoryProvider).updateTask(
          taskId: _task.id,
          subtasks: updated,
        ));
    if (mounted) {
      setState(() => _subtasks = List.of(_task.subtasks));
    }
  }

  void _cancelSubtaskEdit(int index) {
    setState(() {
      if (_subtasks[index].title.trim().isEmpty) {
        _subtasks = List<TaskSubtask>.from(_subtasks)..removeAt(index);
      }
      _expandedSubtaskIndex = null;
    });
  }

  Future<void> _saveSubtask(int index, TaskSubtask draft) async {
    final updated = List<TaskSubtask>.from(_subtasks);
    updated[index] = draft;
    setState(() {
      _subtasks = updated;
      _savingSubtaskIndex = index;
      _error = null;
    });
    try {
      final saved = await ref.read(tasksRepositoryProvider).updateTask(
            taskId: _task.id,
            subtasks: updated,
          );
      if (!mounted) return;
      setState(() {
        _task = saved;
        _subtasks = List.of(saved.subtasks);
        _expandedSubtaskIndex = null;
      });
      widget.onUpdated();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _savingSubtaskIndex = null);
    }
  }

  Future<void> _run(Future<Task> Function() action) async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final updated = await action();
      if (!mounted) return;
      setState(() {
        _task = updated;
        _syncTextControllersFromTask();
      });
      widget.onUpdated();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _addComment() async {
    final body = _commentController.text.trim();
    if (body.isEmpty) return;
    setState(() => _postingComment = true);
    try {
      final comment = await ref.read(tasksRepositoryProvider).addComment(
            taskId: _task.id,
            body: body,
          );
      if (!mounted) return;
      setState(() {
        _comments = [comment, ..._comments];
        _commentController.clear();
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _postingComment = false);
    }
  }

  Future<void> _deleteTask() async {
    if (_deleting || _saving) return;
    setState(() {
      _deleting = true;
      _error = null;
    });
    try {
      await ref.read(tasksRepositoryProvider).deleteTask(_task.id);
      if (!mounted) return;
      widget.onDeleted?.call();
      widget.onUpdated();
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Task deleted')),
      );
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _deleting = false);
    }
  }

  Future<void> _confirmDeleteTask() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Delete task'),
          content: Text(
            'Permanently delete "${_task.title.trim().isEmpty ? 'this task' : _task.title}"? '
            'This cannot be undone.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.danger,
              ),
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: const Text('Delete'),
            ),
          ],
        );
      },
    );
    if (confirmed == true && mounted) {
      await _deleteTask();
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionControllerProvider);
    final currentUserId = session.user?.id;
    final orgId = session.orgId ?? '';
    final org = ref.watch(selectedOrgProvider);
    final canEditTitleAndDescription = canEditTaskTitleAndDescription(
      org: org,
      userId: currentUserId,
      task: _task,
      members: _members,
    );
    final canEditSubtasks = canEditTaskSubtasks(
      org: org,
      userId: currentUserId,
      task: _task,
    );
    final canEditWorkflowFields = canEditTaskWorkflowFields(
      org: org,
      userId: currentUserId,
      task: _task,
      members: _members,
    );
    final canCompleteSubtasks = canEditSubtasks;
    final canDelete = canDeleteTask(
      org: org,
      userId: currentUserId,
      task: _task,
    );
    final checklistDone = _subtasks.where((s) => s.completed).length;
    final checklistTotal = _subtasks.length;
    final checklistPercent =
        checklistTotal == 0 ? 0 : ((checklistDone / checklistTotal) * 100).round();
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
              if (canEditTitleAndDescription && _isEditingTitle)
                TextField(
                  controller: _titleController,
                  focusNode: _titleFocusNode,
                  autofocus: true,
                  style: Theme.of(context).textTheme.headlineSmall,
                  decoration: InputDecoration(
                    hintText: 'Task title',
                    filled: true,
                    fillColor: Theme.of(context)
                        .colorScheme
                        .surfaceContainerHighest
                        .withValues(alpha: 0.35),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: Theme.of(context).dividerColor.withValues(alpha: 0.5),
                      ),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: Theme.of(context).dividerColor.withValues(alpha: 0.5),
                      ),
                    ),
                  ),
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _commitTitleEdit(),
                  onEditingComplete: _commitTitleEdit,
                )
              else if (canEditTitleAndDescription)
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: _startEditingTitle,
                    borderRadius: BorderRadius.circular(12),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.xs,
                        vertical: AppSpacing.xs,
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(
                              _task.title,
                              style: Theme.of(context).textTheme.headlineSmall,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          Icon(
                            Icons.edit_outlined,
                            size: 18,
                            color: AppColors.textMuted.withValues(alpha: 0.7),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
              else
                Text(
                  _task.title,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              if (_saving)
                const Padding(
                  padding: EdgeInsets.only(top: AppSpacing.sm),
                  child: LinearProgressIndicator(),
                ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(top: AppSpacing.sm),
                  child: Text(_error!, style: const TextStyle(color: AppColors.danger)),
                ),
              const SizedBox(height: AppSpacing.lg),
              _TaskMetaSection(
                task: _task,
                statuses: widget.statuses,
                currentUserId: currentUserId,
                members: _members,
                saving: _saving,
                canEditDetails: canEditTitleAndDescription,
                canEditWorkflowFields: canEditWorkflowFields,
                isEditingDescription: _isEditingDescription,
                descriptionController: _descriptionController,
                descriptionFocusNode: _descriptionFocusNode,
                onStartEditingDescription: _startEditingDescription,
                onCommitDescription: _commitDescriptionEdit,
                onStatusChanged: (statusId) => _patchTask(statusId: statusId),
                onPriorityChanged: (priority) => _patchTask(priority: priority),
                onPickDueDate: _pickDueDate,
                onClearDueDate: _clearDueDate,
                onAddTag: _addTag,
                onRemoveTag: _removeTag,
                onAssigneesChanged: (assigneeIds) => _patchTask(assigneeIds: assigneeIds),
                attachments: _AttachmentsSection(
                  loading: _loadingMeta,
                  attachments: _attachments,
                  organizationId: orgId,
                  taskId: _task.id,
                  disabled: _saving,
                  onAttachmentsChanged: (items) => setState(() => _attachments = items),
                ),
              ),
              if (canEditSubtasks || _subtasks.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.lg),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.check_box_outlined,
                        size: 18,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Checklist', style: Theme.of(context).textTheme.titleMedium),
                          Text(
                            'Subtasks, owners, and dates',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: AppColors.textMuted,
                                ),
                          ),
                        ],
                      ),
                    ),
                    if (checklistTotal > 0)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '$checklistDone/$checklistTotal done',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  fontWeight: FontWeight.w600,
                                ),
                          ),
                          Text(
                            '$checklistPercent%',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: AppColors.textMuted,
                                ),
                          ),
                        ],
                      ),
                  ],
                ),
                if (checklistTotal > 0) ...[
                  const SizedBox(height: AppSpacing.sm),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      value: checklistDone / checklistTotal,
                      minHeight: 8,
                      backgroundColor: AppColors.border.withValues(alpha: 0.5),
                      color: AppColors.primary,
                    ),
                  ),
                ],
                const SizedBox(height: AppSpacing.md),
                if (canEditSubtasks) ...[
                  _NewSubtaskComposer(
                    enabled: !_saving && _savingSubtaskIndex == null,
                    loading: _saving,
                    onSubmit: _appendSubtask,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                ],
                if (_subtasks.isEmpty && canEditSubtasks)
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
                  ),
                if (_subtasks.isNotEmpty && !canCompleteSubtasks)
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                    child: Text(
                      'You can view checklist items but cannot edit them.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.warning,
                          ),
                    ),
                  ),
                ...List.generate(_subtasks.length, (index) {
                  final item = _subtasks[index];
                  final expanded = _expandedSubtaskIndex == index;
                  final displayTitle =
                      item.title.trim().isEmpty ? 'New subtask' : item.title;
                  return Container(
                    margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: expanded ? AppColors.primary : AppColors.border,
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      children: [
                        Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              Checkbox(
                                value: item.completed,
                                onChanged: _saving ||
                                        !canCompleteSubtasks ||
                                        item.title.trim().isEmpty
                                    ? null
                                    : (value) => _toggleSubtask(index, value),
                                materialTapTargetSize:
                                    MaterialTapTargetSize.shrinkWrap,
                                visualDensity: VisualDensity.compact,
                              ),
                              Expanded(
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(8),
                                  onTap: () => _openSubtaskEditor(index),
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(
                                      vertical: 12,
                                      horizontal: 4,
                                    ),
                                    child: Text(
                                      displayTitle,
                                      style: TextStyle(
                                        color: item.title.trim().isEmpty
                                            ? AppColors.textMuted
                                            : null,
                                        fontStyle: item.title.trim().isEmpty
                                            ? FontStyle.italic
                                            : null,
                                        decoration: item.completed
                                            ? TextDecoration.lineThrough
                                            : null,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              IconButton(
                                icon: Icon(
                                  expanded
                                      ? Icons.keyboard_arrow_up_rounded
                                      : Icons.keyboard_arrow_down_rounded,
                                ),
                                onPressed: () => _toggleSubtaskExpanded(index),
                              ),
                            ],
                          ),
                        ),
                        if (expanded)
                          Padding(
                            padding: const EdgeInsets.fromLTRB(
                              AppSpacing.sm,
                              0,
                              AppSpacing.sm,
                              AppSpacing.sm,
                            ),
                            child: SubtaskDetailPanel(
                              subtask: item,
                              members: _members,
                              taskId: _task.id,
                              organizationId: orgId,
                              saving: _savingSubtaskIndex == index,
                              canComplete: canCompleteSubtasks,
                              onRequestCompletion: ({
                                required String subtaskId,
                                required String subtaskTitle,
                                required String? subtaskPriority,
                              }) =>
                                  _requestSubtaskCompletion(
                                    subtaskId: subtaskId,
                                    subtaskTitle: subtaskTitle,
                                    subtaskPriority: subtaskPriority,
                                  ),
                              onCancel: () => _cancelSubtaskEdit(index),
                              onSave: (draft) => _saveSubtask(index, draft),
                            ),
                          ),
                      ],
                    ),
                  );
                }),
              ],
              if (canDelete) ...[
                const SizedBox(height: AppSpacing.lg),
                OutlinedButton.icon(
                  onPressed: _saving || _deleting ? null : _confirmDeleteTask,
                  icon: _deleting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.delete_outline_rounded),
                  label: Text(_deleting ? 'Deleting…' : 'Delete task'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.danger,
                    side: BorderSide(color: AppColors.danger.withValues(alpha: 0.45)),
                    minimumSize: const Size.fromHeight(48),
                  ),
                ),
              ],
              const SizedBox(height: AppSpacing.lg),
              _CommentsSection(
                loading: _loadingMeta,
                comments: _comments,
                controller: _commentController,
                posting: _postingComment,
                onPost: _addComment,
              ),
            ],
          ),
        );
      },
    );
  }
}

class _TaskMetaSection extends StatefulWidget {
  const _TaskMetaSection({
    required this.task,
    required this.statuses,
    required this.currentUserId,
    required this.members,
    required this.saving,
    required this.canEditDetails,
    required this.canEditWorkflowFields,
    required this.isEditingDescription,
    required this.descriptionController,
    required this.descriptionFocusNode,
    required this.onStartEditingDescription,
    required this.onCommitDescription,
    required this.onStatusChanged,
    required this.onPriorityChanged,
    required this.onPickDueDate,
    required this.onClearDueDate,
    required this.onAddTag,
    required this.onRemoveTag,
    required this.onAssigneesChanged,
    this.attachments,
  });

  final Task task;
  final List<WorkflowStatus> statuses;
  final String? currentUserId;
  final List<ProjectMember> members;
  final bool saving;
  final bool canEditDetails;
  final bool canEditWorkflowFields;
  final bool isEditingDescription;
  final TextEditingController descriptionController;
  final FocusNode descriptionFocusNode;
  final VoidCallback onStartEditingDescription;
  final Future<void> Function() onCommitDescription;
  final ValueChanged<String> onStatusChanged;
  final ValueChanged<String> onPriorityChanged;
  final VoidCallback onPickDueDate;
  final VoidCallback onClearDueDate;
  final ValueChanged<String> onAddTag;
  final ValueChanged<String> onRemoveTag;
  final ValueChanged<List<String>> onAssigneesChanged;
  final Widget? attachments;

  @override
  State<_TaskMetaSection> createState() => _TaskMetaSectionState();

  static const priorities = [
    ('LOW', 'Low'),
    ('MEDIUM', 'Medium'),
    ('HIGH', 'High'),
    ('CRITICAL', 'Critical'),
  ];

  static WorkflowStatus? findStatus(List<WorkflowStatus> statuses, String? statusId) {
    if (statusId == null) return null;
    for (final status in statuses) {
      if (status.id == statusId) return status;
    }
    return null;
  }

  static (String, String) findPriority(String priorityValue) {
    for (final item in priorities) {
      if (item.$1 == priorityValue) return item;
    }
    return priorities[1];
  }
}

class _TaskMetaSectionState extends State<_TaskMetaSection> {
  final _tagController = TextEditingController();

  @override
  void dispose() {
    _tagController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final assignedBy =
        _resolveMember(widget.task.reporterId, widget.members, widget.currentUserId);
    final assignedTo = _activeAssigneeIds(widget.task, widget.members)
        .map((id) => _resolveMember(id, widget.members, widget.currentUserId))
        .toList();
    final detailsText = _stripHtml(widget.task.description ?? '');
    final selectedStatus = _TaskMetaSection.findStatus(
      widget.statuses,
      widget.task.statusId,
    );
    final priorityValue = widget.task.priority.toUpperCase();
    final selectedPriority = _TaskMetaSection.findPriority(priorityValue);
    final dueDate = _parseDueDate(widget.task.dueDate);
    final isOverdue = dueDate != null && _isDueDateOverdue(dueDate);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Details', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: AppSpacing.sm),
        if (widget.canEditDetails && widget.isEditingDescription)
          TextField(
            controller: widget.descriptionController,
            focusNode: widget.descriptionFocusNode,
            autofocus: true,
            minLines: 4,
            maxLines: 8,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => widget.onCommitDescription(),
            onEditingComplete: () => widget.onCommitDescription(),
            decoration: InputDecoration(
              hintText: 'Add task details…',
              filled: true,
              fillColor: Theme.of(context)
                  .colorScheme
                  .surfaceContainerHighest
                  .withValues(alpha: 0.35),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: Theme.of(context).dividerColor.withValues(alpha: 0.5),
                ),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: Theme.of(context).dividerColor.withValues(alpha: 0.5),
                ),
              ),
            ),
          )
        else if (widget.canEditDetails)
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: widget.onStartEditingDescription,
              borderRadius: BorderRadius.circular(12),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: Theme.of(context).dividerColor.withValues(alpha: 0.45),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (detailsText.isNotEmpty)
                      Text(detailsText)
                    else
                      Text(
                        'No description yet',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AppColors.textMuted,
                              fontStyle: FontStyle.italic,
                            ),
                      ),
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        Icon(
                          Icons.edit_outlined,
                          size: 14,
                          color: AppColors.textMuted.withValues(alpha: 0.75),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Tap to edit',
                          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                color: AppColors.textMuted.withValues(alpha: 0.75),
                              ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          )
        else if (detailsText.isNotEmpty)
          Text(detailsText)
        else
          Text(
            'No description yet',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textMuted),
          ),
        if (widget.attachments != null) ...[
          const SizedBox(height: AppSpacing.lg),
          widget.attachments!,
        ],
        const SizedBox(height: AppSpacing.md),
        _AssignedBySection(member: assignedBy),
        const SizedBox(height: AppSpacing.md),
        _AssignedToSection(
          assignedMembers: assignedTo,
          allMembers: widget.members,
          selectedAssigneeIds: _activeAssigneeIds(widget.task, widget.members),
          currentUserId: widget.currentUserId,
          saving: widget.saving,
          enabled: widget.canEditDetails,
          onAssigneesChanged: widget.onAssigneesChanged,
        ),
        const SizedBox(height: AppSpacing.lg),
        Text(
          'OCCURRENCE',
          style: Theme.of(context).textTheme.labelLarge?.copyWith(
                letterSpacing: 1.6,
                fontWeight: FontWeight.w700,
                color: AppColors.textMuted,
              ),
        ),
        const SizedBox(height: AppSpacing.md),
        _FieldLabel(text: 'Due date'),
        const SizedBox(height: AppSpacing.xs),
        Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: widget.saving || !widget.canEditDetails ? null : widget.onPickDueDate,
            borderRadius: BorderRadius.circular(14),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                border: Border.all(
                  color: isOverdue ? AppColors.danger.withValues(alpha: 0.35) : AppColors.border,
                ),
                borderRadius: BorderRadius.circular(14),
                color: isOverdue ? AppColors.dangerSoft.withValues(alpha: 0.35) : null,
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.calendar_today_rounded,
                    size: 18,
                    color: AppColors.textMuted,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      dueDate == null
                          ? 'No date selected'
                          : DateFormat('MMM d, yyyy').format(dueDate),
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: dueDate == null ? AppColors.textMuted : null,
                          ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        if (dueDate != null) ...[
          const SizedBox(height: AppSpacing.xs),
          Row(
            children: [
              Expanded(
                child: Text(
                  DateFormat('EEE, MMM d, yyyy').format(dueDate),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.textMuted,
                      ),
                ),
              ),
              TextButton(
                onPressed: widget.saving || !widget.canEditDetails ? null : widget.onClearDueDate,
                child: const Text('Clear'),
              ),
            ],
          ),
          if (isOverdue) ...[
            const SizedBox(height: AppSpacing.xs),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.dangerSoft,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                'Overdue',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: AppColors.danger,
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ),
          ],
        ],
        const SizedBox(height: AppSpacing.md),
        _FieldLabel(text: 'Task status'),
        const SizedBox(height: AppSpacing.xs),
        _SidebarDropdown<String>(
          value: selectedStatus?.id,
          enabled: !widget.saving && widget.statuses.isNotEmpty && widget.canEditWorkflowFields,
          hint: 'Select status',
          items: widget.statuses
              .map(
                (status) => DropdownMenuItem(
                  value: status.id,
                  child: Row(
                    children: [
                      _StatusDot(color: _parseStatusColor(status.color)),
                      const SizedBox(width: 10),
                      Expanded(child: Text(status.name)),
                    ],
                  ),
                ),
              )
              .toList(),
          selectedChild: selectedStatus == null
              ? null
              : Row(
                  children: [
                    _StatusDot(color: _parseStatusColor(selectedStatus.color)),
                    const SizedBox(width: 10),
                    Expanded(child: Text(selectedStatus.name)),
                  ],
                ),
          onChanged: widget.onStatusChanged,
        ),
        const SizedBox(height: AppSpacing.md),
        _FieldLabel(text: 'Priority'),
        const SizedBox(height: AppSpacing.xs),
        _SidebarDropdown<String>(
          value: selectedPriority.$1,
          enabled: !widget.saving && widget.canEditWorkflowFields,
          hint: 'Select priority',
          items: _TaskMetaSection.priorities
              .map(
                (item) => DropdownMenuItem(
                  value: item.$1,
                  child: Row(
                    children: [
                      _StatusDot(color: _priorityColor(item.$1)),
                      const SizedBox(width: 10),
                      Expanded(child: Text(item.$2)),
                    ],
                  ),
                ),
              )
              .toList(),
          selectedChild: Row(
            children: [
              _StatusDot(color: _priorityColor(selectedPriority.$1)),
              const SizedBox(width: 10),
              Expanded(child: Text(selectedPriority.$2)),
            ],
          ),
          onChanged: widget.onPriorityChanged,
        ),
        const SizedBox(height: AppSpacing.lg),
        _FieldLabel(text: 'Tags'),
        const SizedBox(height: AppSpacing.xs),
        if (widget.task.tags.isNotEmpty) ...[
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: widget.task.tags
                .map(
                  (tag) => InputChip(
                    label: Text(tag),
                    onDeleted: widget.saving || !widget.canEditDetails
                        ? null
                        : () => widget.onRemoveTag(tag),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: AppSpacing.sm),
        ],
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _tagController,
                enabled: !widget.saving && widget.canEditDetails,
                decoration: InputDecoration(
                  hintText: 'Add a tag',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 12,
                  ),
                ),
                onSubmitted: (value) {
                  widget.onAddTag(value);
                  _tagController.clear();
                },
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            IconButton.filled(
              onPressed: widget.saving || !widget.canEditDetails
                  ? null
                  : () {
                      widget.onAddTag(_tagController.text);
                      _tagController.clear();
                    },
              icon: const Icon(Icons.add_rounded),
            ),
          ],
        ),
      ],
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: AppColors.textMuted,
            fontWeight: FontWeight.w500,
          ),
    );
  }
}

class _SidebarDropdown<T> extends StatelessWidget {
  const _SidebarDropdown({
    required this.value,
    required this.items,
    required this.onChanged,
    required this.enabled,
    this.hint,
    this.selectedChild,
  });

  final T? value;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T> onChanged;
  final bool enabled;
  final String? hint;
  final Widget? selectedChild;

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<T>(
      initialValue: value,
      items: items,
      onChanged: enabled ? (next) { if (next != null) onChanged(next); } : null,
      decoration: InputDecoration(
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.border),
        ),
      ),
      isExpanded: true,
      hint: hint == null ? null : Text(hint!),
      selectedItemBuilder: selectedChild == null
          ? null
          : (context) => List.generate(items.length, (_) => selectedChild!),
      icon: Icon(
        Icons.keyboard_arrow_down_rounded,
        color: AppColors.textMuted.withValues(alpha: 0.8),
      ),
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
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
      ),
    );
  }
}

class _AssignedBySection extends ConsumerWidget {
  const _AssignedBySection({required this.member});

  final _MemberView member;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Assigned by',
          style: Theme.of(context).textTheme.labelLarge?.copyWith(
                letterSpacing: 1.6,
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: AppSpacing.sm),
        _AssignmentSummaryRow(member: member),
      ],
    );
  }
}

class _AssignedToSection extends ConsumerWidget {
  const _AssignedToSection({
    required this.assignedMembers,
    required this.allMembers,
    required this.selectedAssigneeIds,
    required this.currentUserId,
    required this.saving,
    required this.enabled,
    required this.onAssigneesChanged,
  });

  final List<_MemberView> assignedMembers;
  final List<ProjectMember> allMembers;
  final List<String> selectedAssigneeIds;
  final String? currentUserId;
  final bool saving;
  final bool enabled;
  final ValueChanged<List<String>> onAssigneesChanged;

  void _openMembersSheet(BuildContext context, WidgetRef ref) {
    if (allMembers.isEmpty) return;
    showAssigneePickerSheet(
      context: context,
      members: allMembers,
      selectedAssigneeIds: selectedAssigneeIds,
      sessionUser: ref.read(sessionControllerProvider).user,
      enabled: enabled && !saving,
      title: 'Assign members',
      showDoneButton: true,
      onSelectionChanged: onAssigneesChanged,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final members = assignedMembers;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Assigned to',
          style: Theme.of(context).textTheme.labelLarge?.copyWith(
                letterSpacing: 1.6,
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: AppSpacing.sm),
        Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: !enabled || allMembers.isEmpty ? null : () => _openMembersSheet(context, ref),
            borderRadius: BorderRadius.circular(14),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: 12,
              ),
              decoration: BoxDecoration(
                border: Border.all(color: AppColors.border),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                children: [
                  if (members.isEmpty)
                    const _PlaceholderAvatar()
                  else if (members.length == 1)
                    _MemberAvatar(member: members.first, size: 40)
                  else
                    _AvatarStack(members: members.take(3).toList()),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      members.isEmpty
                          ? 'Unassigned'
                          : members.length == 1
                              ? _truncateName(members.first.name, 18)
                              : '${members.length} assigned',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: members.isEmpty ? AppColors.textMuted : null,
                          ),
                    ),
                  ),
                  Icon(
                    Icons.keyboard_arrow_down_rounded,
                    color: AppColors.textMuted.withValues(alpha: 0.8),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _AssignmentSummaryRow extends ConsumerWidget {
  const _AssignmentSummaryRow({required this.member});

  final _MemberView member;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isEmpty = member.name == 'Not set';
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: 12,
      ),
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          if (isEmpty)
            const _PlaceholderAvatar()
          else
            _MemberAvatar(member: member, size: 40),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              isEmpty ? 'Unknown' : _truncateName(member.name, 18),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: isEmpty ? AppColors.textMuted : null,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AvatarStack extends ConsumerWidget {
  const _AvatarStack({required this.members});

  final List<_MemberView> members;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SizedBox(
      width: 28 + (members.length - 1) * 18.0,
      height: 36,
      child: Stack(
        children: [
          for (var i = 0; i < members.length; i++)
            Positioned(
              left: i * 18.0,
              child: _MemberAvatar(member: members[i], size: 36),
            ),
        ],
      ),
    );
  }
}

class _MemberAvatar extends ConsumerWidget {
  const _MemberAvatar({required this.member, required this.size});

  final _MemberView member;
  final double size;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final apiBaseUrl = ref.watch(appConfigProvider).apiBaseUrl;
    final imageUrl = _avatarImageUrl(apiBaseUrl, member);
    return CircleAvatar(
      radius: size / 2,
      backgroundColor: AppColors.primary.withValues(alpha: 0.12),
      backgroundImage: imageUrl.isEmpty ? null : NetworkImage(imageUrl),
      child: imageUrl.isEmpty
          ? Text(
              _initials(member.name),
              style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: size * 0.34,
              ),
            )
          : null,
    );
  }
}

class _PlaceholderAvatar extends StatelessWidget {
  const _PlaceholderAvatar();

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: 20,
      backgroundColor: AppColors.border.withValues(alpha: 0.45),
      child: Icon(Icons.person_outline_rounded, color: AppColors.textMuted, size: 20),
    );
  }
}

class _MemberView {
  const _MemberView({
    required this.name,
    this.userId,
    this.email,
    this.avatarUrl,
  });

  final String name;
  final String? userId;
  final String? email;
  final String? avatarUrl;
}

DateTime? _parseDueDate(String? raw) {
  if (raw == null || raw.isEmpty) return null;
  return DateTime.tryParse(raw);
}

bool _isDueDateOverdue(DateTime dueDate) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final due = DateTime(dueDate.year, dueDate.month, dueDate.day);
  return due.isBefore(today);
}

Color _parseStatusColor(String? raw) {
  if (raw == null || raw.isEmpty) return AppColors.primary;
  var value = raw.replaceAll('#', '');
  if (value.length == 6) value = 'FF$value';
  final parsed = int.tryParse(value, radix: 16);
  if (parsed == null) return AppColors.primary;
  return Color(parsed);
}

Color _priorityColor(String priority) {
  return switch (priority.toUpperCase()) {
    'LOW' => AppColors.textMuted,
    'HIGH' => AppColors.warning,
    'CRITICAL' => AppColors.danger,
    _ => AppColors.sky,
  };
}

String _stripHtml(String value) {
  final withoutTags = value.replaceAll(RegExp(r'<[^>]*>'), ' ');
  return withoutTags.replaceAll(RegExp(r'\s+'), ' ').trim();
}

String _compactId(String value) {
  if (value.length <= 8) return value;
  return '${value.substring(0, 6)}...';
}

String _normalizeUserId(String id) =>
    id.trim().toLowerCase().replaceAll('-', '');

Set<String> _memberIdSet(List<ProjectMember> members) =>
    members.map((member) => _normalizeUserId(member.userId)).toSet();

List<String> _storedAssigneeIds(Task task) {
  if (task.assigneeIds.isNotEmpty) return task.assigneeIds;
  if (task.assigneeId != null && task.assigneeId!.isNotEmpty) {
    return [task.assigneeId!];
  }
  return const [];
}

List<String> _activeAssigneeIds(Task task, List<ProjectMember> members) {
  final memberIds = _memberIdSet(members);
  final seen = <String>{};
  final active = <String>[];
  for (final id in _storedAssigneeIds(task)) {
    final key = _normalizeUserId(id);
    if (memberIds.contains(key) && seen.add(key)) {
      active.add(id);
    }
  }
  return active;
}

bool _assigneeListsDiffer(List<String> stored, List<String> active) {
  if (stored.length != active.length) return true;
  final activeNorm = active.map(_normalizeUserId).toSet();
  return stored.any((id) => !activeNorm.contains(_normalizeUserId(id)));
}

_MemberView _resolveMember(String? userId, List<ProjectMember> members, String? currentUserId) {
  if (userId == null || userId.isEmpty) return const _MemberView(name: 'Not set');
  final normalizedUserId = _normalizeUserId(userId);
  for (final member in members) {
    if (_normalizeUserId(member.userId) == normalizedUserId) {
      final name = member.user?.fullName.trim() ?? '';
      if (name.isNotEmpty) {
        return _MemberView(
          userId: userId,
          name: name,
          email: member.user?.email,
          avatarUrl: member.user?.avatarUrl,
        );
      }
      final email = member.user?.email.trim() ?? '';
      if (email.isNotEmpty) {
        return _MemberView(userId: userId, name: email, email: email);
      }
      break;
    }
  }
  return _MemberView(userId: userId, name: _compactId(userId));
}

String _avatarImageUrl(String apiBaseUrl, _MemberView member) {
  final resolved = resolveUserAvatarUrl(apiBaseUrl, member.avatarUrl);
  if (resolved.isNotEmpty) return resolved;
  final userId = member.userId;
  if (userId == null || userId.isEmpty) return '';
  final origin = apiBaseUrl.replaceAll(RegExp(r'/api/v1$'), '');
  return '$origin/api/v1/users/avatar/$userId';
}

String _truncateName(String value, int maxChars) {
  final trimmed = value.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return '${trimmed.substring(0, maxChars)}...';
}

String _initials(String name) {
  final parts = name.trim().split(RegExp(r'\s+')).where((e) => e.isNotEmpty).toList();
  if (parts.isEmpty) return '?';
  if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
  return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
}

class _AttachmentsSection extends ConsumerStatefulWidget {
  const _AttachmentsSection({
    required this.loading,
    required this.attachments,
    required this.organizationId,
    required this.taskId,
    required this.disabled,
    required this.onAttachmentsChanged,
  });

  final bool loading;
  final List<_TaskAttachmentItem> attachments;
  final String organizationId;
  final String taskId;
  final bool disabled;
  final ValueChanged<List<_TaskAttachmentItem>> onAttachmentsChanged;

  @override
  ConsumerState<_AttachmentsSection> createState() => _AttachmentsSectionState();
}

class _AttachmentsSectionState extends ConsumerState<_AttachmentsSection> {
  bool _uploading = false;
  String? _uploadError;

  Future<void> _pickAndUpload(Future<PendingAttachment?> Function() pick) async {
    final picked = await pick();
    if (picked == null) return;

    setState(() {
      _uploading = true;
      _uploadError = null;
    });

    try {
      await ref.read(attachmentsRepositoryProvider).uploadTaskAttachment(
            taskId: widget.taskId,
            organizationId: widget.organizationId,
            file: picked,
          );
      final items = await ref.read(tasksRepositoryProvider).fetchAttachments(widget.taskId);
      final entityItems = await ref.read(attachmentsRepositoryProvider).fetchEntityAttachments(
            entityType: 'TASK',
            entityId: widget.taskId,
            organizationId: widget.organizationId,
            taskId: widget.taskId,
          );
      final seen = items.map((e) => e.id).toSet();
      final merged = <_TaskAttachmentItem>[
        ...items.map(
          (attachment) => _TaskAttachmentItem(
            attachment: attachment,
            source: AttachmentSource.task,
          ),
        ),
        ...entityItems
            .where((attachment) => attachment.id.isNotEmpty && !seen.contains(attachment.id))
            .map(
              (attachment) => _TaskAttachmentItem(
                attachment: attachment,
                source: AttachmentSource.entity,
              ),
            ),
      ];
      if (!mounted) return;
      widget.onAttachmentsChanged(merged);
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() => _uploadError = error.message);
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Task attachments', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: AppSpacing.sm),
        AttachmentUploadActions(
          disabled: widget.disabled || widget.loading,
          uploading: _uploading,
          onPickAndUpload: _pickAndUpload,
        ),
        if (_uploadError != null) ...[
          const SizedBox(height: AppSpacing.xs),
          Text(_uploadError!, style: const TextStyle(color: AppColors.danger)),
        ],
        const SizedBox(height: AppSpacing.sm),
        if (widget.loading)
          const LinearProgressIndicator(minHeight: 2)
        else if (widget.attachments.isEmpty)
          Text('No task attachments yet', style: Theme.of(context).textTheme.bodySmall)
        else
          AttachmentGrid(
            organizationId: widget.organizationId,
            enabled: !widget.disabled && !widget.loading,
            items: widget.attachments.asMap().entries.map(
              (entry) => AttachmentGridEntry(
                attachment: entry.value.attachment,
                source: entry.value.source,
                index: entry.key + 1,
              ),
            ).toList(),
          ),
      ],
    );
  }
}

class _CommentsSection extends StatelessWidget {
  const _CommentsSection({
    required this.loading,
    required this.comments,
    required this.controller,
    required this.posting,
    required this.onPost,
  });

  final bool loading;
  final List<TaskComment> comments;
  final TextEditingController controller;
  final bool posting;
  final VoidCallback onPost;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Comments', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: AppSpacing.sm),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: controller,
                minLines: 1,
                maxLines: 3,
                decoration: const InputDecoration(hintText: 'Write a comment...'),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            IconButton(
              onPressed: posting ? null : onPost,
              icon: posting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.send_rounded),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        if (loading)
          const LinearProgressIndicator(minHeight: 2)
        else if (comments.isEmpty)
          Text('No comments yet', style: Theme.of(context).textTheme.bodySmall)
        else
          ...comments.take(8).map(
                (comment) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(comment.user?.fullName ?? comment.user?.email ?? 'User'),
                  subtitle: Text(comment.body),
                ),
              ),
      ],
    );
  }
}

class _NewSubtaskComposer extends StatefulWidget {
  const _NewSubtaskComposer({
    required this.enabled,
    required this.loading,
    required this.onSubmit,
  });

  final bool enabled;
  final bool loading;
  final Future<void> Function(String title) onSubmit;

  @override
  State<_NewSubtaskComposer> createState() => _NewSubtaskComposerState();
}

class _NewSubtaskComposerState extends State<_NewSubtaskComposer> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final title = _controller.text.trim();
    if (title.isEmpty || !widget.enabled || widget.loading) return;
    await widget.onSubmit(title);
    if (mounted) _controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<TextEditingValue>(
      valueListenable: _controller,
      builder: (context, value, _) {
        final canSubmit = widget.enabled && !widget.loading && value.text.trim().isNotEmpty;
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: TextField(
                controller: _controller,
                enabled: widget.enabled,
                maxLength: subtaskTitleMaxLength,
                decoration: InputDecoration(
                  hintText: 'Add an item…',
                  counterText: '',
                  prefixIcon: Icon(
                    Icons.add_rounded,
                    color: AppColors.textMuted.withValues(alpha: 0.7),
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 14,
                  ),
                ),
                onSubmitted: (_) => _submit(),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            PrimaryButton(
              label: 'Add',
              expand: false,
              height: 44,
              borderRadius: 12,
              loading: widget.loading,
              onPressed: canSubmit ? _submit : null,
            ),
          ],
        );
      },
    );
  }
}
