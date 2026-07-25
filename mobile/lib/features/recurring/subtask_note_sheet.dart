import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/pending_attachment.dart';
import '../../data/models/subtask_comment.dart';
import '../../data/models/task.dart';
import '../../data/models/task_attachment.dart';
import '../../shared/widgets/user_avatar.dart';
import '../auth/session_controller.dart';
import '../kanban/attachment_picker_section.dart';
import '../kanban/attachment_preview.dart';
import '../kanban/kanban_providers.dart';
import '../../shared/voice_dictation/voice_note_recorder_sheet.dart';
import '../../data/models/login_response.dart';

/// Result after closing the checklist notes thread sheet.
class SubtaskNoteSheetResult {
  const SubtaskNoteSheetResult({
    required this.hasNotes,
    this.latestNotePreview,
  });

  final bool hasNotes;
  final String? latestNotePreview;
}

Future<SubtaskNoteSheetResult?> showSubtaskNoteSheet({
  required BuildContext context,
  required TaskSubtask subtask,
  required String taskId,
  required String organizationId,
}) {
  return showModalBottomSheet<SubtaskNoteSheetResult>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    backgroundColor: AppColors.surface,
    builder: (context) {
      return Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: SubtaskNotesThreadSheet(
          subtask: subtask,
          taskId: taskId,
          organizationId: organizationId,
        ),
      );
    },
  );
}

class SubtaskNotesThreadSheet extends ConsumerStatefulWidget {
  const SubtaskNotesThreadSheet({
    super.key,
    required this.subtask,
    required this.taskId,
    required this.organizationId,
  });

  final TaskSubtask subtask;
  final String taskId;
  final String organizationId;

  @override
  ConsumerState<SubtaskNotesThreadSheet> createState() =>
      _SubtaskNotesThreadSheetState();
}

