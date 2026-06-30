import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/task_attachment.dart';
import '../../data/repositories/attachments_repository.dart';
import 'attachment_blob_url.dart';
import 'attachment_file_meta.dart';
import 'attachment_file_opener.dart';
import 'attachment_preview_view.dart';
import 'kanban_providers.dart';
import '../auth/session_controller.dart';

Future<void> previewTaskAttachment({
  required BuildContext context,
  required WidgetRef ref,
  required TaskAttachment attachment,
  required String organizationId,
  AttachmentSource source = AttachmentSource.entity,
}) async {
  await showDialog<void>(
    context: context,
    barrierColor: Colors.black87,
    builder: (dialogContext) => _AttachmentPreviewDialog(
      attachment: attachment,
      organizationId: organizationId,
      source: source,
      onDownload: () => _downloadAttachment(
        context: dialogContext,
        ref: ref,
        attachment: attachment,
        organizationId: organizationId,
        source: source,
      ),
    ),
  );
}

Future<void> _downloadAttachment({
  required BuildContext context,
  required WidgetRef ref,
  required TaskAttachment attachment,
  required String organizationId,
  AttachmentSource source = AttachmentSource.entity,
}) async {
  final messenger = ScaffoldMessenger.maybeOf(context);
  try {
    final orgId = organizationId.trim().isNotEmpty
        ? organizationId.trim()
        : (ref.read(sessionControllerProvider).orgId ?? '');
    if (orgId.isEmpty) {
      throw const ApiException(
        message: 'Organization context required. Select a workspace and try again.',
      );
    }
    final bytes = await ref.read(attachmentsRepositoryProvider).fetchAttachmentContent(
          attachmentId: attachment.id,
          organizationId: orgId,
          source: source,
        );
    await openAttachmentBytes(
      bytes: bytes,
      fileName: attachment.fileName,
      mimeType: resolveAttachmentMimeType(attachment),
      download: true,
    );
  } on ApiException catch (e) {
    messenger?.showSnackBar(SnackBar(content: Text(e.message)));
  } on UnsupportedError {
    messenger?.showSnackBar(
      const SnackBar(content: Text('Open the app in a browser to download attachments.')),
    );
  }
}

class AttachmentListTile extends ConsumerWidget {
  const AttachmentListTile({
    super.key,
    required this.attachment,
    required this.organizationId,
    this.source = AttachmentSource.entity,
    this.onDelete,
    this.enabled = true,
  });

  final TaskAttachment attachment;
  final String organizationId;
  final AttachmentSource source;
  final VoidCallback? onDelete;
  final bool enabled;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(iconForAttachment(attachment)),
      title: Text(
        attachment.fileName,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: attachment.fileSizeBytes == null
          ? null
          : Text(formatFileSize(attachment.fileSizeBytes!)),
      onTap: enabled
          ? () => previewTaskAttachment(
                context: context,
                ref: ref,
                attachment: attachment,
                organizationId: organizationId,
                source: source,
              )
          : null,
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            icon: const Icon(Icons.visibility_outlined),
            tooltip: 'Preview',
            onPressed: enabled
                ? () => previewTaskAttachment(
                      context: context,
                      ref: ref,
                      attachment: attachment,
                      organizationId: organizationId,
                      source: source,
                    )
                : null,
          ),
          if (onDelete != null)
            IconButton(
              icon: const Icon(Icons.delete_outline_rounded),
              tooltip: 'Delete',
              onPressed: enabled ? onDelete : null,
            ),
        ],
      ),
    );
  }
}

class _AttachmentPreviewDialog extends ConsumerStatefulWidget {
  const _AttachmentPreviewDialog({
    required this.attachment,
    required this.organizationId,
    required this.source,
    required this.onDownload,
  });

  final TaskAttachment attachment;
  final String organizationId;
  final AttachmentSource source;
  final VoidCallback onDownload;

  @override
  ConsumerState<_AttachmentPreviewDialog> createState() =>
      _AttachmentPreviewDialogState();
}

class _AttachmentPreviewDialogState extends ConsumerState<_AttachmentPreviewDialog> {
  bool _loading = true;
  String? _error;
  Uint8List? _bytes;
  String? _blobUrl;
  String? _textContent;
  late final AttachmentPreviewKind _kind;
  late final String _mimeType;

  @override
  void initState() {
    super.initState();
    _kind = previewKindFor(widget.attachment);
    _mimeType = resolveAttachmentMimeType(widget.attachment);
    _load();
  }

  @override
  void dispose() {
    revokeAttachmentBlobUrl(_blobUrl);
    super.dispose();
  }

