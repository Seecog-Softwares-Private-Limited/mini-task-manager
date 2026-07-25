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
  final sheetKey = ValueKey<String>('subtask-notes-$taskId-${subtask.id}');
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
          key: sheetKey,
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
    final expectedSubtaskId = widget.subtask.id.trim();
    setState(() {
      _loading = true;
      _error = null;
      _roots = const [];
      _legacyAttachments = const [];
      _attachmentsByComment.clear();
      _replyingTo = null;
      _editing = null;
    });
    try {
      final repo = ref.read(tasksRepositoryProvider);
      final attachmentsRepo = ref.read(attachmentsRepositoryProvider);
      final fetched = await repo.fetchSubtaskComments(
        taskId: widget.taskId,
        subtaskId: expectedSubtaskId,
      );
      // Never show another checklist item's thread if the API/scope drifts.
      List<SubtaskComment> scopeTree(List<SubtaskComment> nodes) {
        return nodes
            .where(
              (c) =>
                  c.subtaskId == expectedSubtaskId ||
                  (c.subtaskId.isEmpty && expectedSubtaskId.isEmpty),
            )
            .map((c) => c.copyWith(replies: scopeTree(c.replies)))
            .toList();
      }

      final roots = scopeTree(fetched)
        ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

      final legacy = expectedSubtaskId.isEmpty
          ? <TaskAttachment>[]
          : await attachmentsRepo.fetchEntityAttachments(
              entityType: 'SUBTASK',
              entityId: expectedSubtaskId,
              organizationId: widget.organizationId,
              taskId: widget.taskId,
            );

      final byComment = <String, List<TaskAttachment>>{};
      final allIds = <String>[
        for (final r in roots) ...r.allIds,
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
      // Sheet was reused for a different checklist item mid-flight.
      if (widget.subtask.id.trim() != expectedSubtaskId) return;
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
      if (widget.subtask.id.trim() != expectedSubtaskId) return;
      setState(() {
        _error = _friendlyLoadError(e.message);
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      if (widget.subtask.id.trim() != expectedSubtaskId) return;
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
    // Roots are newest-first.
    final latest = hasNotes ? _roots.first.body.trim() : null;
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
          _roots = SubtaskComment.replaceById(
            _roots,
            editingId,
            (_) => updated.copyWith(replies: existingReplies),
          );
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

        final wasReply = _replyingTo != null;
        setState(() {
          _attachmentsByComment[created.id] = uploaded;
          if (wasReply) {
            _roots = SubtaskComment.insertReply(
              _roots,
              _replyingTo!.id,
              created,
            );
          } else {
            // Newest root threads sit on top.
            _roots = [created, ..._roots];
          }
          _replyingTo = null;
          _composerController.clear();
          _pending = const [];
        });

        if (!wasReply) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (_listController.hasClients) {
              _listController.animateTo(
                0,
                duration: const Duration(milliseconds: 250),
                curve: Curves.easeOut,
              );
            }
          });
        }
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _posting = false);
    }
  }

  Future<void> _delete(SubtaskComment comment) async {
    final nested = comment.descendantCount;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete note?'),
        content: Text(
          nested > 0
              ? 'This will also delete $nested '
                  '${nested == 1 ? 'reply' : 'replies'} under it.'
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
        for (final id in comment.allIds) {
          _attachmentsByComment.remove(id);
        }
        _roots = SubtaskComment.removeById(_roots, comment.id);
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

  void _startReply(SubtaskComment comment) {
    setState(() {
      _replyingTo = comment;
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
    final height = MediaQuery.sizeOf(context).height * 0.88;
    final noteCount = _roots.length;

    return SizedBox(
      height: height,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.xs,
              AppSpacing.sm,
              AppSpacing.sm,
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            'Notes',
                            style:
                                Theme.of(context).textTheme.titleLarge?.copyWith(
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: -0.3,
                                    ),
                          ),
                          if (!_loading && noteCount > 0) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                '$noteCount',
                                style: Theme.of(context)
                                    .textTheme
                                    .labelSmall
                                    ?.copyWith(
                                      color: AppColors.primary,
                                      fontWeight: FontWeight.w700,
                                    ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: AppColors.border.withValues(alpha: 0.9),
                          ),
                        ),
                        child: Text(
                          _title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style:
                              Theme.of(context).textTheme.labelMedium?.copyWith(
                                    color: AppColors.textSecondary,
                                    fontWeight: FontWeight.w500,
                                  ),
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Close',
                  visualDensity: VisualDensity.compact,
                  onPressed: _popResult,
                  icon: Icon(
                    Icons.close_rounded,
                    color: AppColors.textMuted.withValues(alpha: 0.9),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.border),
          if (_loading)
            const Expanded(
              child: Center(child: CircularProgressIndicator(strokeWidth: 2.5)),
            )
          else if (_error != null && _roots.isEmpty)
            Expanded(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.cloud_off_outlined,
                        size: 36,
                        color: AppColors.textMuted.withValues(alpha: 0.7),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        _error!,
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AppColors.danger,
                            ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      FilledButton.tonal(
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
                    AppSpacing.md,
                    AppSpacing.md,
                    AppSpacing.md,
                    AppSpacing.lg,
                  ),
                  children: [
                    if (_legacyAttachments.isNotEmpty) ...[
                      _SectionLabel('Earlier files'),
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
                      const _EmptyThread()
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
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
              color: AppColors.textPrimary.withValues(alpha: 0.04),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: _ThreadBranch(
          comment: comment,
          depth: 0,
          relativeTime: _relativeTime(comment.createdAt),
          attachmentsByComment: _attachmentsByComment,
          organizationId: widget.organizationId,
          canEdit: _canEdit,
          canDelete: _canDelete,
          onReply: _startReply,
          onEdit: _startEdit,
          onDelete: _delete,
          formatTime: _relativeTime,
          nestInCard: true,
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
      color: AppColors.surface,
      elevation: 10,
      shadowColor: AppColors.textPrimary.withValues(alpha: 0.08),
      child: SafeArea(
        top: false,
        child: Container(
          decoration: const BoxDecoration(
            border: Border(top: BorderSide(color: AppColors.border)),
          ),
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.sm,
            AppSpacing.sm,
            AppSpacing.sm,
            AppSpacing.sm,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (modeLabel != null)
                Container(
                  margin: const EdgeInsets.only(bottom: AppSpacing.xs),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _editing != null
                            ? Icons.edit_outlined
                            : Icons.reply_rounded,
                        size: 16,
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          modeLabel,
                          style: Theme.of(context)
                              .textTheme
                              .labelMedium
                              ?.copyWith(
                                color: AppColors.primary,
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                      ),
                      InkWell(
                        borderRadius: BorderRadius.circular(999),
                        onTap: _cancelComposerMode,
                        child: const Padding(
                          padding: EdgeInsets.all(2),
                          child: Icon(Icons.close, size: 16),
                        ),
                      ),
                    ],
                  ),
                ),
              if (_pending.isNotEmpty) ...[
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      for (var i = 0; i < _pending.length; i++) ...[
                        if (i > 0) const SizedBox(width: 6),
                        InputChip(
                          visualDensity: VisualDensity.compact,
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
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
              ],
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Material(
                    color: AppColors.background,
                    shape: const CircleBorder(
                      side: BorderSide(color: AppColors.border),
                    ),
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: (_posting || _picking || _editing != null)
                          ? null
                          : _showAttachMenu,
                      child: SizedBox(
                        width: 42,
                        height: 42,
                        child: Center(
                          child: _picking
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : Icon(
                                  Icons.add_rounded,
                                  color: (_posting || _editing != null)
                                      ? AppColors.textMuted
                                      : AppColors.primary,
                                ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _composerController,
                      minLines: 1,
                      maxLines: 5,
                      maxLength: 2000,
                      enabled: !_posting,
                      textInputAction: TextInputAction.newline,
                      decoration: InputDecoration(
                        hintText: 'Add a note…',
                        hintStyle: TextStyle(
                          color: AppColors.textMuted.withValues(alpha: 0.85),
                        ),
                        counterText: '',
                        filled: true,
                        fillColor: AppColors.background,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: AppColors.border),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: AppColors.border),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(
                            color: AppColors.primary,
                            width: 1.4,
                          ),
                        ),
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 12,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: _posting ? null : _post,
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(72, 42),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
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

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: Theme.of(context).textTheme.labelSmall?.copyWith(
            letterSpacing: 1.1,
            fontWeight: FontWeight.w700,
            color: AppColors.textMuted,
          ),
    );
  }
}

class _EmptyThread extends StatelessWidget {
  const _EmptyThread();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 12),
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.08),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.forum_outlined,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'No notes yet',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 6),
          Text(
            'Start the thread with why this was done or not done today.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.textMuted,
                ),
          ),
        ],
      ),
    );
  }
}

/// Recursive note + nested replies (reply-of-reply).
class _ThreadBranch extends StatelessWidget {
  const _ThreadBranch({
    required this.comment,
    required this.depth,
    required this.relativeTime,
    required this.attachmentsByComment,
    required this.organizationId,
    required this.canEdit,
    required this.canDelete,
    required this.onReply,
    required this.onEdit,
    required this.onDelete,
    required this.formatTime,
    this.replyToName,
    this.nestInCard = false,
  });

  final SubtaskComment comment;
  final int depth;
  final String relativeTime;
  final Map<String, List<TaskAttachment>> attachmentsByComment;
  final String organizationId;
  final bool Function(SubtaskComment) canEdit;
  final bool Function(SubtaskComment) canDelete;
  final ValueChanged<SubtaskComment> onReply;
  final ValueChanged<SubtaskComment> onEdit;
  final ValueChanged<SubtaskComment> onDelete;
  final String Function(String iso) formatTime;
  final String? replyToName;
  final bool nestInCard;

  static const _maxVisualDepth = 5;

  @override
  Widget build(BuildContext context) {
    final name = comment.user?.fullName.trim().isNotEmpty == true
        ? comment.user!.fullName
        : (comment.user?.email ?? 'note');
    final replies = comment.replies;
    final content = Padding(
      padding: EdgeInsets.fromLTRB(
        nestInCard ? 14 : 0,
        nestInCard ? 14 : 0,
        nestInCard ? 6 : 0,
        nestInCard && replies.isEmpty ? 12 : 8,
      ),
      child: _NoteContent(
        comment: comment,
        relativeTime: relativeTime,
        attachments: attachmentsByComment[comment.id] ?? const [],
        organizationId: organizationId,
        canEdit: canEdit(comment),
        canDelete: canDelete(comment),
        onReply: () => onReply(comment),
        onEdit: () => onEdit(comment),
        onDelete: () => onDelete(comment),
        showReply: depth < 7,
        compact: depth > 0,
        replyToName: replyToName,
      ),
    );

    final repliesBlock = replies.isEmpty
        ? const SizedBox.shrink()
        : Container(
            width: double.infinity,
            decoration: nestInCard && depth == 0
                ? BoxDecoration(
                    color: AppColors.background.withValues(alpha: 0.85),
                    border: const Border(
                      top: BorderSide(color: AppColors.border),
                    ),
                    borderRadius: const BorderRadius.vertical(
                      bottom: Radius.circular(17),
                    ),
                  )
                : null,
            padding: EdgeInsets.fromLTRB(
              depth == 0 ? 6 : 0,
              depth == 0 ? 10 : 4,
              depth == 0 ? 10 : 0,
              depth == 0 ? 12 : 0,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (depth == 0)
                  Padding(
                    padding: const EdgeInsets.only(left: 34, bottom: 8),
                    child: Text(
                      '${comment.descendantCount} '
                      '${comment.descendantCount == 1 ? 'reply' : 'replies'}',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: AppColors.textMuted,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  ),
                for (var i = 0; i < replies.length; i++)
                  _ThreadedReplyRow(
                    isLast: i == replies.length - 1,
                    depth: (depth + 1).clamp(0, _maxVisualDepth),
                    child: _ThreadBranch(
                      comment: replies[i],
                      depth: depth + 1,
                      relativeTime: formatTime(replies[i].createdAt),
                      attachmentsByComment: attachmentsByComment,
                      organizationId: organizationId,
                      canEdit: canEdit,
                      canDelete: canDelete,
                      onReply: onReply,
                      onEdit: onEdit,
                      onDelete: onDelete,
                      formatTime: formatTime,
                      replyToName: name,
                    ),
                  ),
              ],
            ),
          );

    if (depth == 0) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [content, repliesBlock],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        content,
        if (replies.isNotEmpty) repliesBlock,
      ],
    );
  }
}

