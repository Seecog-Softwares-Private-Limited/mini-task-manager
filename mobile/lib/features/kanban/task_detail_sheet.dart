import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/project_member.dart';
import '../../data/models/task.dart';
import '../../data/models/task_attachment.dart';
import '../../data/models/task_comment.dart';
import '../../data/models/workflow.dart';
import '../../shared/widgets/app_widgets.dart';
import '../auth/session_controller.dart';
import '../kanban/kanban_providers.dart';
import '../projects/projects_providers.dart';

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
  final _commentController = TextEditingController();
  late List<TaskSubtask> _subtasks;
  int? _expandedSubtaskIndex;
  bool _saving = false;
  bool _loadingMeta = true;
  bool _postingComment = false;
  String? _error;
  List<ProjectMember> _members = const [];
  List<TaskAttachment> _attachments = const [];
  List<TaskComment> _comments = const [];
  static const _subtaskStatuses = ['TODO', 'IN_PROGRESS', 'DONE'];

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.task.title);
    _subtasks = List.of(widget.task.subtasks);
    _loadMeta();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _commentController.dispose();
    super.dispose();
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
        tasksRepo.fetchAttachments(widget.task.id),
        tasksRepo.fetchComments(widget.task.id),
      ]);
      if (!mounted) return;
      setState(() {
        _members = results[0] as List<ProjectMember>;
        _attachments = results[1] as List<TaskAttachment>;
        _comments = results[2] as List<TaskComment>;
        _loadingMeta = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loadingMeta = false;
      });
    }
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
    final resolvedStatus = value ? 'DONE' : (item.status ?? 'TODO');
    updated[index] = item.copyWith(completed: value, status: resolvedStatus);
    setState(() => _subtasks = updated);
    await _run(() => ref.read(tasksRepositoryProvider).updateTask(
          taskId: widget.task.id,
          subtasks: updated,
        ));
  }

  Future<void> _updateSubtaskStatus(int index, String? status) async {
    if (status == null) return;
    final updated = List<TaskSubtask>.from(_subtasks);
    updated[index] = updated[index].copyWith(
      status: status,
      completed: status == 'DONE' ? true : updated[index].completed,
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

  Future<void> _addComment() async {
    final body = _commentController.text.trim();
    if (body.isEmpty) return;
    setState(() => _postingComment = true);
    try {
      final comment = await ref.read(tasksRepositoryProvider).addComment(
            taskId: widget.task.id,
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

  @override
  Widget build(BuildContext context) {
    final currentUserId = ref.watch(sessionControllerProvider).user?.id;
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
              _TaskMetaSection(
                task: widget.task,
                statuses: widget.statuses,
                currentUserId: currentUserId,
                members: _members,
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
                Row(
                  children: [
                    Text('Checklist', style: Theme.of(context).textTheme.titleMedium),
                    const Spacer(),
                    Text(
                      '${_subtasks.where((s) => s.completed).length}/${_subtasks.length} done',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                ...List.generate(_subtasks.length, (index) {
                  final item = _subtasks[index];
                  final expanded = _expandedSubtaskIndex == index;
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
                        CheckboxListTile(
                          value: item.completed,
                          onChanged: _saving ? null : (v) => _toggleSubtask(index, v),
                          title: Text(
                            item.title,
                            style: TextStyle(
                              decoration: item.completed
                                  ? TextDecoration.lineThrough
                                  : null,
                            ),
                          ),
                          secondary: IconButton(
                            icon: Icon(
                              expanded
                                  ? Icons.keyboard_arrow_up_rounded
                                  : Icons.keyboard_arrow_down_rounded,
                            ),
                            onPressed: () {
                              setState(() {
                                _expandedSubtaskIndex = expanded ? null : index;
                              });
                            },
                          ),
                          controlAffinity: ListTileControlAffinity.leading,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                        ),
                        if (expanded)
                          Padding(
                            padding: const EdgeInsets.fromLTRB(
                              AppSpacing.md,
                              0,
                              AppSpacing.md,
                              AppSpacing.md,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                DropdownButtonFormField<String>(
                                  initialValue: _subtaskStatuses.contains(item.status)
                                      ? item.status
                                      : (item.completed ? 'DONE' : 'TODO'),
                                  decoration: const InputDecoration(
                                    labelText: 'Subtask status',
                                  ),
                                  items: _subtaskStatuses
                                      .map(
                                        (status) => DropdownMenuItem(
                                          value: status,
                                          child: Text(_labelForSubtaskStatus(status)),
                                        ),
                                      )
                                      .toList(),
                                  onChanged: _saving
                                      ? null
                                      : (value) => _updateSubtaskStatus(index, value),
                                ),
                                if ((item.description ?? '').trim().isNotEmpty) ...[
                                  const SizedBox(height: AppSpacing.sm),
                                  Text(
                                    item.description!.trim(),
                                    style: Theme.of(context).textTheme.bodyMedium,
                                  ),
                                ],
                                if ((item.priority ?? '').isNotEmpty ||
                                    (item.dueDate ?? '').isNotEmpty ||
                                    item.assigneeIds.isNotEmpty) ...[
                                  const SizedBox(height: AppSpacing.sm),
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: [
                                      if ((item.priority ?? '').isNotEmpty)
                                        _MetaChip(label: 'Priority: ${item.priority}'),
                                      if ((item.dueDate ?? '').isNotEmpty)
                                        _MetaChip(label: 'Due: ${item.dueDate}'),
                                      if (item.assigneeIds.isNotEmpty)
                                        _MetaChip(
                                          label:
                                              'Assignees: ${item.assigneeIds.length}',
                                        ),
                                    ],
                                  ),
                                ],
                              ],
                            ),
                          ),
                      ],
                    ),
                  );
                }),
              ],
              const SizedBox(height: AppSpacing.lg),
              _AttachmentsSection(
                loading: _loadingMeta,
                attachments: _attachments,
              ),
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

class _TaskMetaSection extends StatelessWidget {
  const _TaskMetaSection({
    required this.task,
    required this.statuses,
    required this.currentUserId,
    required this.members,
  });

  final Task task;
  final List<WorkflowStatus> statuses;
  final String? currentUserId;
  final List<ProjectMember> members;

  @override
  Widget build(BuildContext context) {
    String? taskStatus;
    for (final status in statuses) {
      if (status.id == task.statusId) {
        taskStatus = status.name;
        break;
      }
    }
    final assignedBy = _resolveMember(task.reporterId, members, currentUserId);
    final assignedTo = task.assigneeIds
        .map((id) => _resolveMember(id, members, currentUserId))
        .toList();
    final detailsText = _stripHtml(task.description ?? '');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Details', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: AppSpacing.sm),
        if (detailsText.isNotEmpty) Text(detailsText),
        const SizedBox(height: AppSpacing.sm),
        _AssignmentCard(
          title: 'ASSIGNED BY',
          subtitle: 'Task owner',
          members: [assignedBy],
        ),
        const SizedBox(height: AppSpacing.sm),
        _AssignmentCard(
          title: 'ASSIGNED TO',
          subtitle: assignedTo.isEmpty
              ? 'No assignees'
              : '${assignedTo.length} member${assignedTo.length == 1 ? '' : 's'}',
          members: assignedTo,
        ),
        const SizedBox(height: AppSpacing.sm),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _MetaChip(label: 'Status: ${taskStatus ?? 'Not set'}'),
            _MetaChip(label: 'Priority: ${task.priority.toUpperCase()}'),
            _MetaChip(label: 'Due date: ${task.dueDate ?? 'Not set'}'),
            _MetaChip(
              label: task.tags.isEmpty
                  ? 'Tags: Not set'
                  : 'Tags: ${task.tags.take(2).join(', ')}${task.tags.length > 2 ? ' +' : ''}',
            ),
          ],
        ),
      ],
    );
  }
}