class _SubtaskNotesThreadSheetState
    extends ConsumerState<SubtaskNotesThreadSheet> {
  final _composerController = TextEditingController();
  final _listController = ScrollController();

  List<SubtaskComment> _roots = const [];
  List<TaskAttachment> _legacyAttachments = const [];
  final Map<String, List<TaskAttachment>> _attachmentsByComment = {};

  List<PendingAttachment> _pending = const [];
  SubtaskComment? _replyingTo;
  SubtaskComment? _editing;

  bool _loading = true;
  bool _posting = false;
  bool _picking = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _composerController.dispose();
    _listController.dispose();
    super.dispose();
  }

  String get _title {
    final t = widget.subtask.title.trim();
    return t.isEmpty ? 'Checklist item' : t;
  }

  String? get _currentUserId =>
      ref.read(sessionControllerProvider).user?.id;

  bool get _canModerate {
    final orgId = widget.organizationId;
    final orgs = ref.read(sessionControllerProvider).organizations;
    String? role;
    for (final o in orgs) {
      if (o.id == orgId) {
        role = o.myRole?.toLowerCase();
        break;
      }
    }
    return role == 'admin' || role == 'owner';
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final repo = ref.read(tasksRepositoryProvider);
      final attachmentsRepo = ref.read(attachmentsRepositoryProvider);
      final roots = await repo.fetchSubtaskComments(
        taskId: widget.taskId,
        subtaskId: widget.subtask.id,
      );

      final legacy = widget.subtask.id.trim().isEmpty
          ? <TaskAttachment>[]
          : await attachmentsRepo.fetchEntityAttachments(
              entityType: 'SUBTASK',
              entityId: widget.subtask.id,
              organizationId: widget.organizationId,
              taskId: widget.taskId,
            );

      final byComment = <String, List<TaskAttachment>>{};
      final allIds = <String>[
        for (final r in roots) ...[r.id, ...r.replies.map((x) => x.id)],
      ];
      await Future.wait(allIds.map((id) async {
        final items = await attachmentsRepo.fetchEntityAttachments(
          entityType: 'SUBTASK_COMMENT',
          entityId: id,
          organizationId: widget.organizationId,
          taskId: widget.taskId,
        );
        byComment[id] = items;
      }));

      if (!mounted) return;
      setState(() {
        _roots = roots;
        _legacyAttachments = legacy;
        _attachmentsByComment
          ..clear()
          ..addAll(byComment);
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = _friendlyLoadError(e.message);
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  String _friendlyLoadError(String message) {
    final m = message.trim();
    if (m.contains('Cannot GET') && m.contains('/comments')) {
      return 'Notes API is not on this server yet.\n'
          'Run the Nest API locally with the latest code '
          '(or deploy it), then open Notes again.';
    }
    return m;
  }

  void _popResult() {
    final hasNotes = _roots.isNotEmpty;
    final latest = hasNotes ? _roots.last.body.trim() : null;
    Navigator.of(context).pop(
      SubtaskNoteSheetResult(
        hasNotes: hasNotes,
        latestNotePreview: latest?.isEmpty == true ? null : latest,
      ),
    );
  }

  Future<void> _showAttachMenu() async {
    if (_posting || _picking) return;
    final choice = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      backgroundColor: AppColors.surface,
      builder: (ctx) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.photo_camera_rounded),
                title: const Text('Camera'),
                onTap: () => Navigator.pop(ctx, 'camera'),
              ),
              ListTile(
                leading: const Icon(Icons.photo_library_rounded),
                title: const Text('Gallery'),
                onTap: () => Navigator.pop(ctx, 'gallery'),
              ),
              ListTile(
                leading: const Icon(Icons.attach_file_rounded),
                title: const Text('File'),
                onTap: () => Navigator.pop(ctx, 'file'),
              ),
              ListTile(
                leading: const Icon(Icons.mic_rounded),
                title: const Text('Voice'),
                onTap: () => Navigator.pop(ctx, 'voice'),
              ),
            ],
          ),
        );
      },
    );
    if (choice == null || !mounted) return;

    setState(() => _picking = true);
    try {
      PendingAttachment? file;
      switch (choice) {
        case 'camera':
          file = await AttachmentPickerUtils.capturePhoto();
        case 'gallery':
          file = await AttachmentPickerUtils.pickFromGallery();
        case 'file':
          file = await AttachmentPickerUtils.pickFile();
        case 'voice':
          file = await showVoiceNoteRecorderSheet(context);
      }
      if (file == null || !mounted) return;
      setState(() => _pending = [..._pending, file!]);
    } finally {
      if (mounted) setState(() => _picking = false);
    }
  }

  Future<void> _post() async {
    final body = _composerController.text.trim();
    if (body.isEmpty && _pending.isEmpty) return;
    if (body.isEmpty) {
      setState(() => _error = 'Add a note before attaching files.');
      return;
    }
    if (widget.subtask.id.trim().isEmpty) {
      setState(() => _error = 'Save the checklist item before adding notes.');
      return;
    }

    setState(() {
      _posting = true;
      _error = null;
    });

    try {
      final repo = ref.read(tasksRepositoryProvider);
      final attachmentsRepo = ref.read(attachmentsRepositoryProvider);

      if (_editing != null) {
        final editingId = _editing!.id;
        final existingReplies = _editing!.replies;
        final updated = await repo.updateSubtaskComment(
          taskId: widget.taskId,
          subtaskId: widget.subtask.id,
          commentId: editingId,
          body: body,
        );
        setState(() {
          _roots = _roots.map((r) {
            if (r.id == editingId) {
              return updated.copyWith(replies: existingReplies);
            }
            final replyIdx = r.replies.indexWhere((x) => x.id == editingId);
            if (replyIdx >= 0) {
              final next = [...r.replies];
              next[replyIdx] = updated;
              return r.copyWith(replies: next);
            }
            return r;
          }).toList();
          _editing = null;
          _composerController.clear();
          _pending = const [];
        });
      } else {
        final created = await repo.addSubtaskComment(
          taskId: widget.taskId,
          subtaskId: widget.subtask.id,
          body: body,
          parentId: _replyingTo?.id,
        );

        for (final file in _pending) {
          await attachmentsRepo.uploadEntityAttachment(
            entityType: 'SUBTASK_COMMENT',
            entityId: created.id,
            taskId: widget.taskId,
            organizationId: widget.organizationId,
            file: file,
          );
        }

        final uploaded = _pending.isEmpty
            ? <TaskAttachment>[]
            : await attachmentsRepo.fetchEntityAttachments(
                entityType: 'SUBTASK_COMMENT',
                entityId: created.id,
                organizationId: widget.organizationId,
                taskId: widget.taskId,
              );

        setState(() {
          _attachmentsByComment[created.id] = uploaded;
          if (_replyingTo != null) {
            _roots = _roots.map((r) {
              if (r.id != _replyingTo!.id) return r;
              return r.copyWith(replies: [...r.replies, created]);
            }).toList();
          } else {
            _roots = [..._roots, created];
          }
          _replyingTo = null;
          _composerController.clear();
          _pending = const [];
        });
      }

      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_listController.hasClients) {
          _listController.animateTo(
            _listController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeOut,
          );
        }
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _posting = false);
    }
  }

  Future<void> _delete(SubtaskComment comment) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete note?'),
        content: Text(
          comment.isRoot && comment.replies.isNotEmpty
              ? 'This will also delete ${comment.replies.length} '
                  '${comment.replies.length == 1 ? 'reply' : 'replies'}.'
              : 'This note will be removed from the thread.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    try {
      await ref.read(tasksRepositoryProvider).deleteSubtaskComment(
            taskId: widget.taskId,
            subtaskId: widget.subtask.id,
            commentId: comment.id,
          );
      setState(() {
        if (comment.isRoot) {
          _roots = _roots.where((r) => r.id != comment.id).toList();
        } else {
          _roots = _roots.map((r) {
            return r.copyWith(
              replies: r.replies.where((x) => x.id != comment.id).toList(),
            );
          }).toList();
        }
        _attachmentsByComment.remove(comment.id);
        if (_replyingTo?.id == comment.id) _replyingTo = null;
        if (_editing?.id == comment.id) {
          _editing = null;
          _composerController.clear();
        }
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  void _startReply(SubtaskComment root) {
    setState(() {
      _replyingTo = root;
      _editing = null;
    });
  }

  void _startEdit(SubtaskComment comment) {
    setState(() {
      _editing = comment;
      _replyingTo = null;
      _composerController.text = comment.body;
      _pending = const [];
    });
  }

  void _cancelComposerMode() {
    setState(() {
      _replyingTo = null;
      _editing = null;
      _composerController.clear();
      _pending = const [];
    });
  }

  bool _canDelete(SubtaskComment c) {
    final uid = _currentUserId;
    if (uid != null && uid == c.userId) return true;
    return _canModerate;
  }

  bool _canEdit(SubtaskComment c) {
    final uid = _currentUserId;
    return uid != null && uid == c.userId;
  }

  String _relativeTime(String iso) {
    final dt = DateTime.tryParse(iso)?.toLocal();
    if (dt == null) return '';
    final diff = DateTime.now().difference(dt);
    if (diff.inSeconds < 60) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.sizeOf(context).height * 0.85;

    return SizedBox(
      height: height,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.sm,
              AppSpacing.lg,
              0,
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Notes',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AppColors.textMuted,
                            ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Close',
                  onPressed: _popResult,
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
          ),
          if (_loading)
            const Expanded(
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_error != null && _roots.isEmpty)
            Expanded(
              child: Center(
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
                      FilledButton(
                        onPressed: _load,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
              ),
            )
          else
            Expanded(
              child: RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  controller: _listController,
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.lg,
                    AppSpacing.md,
                    AppSpacing.lg,
                    AppSpacing.sm,
                  ),
                  children: [
                    if (_legacyAttachments.isNotEmpty) ...[
                      Text(
                        'OLDER ATTACHMENTS',
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              letterSpacing: 1.1,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textMuted,
                            ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      AttachmentGrid(
                        organizationId: widget.organizationId,
                        enabled: false,
                        items: _legacyAttachments.asMap().entries.map(
                          (e) => AttachmentGridEntry(
                            attachment: e.value,
                            index: e.key + 1,
                          ),
                        ).toList(),
                      ),
                      const SizedBox(height: AppSpacing.md),
                    ],
                    if (_roots.isEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(
                          vertical: AppSpacing.xl,
                        ),
                        child: Text(
                          'No notes yet — start the thread',
                          textAlign: TextAlign.center,
                          style:
                              Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: AppColors.textMuted,
                                  ),
                        ),
                      )
                    else
                      ..._roots.map(_buildRootBubble),
                    if (_error != null) ...[
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        _error!,
                        style: const TextStyle(color: AppColors.danger),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          _buildComposer(context),
        ],
      ),
    );
  }

  Widget _buildRootBubble(SubtaskComment comment) {
    final parentName = comment.user?.fullName.trim().isNotEmpty == true
        ? comment.user!.fullName
        : (comment.user?.email ?? 'note');
    final replies = comment.replies;

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 8, 12),
              child: _NoteContent(
                comment: comment,
                relativeTime: _relativeTime(comment.createdAt),
                attachments: _attachmentsByComment[comment.id] ?? const [],
                organizationId: widget.organizationId,
                canEdit: _canEdit(comment),
                canDelete: _canDelete(comment),
                onReply: () => _startReply(comment),
                onEdit: () => _startEdit(comment),
                onDelete: () => _delete(comment),
                showReply: true,
              ),
            ),
            if (replies.isNotEmpty) ...[
              const Divider(height: 1, color: AppColors.border),
              Padding(
                padding: const EdgeInsets.fromLTRB(4, 8, 8, 10),
                child: Column(
                  children: [
                    for (var i = 0; i < replies.length; i++)
                      _ThreadedReplyRow(
                        isLast: i == replies.length - 1,
                        child: _NoteContent(
                          comment: replies[i],
                          relativeTime: _relativeTime(replies[i].createdAt),
                          attachments:
                              _attachmentsByComment[replies[i].id] ?? const [],
                          organizationId: widget.organizationId,
                          canEdit: _canEdit(replies[i]),
                          canDelete: _canDelete(replies[i]),
                          onEdit: () => _startEdit(replies[i]),
                          onDelete: () => _delete(replies[i]),
                          showReply: false,
                          compact: true,
                          replyToName: parentName,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildComposer(BuildContext context) {
    final modeLabel = _editing != null
        ? 'Editing note'
        : _replyingTo != null
            ? 'Replying to ${_replyingTo!.user?.fullName.isNotEmpty == true ? _replyingTo!.user!.fullName : 'note'}'
            : null;

    return Material(
      elevation: 8,
      color: AppColors.surface,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.md,
            AppSpacing.sm,
            AppSpacing.md,
            AppSpacing.md,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (modeLabel != null)
                Container(
                  margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          modeLabel,
                          style:
                              Theme.of(context).textTheme.labelMedium?.copyWith(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.w600,
                                  ),
                        ),
                      ),
                      InkWell(
                        onTap: _cancelComposerMode,
                        child: const Icon(Icons.close, size: 18),
                      ),
                    ],
                  ),
                ),
              if (_pending.isNotEmpty) ...[
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    for (var i = 0; i < _pending.length; i++)
                      Chip(
                        label: Text(
                          _pending[i].fileName,
                          overflow: TextOverflow.ellipsis,
                        ),
                        onDeleted: _posting
                            ? null
                            : () {
                                setState(() {
                                  _pending = [
                                    for (var j = 0; j < _pending.length; j++)
                                      if (j != i) _pending[j],
                                  ];
                                });
                              },
                      ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
              ],
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  IconButton(
                    tooltip: 'Add attachment',
                    onPressed: (_posting || _picking || _editing != null)
                        ? null
                        : _showAttachMenu,
                    icon: _picking
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.add_circle_outline_rounded),
                    color: AppColors.primary,
                  ),
                  Expanded(
                    child: TextField(
                      controller: _composerController,
                      minLines: 1,
                      maxLines: 5,
                      maxLength: 2000,
                      enabled: !_posting,
                      decoration: InputDecoration(
                        hintText: 'Why was this done / not done today?',
                        counterText: '',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 12,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: _posting ? null : _post,
                    child: _posting
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text(_editing != null ? 'Save' : 'Post'),
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

/// Vertical rail + elbow so a reply reads as attached to its parent note.
class _ThreadedReplyRow extends StatelessWidget {
  const _ThreadedReplyRow({
    required this.child,
    required this.isLast,
  });

  final Widget child;
  final bool isLast;

  static const _railWidth = 28.0;
  static const _lineColor = Color(0xFFCBD5E1);

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: _railWidth,
            child: CustomPaint(
              painter: _ThreadConnectorPainter(
                isLast: isLast,
                color: _lineColor,
              ),
            ),
          ),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 10),
              child: child,
            ),
          ),
        ],
      ),
    );
  }
}

class _ThreadConnectorPainter extends CustomPainter {
  _ThreadConnectorPainter({
    required this.isLast,
    required this.color,
  });

  final bool isLast;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    const avatarCenterY = 14.0;
    final x = size.width * 0.55;

    // Vertical stem from top of rail into this reply (and beyond if not last).
    final stemEnd = isLast ? avatarCenterY : size.height;
    canvas.drawLine(Offset(x, 0), Offset(x, stemEnd), paint);

    // Elbow into the reply avatar.
    canvas.drawLine(
      Offset(x, avatarCenterY),
      Offset(size.width - 2, avatarCenterY),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant _ThreadConnectorPainter oldDelegate) {
    return oldDelegate.isLast != isLast || oldDelegate.color != color;
  }
}

class _NoteContent extends ConsumerWidget {
  const _NoteContent({
    required this.comment,
    required this.relativeTime,
    required this.attachments,
    required this.organizationId,
    required this.canEdit,
    required this.canDelete,
    required this.onEdit,
    required this.onDelete,
    this.onReply,
    this.showReply = false,
    this.compact = false,
    this.replyToName,
  });

  final SubtaskComment comment;
  final String relativeTime;
  final List<TaskAttachment> attachments;
  final String organizationId;
  final bool canEdit;
  final bool canDelete;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback? onReply;
  final bool showReply;
  final bool compact;
  final String? replyToName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final name = comment.user?.fullName.trim().isNotEmpty == true
        ? comment.user!.fullName
        : (comment.user?.email ?? 'Someone');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            UserAvatar(
              user: AuthUser(
                id: comment.userId,
                email: comment.user?.email ?? '',
                fullName: name,
                avatarUrl: comment.user?.avatarUrl,
              ),
              size: compact ? 28 : 32,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (replyToName != null && replyToName!.trim().isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 2),
                      child: Text(
                        '↳ $replyToName',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: AppColors.primary.withValues(alpha: 0.85),
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    ),
                  Text(
                    name,
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                  if (relativeTime.isNotEmpty)
                    Text(
                      relativeTime,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: AppColors.textMuted,
                          ),
                    ),
                ],
              ),
            ),
            if (canEdit || canDelete || showReply)
              PopupMenuButton<String>(
                padding: EdgeInsets.zero,
                onSelected: (value) {
                  switch (value) {
                    case 'reply':
                      onReply?.call();
                    case 'edit':
                      onEdit();
                    case 'delete':
                      onDelete();
                  }
                },
                itemBuilder: (context) => [
                  if (showReply)
                    const PopupMenuItem(
                      value: 'reply',
                      child: Text('Reply'),
                    ),
                  if (canEdit)
                    const PopupMenuItem(
                      value: 'edit',
                      child: Text('Edit'),
                    ),
                  if (canDelete)
                    const PopupMenuItem(
                      value: 'delete',
                      child: Text('Delete'),
                    ),
                ],
              ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          comment.body,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        if (attachments.isNotEmpty) ...[
          const SizedBox(height: 8),
          AttachmentGrid(
            organizationId: organizationId,
            enabled: false,
            items: attachments.asMap().entries.map(
              (e) => AttachmentGridEntry(
                attachment: e.value,
                index: e.key + 1,
              ),
            ).toList(),
          ),
        ],
      ],
    );
  }
}