  Future<void> _load() async {
    if (_kind == AttachmentPreviewKind.unsupported) {
      if (!mounted) return;
      setState(() => _loading = false);
      return;
    }

    final repo = ref.read(attachmentsRepositoryProvider);
    try {
      if (widget.attachment.id.trim().isEmpty) {
        throw const ApiException(message: 'Attachment is missing an id.');
      }
      final orgId = widget.organizationId.trim().isNotEmpty
          ? widget.organizationId.trim()
          : (ref.read(sessionControllerProvider).orgId ?? '');
      if (orgId.isEmpty) {
        throw const ApiException(
          message: 'Organization context required. Select a workspace and try again.',
        );
      }

      final bytes = await repo.fetchAttachmentContent(
        attachmentId: widget.attachment.id,
        organizationId: orgId,
        source: widget.source,
      );

      if (!mounted) return;
      switch (_kind) {
        case AttachmentPreviewKind.image:
          if (isSvgMime(_mimeType, widget.attachment.fileName)) {
            final url = createAttachmentBlobUrl(bytes, _mimeType);
            if (url == null) {
              setState(() {
                _error = 'SVG preview is available in the browser app.';
                _loading = false;
              });
              return;
            }
            setState(() {
              _blobUrl = url;
              _loading = false;
            });
          } else {
            setState(() {
              _bytes = bytes;
              _loading = false;
            });
          }
        case AttachmentPreviewKind.pdf:
          final url = createAttachmentBlobUrl(bytes, 'application/pdf');
          if (url == null) {
            setState(() {
              _error = 'PDF preview is available in the browser app.';
              _loading = false;
            });
            return;
          }
          setState(() {
            _blobUrl = url;
            _loading = false;
          });
        case AttachmentPreviewKind.text:
          setState(() {
            _textContent = _decodeText(bytes);
            _loading = false;
          });
        case AttachmentPreviewKind.unsupported:
          setState(() => _loading = false);
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  String _decodeText(Uint8List bytes) {
    try {
      return utf8.decode(bytes);
    } catch (_) {
      return latin1.decode(bytes, allowInvalid: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.of(context).size.height;
    final previewHeight = screenHeight * 0.72;

    return Dialog(
      insetPadding: const EdgeInsets.all(AppSpacing.md),
      backgroundColor: const Color(0xFF111111),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: 960,
          maxHeight: screenHeight * 0.9,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _PreviewHeader(
              fileName: widget.attachment.fileName,
              onDownload: widget.onDownload,
              onClose: () => Navigator.of(context).pop(),
            ),
            Flexible(
              child: _loading
                  ? const SizedBox(
                      height: 240,
                      child: Center(child: CircularProgressIndicator()),
                    )
                  : _error != null
                      ? _UnsupportedBody(
                          message: _error!,
                          onDownload: widget.onDownload,
                        )
                      : _kind == AttachmentPreviewKind.unsupported
                          ? _UnsupportedBody(
                              message:
                                  'Preview is not available for this file type.',
                              onDownload: widget.onDownload,
                            )
                          : _buildPreviewBody(previewHeight),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPreviewBody(double previewHeight) {
    if (_kind == AttachmentPreviewKind.text && _textContent != null) {
      return _TextPreviewBody(content: _textContent!);
    }

    if (_blobUrl != null) {
      return buildBlobUrlPreview(
        blobUrl: _blobUrl!,
        mimeType: _mimeType,
        fileName: widget.attachment.fileName,
        height: previewHeight,
      );
    }

    if (_bytes != null) {
      return SizedBox(
        height: previewHeight,
        child: InteractiveViewer(
          minScale: 0.5,
          maxScale: 4,
          child: Center(
            child: Image.memory(
              _bytes!,
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) {
                return _UnsupportedBody(
                  message: 'Could not display this image.',
                  onDownload: widget.onDownload,
                );
              },
            ),
          ),
        ),
      );
    }

    return _UnsupportedBody(
      message: 'Preview is not available for this file.',
      onDownload: widget.onDownload,
    );
  }
}

class _PreviewHeader extends StatelessWidget {
  const _PreviewHeader({
    required this.fileName,
    required this.onDownload,
    required this.onClose,
  });

  final String fileName;
  final VoidCallback onDownload;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.md,
        AppSpacing.sm,
        AppSpacing.sm,
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              fileName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
            ),
          ),
          IconButton(
            onPressed: onDownload,
            icon: const Icon(Icons.download_rounded, color: Colors.white),
            tooltip: 'Download',
          ),
          IconButton(
            onPressed: onClose,
            icon: const Icon(Icons.close_rounded, color: Colors.white),
            tooltip: 'Close',
          ),
        ],
      ),
    );
  }
}

class _TextPreviewBody extends StatelessWidget {
  const _TextPreviewBody({required this.content});

  final String content;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: const Color(0xFF1A1A1A),
      child: Scrollbar(
        thumbVisibility: true,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: SelectableText(
            content,
            style: const TextStyle(
              color: Colors.white,
              fontFamily: 'monospace',
              fontSize: 13,
              height: 1.5,
            ),
          ),
        ),
      ),
    );
  }
}

class _UnsupportedBody extends StatelessWidget {
  const _UnsupportedBody({
    required this.message,
    required this.onDownload,
  });

  final String message;
  final VoidCallback onDownload;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.insert_drive_file_outlined, color: Colors.white70, size: 48),
          const SizedBox(height: AppSpacing.md),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.white70),
          ),
          const SizedBox(height: AppSpacing.md),
          OutlinedButton.icon(
            onPressed: onDownload,
            icon: const Icon(Icons.download_rounded),
            label: const Text('Download file'),
            style: OutlinedButton.styleFrom(foregroundColor: Colors.white),
          ),
        ],
      ),
    );
  }
}