class _AssignmentCard extends StatefulWidget {
  const _AssignmentCard({
    required this.title,
    required this.subtitle,
    required this.members,
  });

  final String title;
  final String subtitle;
  final List<_MemberView> members;

  @override
  State<_AssignmentCard> createState() => _AssignmentCardState();
}

class _AssignmentCardState extends State<_AssignmentCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final shown = widget.members.isEmpty
        ? const <_MemberView>[]
        : (_expanded ? widget.members : [widget.members.first]);
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          ListTile(
            title: Text(
              widget.title,
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    letterSpacing: 2.2,
                    fontWeight: FontWeight.w700,
                  ),
            ),
            subtitle: Text(widget.subtitle),
            trailing: widget.members.length <= 1
                ? null
                : IconButton(
                    onPressed: () => setState(() => _expanded = !_expanded),
                    icon: Icon(
                      _expanded
                          ? Icons.keyboard_arrow_up_rounded
                          : Icons.keyboard_arrow_down_rounded,
                    ),
                  ),
          ),
          if (shown.isEmpty)
            const Padding(
              padding: EdgeInsets.fromLTRB(
                AppSpacing.md,
                0,
                AppSpacing.md,
                AppSpacing.md,
              ),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text('Not set'),
              ),
            )
          else
            ...shown.map((member) => _MemberTile(member: member)),
          if (!_expanded && widget.members.length > 1)
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.md,
                0,
                AppSpacing.md,
                AppSpacing.md,
              ),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  '+${widget.members.length - 1} more',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _MemberTile extends StatelessWidget {
  const _MemberTile({required this.member});

  final _MemberView member;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(AppSpacing.md, 0, AppSpacing.md, AppSpacing.sm),
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: AppColors.primary.withValues(alpha: 0.15),
            backgroundImage: _networkOrNull(member.avatarUrl),
            child: _networkOrNull(member.avatarUrl) == null
                ? Text(
                    _initials(member.name),
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  )
                : null,
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  member.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                if ((member.email ?? '').isNotEmpty)
                  Text(
                    member.email!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MemberView {
  const _MemberView({
    required this.name,
    this.email,
    this.avatarUrl,
  });

  final String name;
  final String? email;
  final String? avatarUrl;
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(label, style: Theme.of(context).textTheme.bodySmall),
    );
  }
}

