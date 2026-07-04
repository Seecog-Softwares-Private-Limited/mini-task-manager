import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';
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

const _attachmentTileSize = 84.0;

class AttachmentGridEntry {
  const AttachmentGridEntry({
    required this.attachment,
    this.source = AttachmentSource.entity,
    this.index,
    this.onDelete,
  });

  final TaskAttachment attachment;
  final AttachmentSource source;
  final int? index;
  final VoidCallback? onDelete;
}

class AttachmentGrid extends ConsumerWidget {
  const AttachmentGrid({
    super.key,
    required this.items,
    required this.organizationId,
    this.enabled = true,
  });

  final List<AttachmentGridEntry> items;
  final String organizationId;
  final bool enabled;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (items.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '${items.length} ${items.length == 1 ? 'File' : 'Files'}',
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: AppColors.textMuted,
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: AppSpacing.sm),
        Wrap(
          spacing: AppSpacing.sm,
          runSpacing: AppSpacing.sm,
          children: items.map((entry) {
            return AttachmentGridTile(
              attachment: entry.attachment,
              organizationId: organizationId,
              source: entry.source,
              index: entry.index,
              enabled: enabled,
              onDelete: entry.onDelete,
            );
          }).toList(),
        ),
      ],
    );
  }
}

class AttachmentGridTile extends ConsumerWidget {
  const AttachmentGridTile({
    super.key,
    required this.attachment,
    required this.organizationId,
    this.source = AttachmentSource.entity,
    this.onDelete,
    this.enabled = true,
    this.index,
  });

  final TaskAttachment attachment;
  final String organizationId;
  final AttachmentSource source;
  final VoidCallback? onDelete;
  final bool enabled;
  final int? index;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final displayName = displayNameForAttachment(attachment, index: index);
    final preview = () => previewTaskAttachment(
          context: context,
          ref: ref,
          attachment: attachment,
          organizationId: organizationId,
          source: source,
        );

    return SizedBox(
      width: _attachmentTileSize,
      height: _attachmentTileSize,
      child: Material(
        color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.45),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: Theme.of(context).dividerColor.withValues(alpha: 0.45)),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: enabled ? preview : null,
          child: Stack(
            fit: StackFit.expand,
            children: [
              _AttachmentThumbnail(
                attachment: attachment,
                organizationId: organizationId,
                source: source,
                size: _attachmentTileSize,
                expand: true,
              ),
              if (onDelete != null)
                Positioned(
                  top: 4,
                  right: 4,
                  child: Material(
                    color: Colors.black.withValues(alpha: 0.55),
                    shape: const CircleBorder(),
                    clipBehavior: Clip.antiAlias,
                    child: InkWell(
                      onTap: enabled ? onDelete : null,
                      child: const Padding(
                        padding: EdgeInsets.all(4),
                        child: Icon(Icons.close_rounded, size: 14, color: Colors.white),
                      ),
                    ),
                  ),
                ),
              if (!isImageAttachment(attachment))
                Positioned(
                  left: 6,
                  right: 6,
                  bottom: 6,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.62),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      displayName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: Colors.white,
                            fontSize: 9,
                          ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AttachmentThumbnail extends ConsumerStatefulWidget {
  const _AttachmentThumbnail({
    required this.attachment,
    required this.organizationId,
    required this.source,
    this.size = 44,
    this.expand = false,
  });

  final TaskAttachment attachment;
  final String organizationId;
  final AttachmentSource source;
  final double size;
  final bool expand;

  @override
  ConsumerState<_AttachmentThumbnail> createState() => _AttachmentThumbnailState();
}

class _AttachmentThumbnailState extends ConsumerState<_AttachmentThumbnail> {
  Uint8List? _bytes;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    if (isImageAttachment(widget.attachment)) {
      _load();
    }
  }

  Future<void> _load() async {
    try {
      final orgId = widget.organizationId.trim().isNotEmpty
          ? widget.organizationId.trim()
          : (ref.read(sessionControllerProvider).orgId ?? '');
      if (orgId.isEmpty || widget.attachment.id.trim().isEmpty) return;
      final bytes = await ref.read(attachmentsRepositoryProvider).fetchAttachmentContent(
            attachmentId: widget.attachment.id,
            organizationId: orgId,
            source: widget.source,
          );
      if (!mounted) return;
      setState(() => _bytes = bytes);
    } catch (_) {
      if (mounted) setState(() => _failed = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final borderRadius = BorderRadius.circular(widget.expand ? 0 : 8);

    if (_bytes != null) {
      return ClipRRect(
        borderRadius: borderRadius,
        child: Image.memory(
          _bytes!,
          width: widget.expand ? double.infinity : widget.size,
          height: widget.expand ? double.infinity : widget.size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _iconFallback(context),
        ),
      );
    }
    return _iconFallback(context);
  }

  Widget _iconFallback(BuildContext context) {
    final borderRadius = BorderRadius.circular(widget.expand ? 0 : 8);
    return Container(
      width: widget.expand ? double.infinity : widget.size,
      height: widget.expand ? double.infinity : widget.size,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: borderRadius,
        border: widget.expand
            ? null
            : Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.4)),
      ),
      child: Icon(
        _failed ? Icons.broken_image_outlined : iconForAttachment(widget.attachment),
        size: widget.expand ? 28 : 22,
        color: AppColors.textMuted,
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
              fileName: displayNameForAttachment(widget.attachment),
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