/// Vertical rail + elbow so a reply reads as attached to its parent note.
class _ThreadedReplyRow extends StatelessWidget {
  const _ThreadedReplyRow({
    required this.child,
    required this.isLast,
    this.depth = 1,
  });

  final Widget child;
  final bool isLast;
  final int depth;

  static const _railWidth = 28.0;

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
                color: AppColors.border,
              ),
            ),
          ),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(
                bottom: isLast ? 0 : 10,
                left: depth > 2 ? 2.0 : 0,
              ),
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
      ..strokeWidth = 1.6
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    const avatarCenterY = 16.0;
    final x = size.width * 0.55;

    final stemEnd = isLast ? avatarCenterY : size.height;
    canvas.drawLine(Offset(x, 0), Offset(x, stemEnd), paint);
    canvas.drawLine(
      Offset(x, avatarCenterY),
      Offset(size.width - 1, avatarCenterY),
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
              size: compact ? 28 : 34,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (replyToName != null && replyToName!.trim().isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 3),
                      child: Text(
                        'Replying to $replyToName',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    ),
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style:
                              Theme.of(context).textTheme.labelLarge?.copyWith(
                                    fontWeight: FontWeight.w700,
                                  ),
                        ),
                      ),
                      if (relativeTime.isNotEmpty) ...[
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 6),
                          child: Text(
                            '·',
                            style: TextStyle(
                              color: AppColors.textMuted.withValues(alpha: 0.7),
                            ),
                          ),
                        ),
                        Text(
                          relativeTime,
                          style:
                              Theme.of(context).textTheme.labelSmall?.copyWith(
                                    color: AppColors.textMuted,
                                  ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            if (canEdit || canDelete || showReply)
              PopupMenuButton<String>(
                padding: EdgeInsets.zero,
                icon: Icon(
                  Icons.more_horiz_rounded,
                  color: AppColors.textMuted.withValues(alpha: 0.85),
                ),
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
        Padding(
          padding: EdgeInsets.only(left: compact ? 38 : 44, top: 6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                comment.body,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      height: 1.35,
                      color: AppColors.textPrimary,
                    ),
              ),
              if (attachments.isNotEmpty) ...[
                const SizedBox(height: 10),
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
              if (showReply) ...[
                const SizedBox(height: 8),
                TextButton.icon(
                  onPressed: onReply,
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    padding: EdgeInsets.zero,
                    minimumSize: const Size(0, 28),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    visualDensity: VisualDensity.compact,
                  ),
                  icon: const Icon(Icons.reply_rounded, size: 16),
                  label: const Text('Reply'),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