String _labelForSubtaskStatus(String status) {
  return switch (status) {
    'IN_PROGRESS' => 'In Progress',
    'DONE' => 'Done',
    _ => 'To Do',
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

_MemberView _resolveMember(String? userId, List<ProjectMember> members, String? currentUserId) {
  if (userId == null || userId.isEmpty) return const _MemberView(name: 'Not set');
  for (final member in members) {
    if (member.userId == userId) {
      final name = member.user?.fullName.trim() ?? '';
      if (name.isNotEmpty) {
        return _MemberView(
          name: userId == currentUserId ? 'You' : name,
          email: member.user?.email,
          avatarUrl: member.user?.avatarUrl,
        );
      }
      final email = member.user?.email.trim() ?? '';
      if (email.isNotEmpty) return _MemberView(name: email, email: email);
      break;
    }
  }
  return _MemberView(name: _compactId(userId));
}

ImageProvider<Object>? _networkOrNull(String? avatarUrl) {
  if (avatarUrl == null || avatarUrl.isEmpty) return null;
  if (!avatarUrl.startsWith('http')) return null;
  return NetworkImage(avatarUrl);
}

String _initials(String name) {
  final parts = name.trim().split(RegExp(r'\s+')).where((e) => e.isNotEmpty).toList();
  if (parts.isEmpty) return '?';
  if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
  return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
}

class _AttachmentsSection extends StatelessWidget {
  const _AttachmentsSection({
    required this.loading,
    required this.attachments,
  });

  final bool loading;
  final List<TaskAttachment> attachments;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Task attachments', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: AppSpacing.sm),
        if (loading)
          const LinearProgressIndicator(minHeight: 2)
        else if (attachments.isEmpty)
          Text('No task attachments yet', style: Theme.of(context).textTheme.bodySmall)
        else
          ...attachments.take(6).map(
                (item) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.attach_file_rounded),
                  title: Text(
                    item.fileName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: item.mimeType == null ? null : Text(item.mimeType!),
                ),
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
