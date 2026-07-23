import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/pending_attachment.dart';
import '../../data/models/task.dart';
import '../../data/models/task_attachment.dart';
import '../kanban/attachment_picker_section.dart';
import '../kanban/attachment_preview.dart';
import '../kanban/kanban_providers.dart';

/// Result of the planner checklist "Add note" sheet.
class SubtaskNoteSheetResult {
  const SubtaskNoteSheetResult({required this.note});

  /// Trimmed note text (empty string means clear).
  final String note;
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
        child: SubtaskNoteSheet(
          subtask: subtask,
          taskId: taskId,
          organizationId: organizationId,
        ),
      );
    },
  );
}

class SubtaskNoteSheet extends ConsumerStatefulWidget {
  const SubtaskNoteSheet({
    super.key,
    required this.subtask,
    required this.taskId,
    required this.organizationId,
  });

  final TaskSubtask subtask;
  final String taskId;
  final String organizationId;

  @override
  ConsumerState<SubtaskNoteSheet> createState() => _SubtaskNoteSheetState();
}

class _SubtaskNoteSheetState extends ConsumerState<SubtaskNoteSheet> {
  late final TextEditingController _noteController;
  List<TaskAttachment> _attachments = const [];
  bool _loadingAttachments = true;
  bool _uploading = false;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _noteController = TextEditingController(text: widget.subtask.note ?? '');
    _loadAttachments();
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _loadAttachments() async {
    final subtaskId = widget.subtask.id.trim();
    if (subtaskId.isEmpty) {
      setState(() {
        _loadingAttachments = false;
        _attachments = const [];
      });
      return;
    }
    setState(() {
      _loadingAttachments = true;
      _error = null;
    });
    try {
      final items =
          await ref.read(attachmentsRepositoryProvider).fetchEntityAttachments(
                entityType: 'SUBTASK',
                entityId: subtaskId,
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
        _error = e.message;
        _loadingAttachments = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loadingAttachments = false;
      });
    }
  }

  Future<void> _pickAndUpload(
    Future<PendingAttachment?> Function() pick,
  ) async {
    final subtaskId = widget.subtask.id.trim();
    if (subtaskId.isEmpty) {
      setState(() => _error = 'Save the checklist item before adding files.');
      return;
    }
    setState(() {
      _uploading = true;
      _error = null;
    });
    try {
      final file = await pick();
      if (file == null) return;
      await ref.read(attachmentsRepositoryProvider).uploadSubtaskAttachment(
            subtaskId: subtaskId,
            taskId: widget.taskId,
            organizationId: widget.organizationId,
            file: file,
          );
      await _loadAttachments();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _deleteAttachment(String attachmentId) async {
    setState(() => _error = null);
    try {
      await ref.read(attachmentsRepositoryProvider).deleteAttachment(
            attachmentId: attachmentId,
            organizationId: widget.organizationId,
          );
      if (!mounted) return;
      setState(() {
        _attachments =
            _attachments.where((item) => item.id != attachmentId).toList();
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  void _save() {
    if (_saving) return;
    setState(() => _saving = true);
    Navigator.of(context).pop(
      SubtaskNoteSheetResult(note: _noteController.text.trim()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final hasNote = (widget.subtask.note?.trim().isNotEmpty ?? false);
    final title = widget.subtask.title.trim().isEmpty
        ? 'Checklist item'
        : widget.subtask.title.trim();

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.sm,
        AppSpacing.lg,
        AppSpacing.lg,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            hasNote ? 'Edit note' : 'Add note',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.textMuted,
                ),
          ),
          const SizedBox(height: AppSpacing.md),
          TextField(
            controller: _noteController,
            autofocus: true,
            minLines: 4,
            maxLines: 8,
            maxLength: 2000,
            decoration: InputDecoration(
              hintText: 'Why was this done / not done today?',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'ATTACHMENTS',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  letterSpacing: 1.2,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textMuted,
                ),
          ),
          const SizedBox(height: AppSpacing.sm),
          AttachmentUploadActions(
            disabled: _saving,
            uploading: _uploading,
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
                'No attachments yet — add from Camera, Gallery, File, or Voice.',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.textMuted,
                    ),
              ),
            )
          else
            AttachmentGrid(
              organizationId: widget.organizationId,
              enabled: !_saving,
              items: _attachments.asMap().entries.map(
                (entry) => AttachmentGridEntry(
                  attachment: entry.value,
                  index: entry.key + 1,
                  onDelete: () => _deleteAttachment(entry.value.id),
                ),
              ).toList(),
            ),
          if (_error != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(_error!, style: const TextStyle(color: AppColors.danger)),
          ],
          const SizedBox(height: AppSpacing.lg),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed:
                      _saving ? null : () => Navigator.of(context).pop(),
                  child: const Text('Cancel'),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: FilledButton(
                  onPressed: _saving ? null : _save,
                  child: Text(hasNote ? 'Save note' : 'Add note'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
