import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/foundation.dart';
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
import 'voice_note_player.dart';
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
          preferPreview: isImageAttachment(attachment),
        );
    await openAttachmentBytes(
      bytes: bytes,
      fileName: attachment.fileName,
      mimeType: resolveAttachmentMimeType(attachment),
      download: true,
    );
  } on ApiException catch (e) {
    messenger?.showSnackBar(SnackBar(content: Text(e.message)));
  } on UnsupportedError catch (e) {
    messenger?.showSnackBar(
      SnackBar(content: Text(e.message ?? 'Could not open attachment.')),
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
              key: ValueKey(entry.attachment.id),
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
  bool _loading = false;
  bool _failed = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    if (isImageAttachment(widget.attachment)) {
      _loading = true;
      _load();
    }
  }

  @override
  void didUpdateWidget(covariant _AttachmentThumbnail oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.attachment.id != widget.attachment.id ||
        oldWidget.organizationId != widget.organizationId) {
      _bytes = null;
      _failed = false;
      _errorMessage = null;
      if (isImageAttachment(widget.attachment)) {
        _loading = true;
        _load();
      } else {
        _loading = false;
      }
    }
  }

  Future<void> _load() async {
    try {
      final orgId = widget.organizationId.trim().isNotEmpty
          ? widget.organizationId.trim()
          : (ref.read(sessionControllerProvider).orgId ?? '');
      if (orgId.isEmpty || widget.attachment.id.trim().isEmpty) {
        if (mounted) {
          setState(() {
            _failed = true;
            _loading = false;
            _errorMessage = orgId.isEmpty
                ? 'Workspace missing'
                : 'Invalid attachment';
          });
        }
        return;
      }
      final bytes = await ref.read(attachmentsRepositoryProvider).fetchAttachmentContent(
            attachmentId: widget.attachment.id,
            organizationId: orgId,
            source: widget.source,
            preferPreview: true,
          );
      if (!mounted) return;
      // Prefer showing whatever the server returned when MIME says image.
      // Magic-byte rejection hid valid screenshots (and some web byte shapes).
      final mimeSaysImage = isImageAttachment(widget.attachment);
      if (!mimeSaysImage && !_looksLikeImageBytes(bytes)) {
        setState(() {
          _failed = true;
          _loading = false;
          _bytes = null;
          _errorMessage = 'Not an image';
        });
        return;
      }
      setState(() {
        _bytes = bytes;
        _failed = false;
        _loading = false;
        _errorMessage = null;
      });
    } catch (error) {
      debugPrint(
        'Attachment thumbnail failed id=${widget.attachment.id} '
        'name=${widget.attachment.fileName}: $error',
      );
      if (mounted) {
        setState(() {
          _failed = true;
          _loading = false;
          _bytes = null;
          _errorMessage = error is ApiException
              ? error.message
              : 'Could not load image';
        });
      }
    }
  }

  bool _looksLikeImageBytes(Uint8List bytes) {
    if (bytes.length < 12) return false;
    // PNG
    if (bytes[0] == 0x89 &&
        bytes[1] == 0x50 &&
        bytes[2] == 0x4E &&
        bytes[3] == 0x47) {
      return true;
    }
    // JPEG
    if (bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF) {
      return true;
    }
    // GIF
    if (bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46) {
      return true;
    }
    // BMP
    if (bytes[0] == 0x42 && bytes[1] == 0x4D) return true;
    // WEBP (RIFF....WEBP)
    if (bytes[0] == 0x52 &&
        bytes[1] == 0x49 &&
        bytes[2] == 0x46 &&
        bytes[3] == 0x46 &&
        bytes[8] == 0x57 &&
        bytes[9] == 0x45 &&
        bytes[10] == 0x42 &&
        bytes[11] == 0x50) {
      return true;
    }
    return false;
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
          gaplessPlayback: true,
          errorBuilder: (_, __, ___) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted && !_failed) {
                setState(() {
                  _failed = true;
                  _bytes = null;
                });
              }
            });
            return _iconFallback(context);
          },
        ),
      );
    }
    if (_loading && !_failed) {
      return Container(
        width: widget.expand ? double.infinity : widget.size,
        height: widget.expand ? double.infinity : widget.size,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: borderRadius,
        ),
        child: const SizedBox(
          width: 18,
          height: 18,
          child: CircularProgressIndicator(strokeWidth: 2),
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
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            _failed ? Icons.broken_image_outlined : iconForAttachment(widget.attachment),
            size: widget.expand ? 28 : 22,
            color: AppColors.textMuted,
          ),
          if (_failed && widget.expand) ...[
            const SizedBox(height: 6),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Text(
                _errorMessage?.trim().isNotEmpty == true
                    ? _errorMessage!
                    : 'Tap to open',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: AppColors.textMuted,
                      fontSize: 9,
                    ),
              ),
            ),
          ],
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
        preferPreview: _kind == AttachmentPreviewKind.image,
      );

      if (!mounted) return;
      switch (_kind) {
        case AttachmentPreviewKind.image:
          if (isSvgMime(_mimeType, widget.attachment.fileName)) {
            if (kIsWeb) {
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
          } else {
            setState(() {
              _bytes = bytes;
              _loading = false;
            });
          }
        case AttachmentPreviewKind.pdf:
          if (kIsWeb) {
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
          } else {
            setState(() {
              _bytes = bytes;
              _loading = false;
            });
          }
        case AttachmentPreviewKind.text:
          setState(() {
            _textContent = _decodeText(bytes);
            _loading = false;
          });
        case AttachmentPreviewKind.audio:
          setState(() {
            _bytes = bytes;
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
    if (_kind == AttachmentPreviewKind.audio && _bytes != null) {
      return Center(
        child: VoiceNotePlayer(
          bytes: _bytes!,
          mimeType: _mimeType,
          fileName: widget.attachment.fileName,
        ),
      );
    }

    if (_kind == AttachmentPreviewKind.text && _textContent != null) {
      return _TextPreviewBody(content: _textContent!);
    }

    if (_bytes != null && _kind == AttachmentPreviewKind.pdf) {
      return buildPdfBytesPreview(bytes: _bytes!, height: previewHeight);
    }

    if (_bytes != null &&
        _kind == AttachmentPreviewKind.image &&
        isSvgMime(_mimeType, widget.attachment.fileName)) {
      return buildSvgBytesPreview(bytes: _bytes!, height: previewHeight);
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
