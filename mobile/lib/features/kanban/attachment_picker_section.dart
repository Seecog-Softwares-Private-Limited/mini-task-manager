import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/utils/client_id.dart';
import '../../data/models/pending_attachment.dart';
import 'attachment_file_meta.dart';

class AttachmentPickerUtils {
  static Future<PendingAttachment?> pickFile() async {
    final result = await FilePicker.platform.pickFiles(withData: true);
    if (result == null || result.files.isEmpty) return null;

    final file = result.files.first;
    if (file.name.isEmpty) return null;

    // On web, accessing file.path throws UnsupportedError.
    // Safely attempt to read it; fall back to null (bytes will be used).
    String? filePath;
    try {
      filePath = file.path;
    } catch (_) {
      filePath = null;
    }

    return PendingAttachment(
      clientId: generateClientId(),
      fileName: file.name,
      path: filePath,
      bytes: file.bytes,
      mimeType: file.extension,
    );
  }

  static Future<PendingAttachment?> capturePhoto() async {
    final picker = ImagePicker();
    final photo = await picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 85,
    );
    if (photo == null) return null;
    return _fromXFile(photo);
  }

  static Future<PendingAttachment?> pickFromGallery() async {
    final picker = ImagePicker();
    final photo = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
    );
    if (photo == null) return null;
    return _fromXFile(photo);
  }

  static Future<PendingAttachment?> captureVideo({
    Duration maxDuration = const Duration(seconds: 30),
  }) async {
    final picker = ImagePicker();
    final video = await picker.pickVideo(
      source: ImageSource.camera,
      maxDuration: maxDuration,
    );
    if (video == null) return null;
    final bytes = await video.readAsBytes();
    var fileName = sanitizeUploadFileName(
      video.name.trim(),
      mimeType: video.mimeType ?? 'video/mp4',
    );
    return PendingAttachment(
      clientId: generateClientId(),
      fileName: fileName,
      bytes: bytes,
      mimeType: video.mimeType ?? 'video/mp4',
    );
  }

  static Future<PendingAttachment> _fromXFile(XFile file) async {
    final bytes = await file.readAsBytes();
    final fileName = sanitizeUploadFileName(
      file.name,
      mimeType: file.mimeType ?? 'image/jpeg',
    );
    return PendingAttachment(
      clientId: generateClientId(),
      fileName: fileName,
      bytes: bytes,
      mimeType: file.mimeType ?? 'image/jpeg',
    );
  }
}

class AttachmentUploadActions extends StatelessWidget {
  const AttachmentUploadActions({
    super.key,
    required this.disabled,
    required this.uploading,
    required this.onPickAndUpload,
    this.showGallery = true,
    this.compact = false,
  });

  final bool disabled;
  final bool uploading;
  final Future<void> Function(Future<PendingAttachment?> Function() pick) onPickAndUpload;
  final bool showGallery;
  final bool compact;

  Future<void> _handle(Future<PendingAttachment?> Function() pick) async {
    if (disabled || uploading) return;
    await onPickAndUpload(pick);
  }

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        _ActionChip(
          icon: Icons.photo_camera_rounded,
          label: 'Camera',
          onTap: uploading || disabled
              ? null
              : () => _handle(AttachmentPickerUtils.capturePhoto),
        ),
        _ActionChip(
          icon: Icons.attach_file_rounded,
          label: 'File',
          onTap: uploading || disabled
              ? null
              : () => _handle(AttachmentPickerUtils.pickFile),
        ),
        if (showGallery && !compact)
          _ActionChip(
            icon: Icons.photo_library_rounded,
            label: 'Gallery',
            onTap: uploading || disabled
                ? null
                : () => _handle(AttachmentPickerUtils.pickFromGallery),
          ),
        if (uploading)
          const SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
      ],
    );
  }
}

class AttachmentPickerSection extends StatelessWidget {
  const AttachmentPickerSection({
    super.key,
    required this.attachments,
    required this.onChanged,
    this.disabled = false,
    this.compact = false,
  });

  final List<PendingAttachment> attachments;
  final ValueChanged<List<PendingAttachment>> onChanged;
  final bool disabled;
  final bool compact;

  Future<void> _addAttachment(Future<PendingAttachment?> Function() pick) async {
    if (disabled) return;
    final picked = await pick();
    if (picked == null) return;
    onChanged([...attachments, picked]);
  }

  void _remove(String clientId) {
    onChanged(attachments.where((item) => item.clientId != clientId).toList());
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _ActionChip(
              icon: Icons.attach_file_rounded,
              label: 'File',
              onTap: disabled ? null : () => _addAttachment(AttachmentPickerUtils.pickFile),
            ),
            _ActionChip(
              icon: Icons.photo_camera_rounded,
              label: 'Camera',
              onTap: disabled ? null : () => _addAttachment(AttachmentPickerUtils.capturePhoto),
            ),
            if (!compact)
              _ActionChip(
                icon: Icons.photo_library_rounded,
                label: 'Gallery',
                onTap: disabled ? null : () => _addAttachment(AttachmentPickerUtils.pickFromGallery),
              ),
          ],
        ),
        if (attachments.isNotEmpty) ...[
          const SizedBox(height: 10),
          ...attachments.map(
            (file) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: _AttachmentRow(
                fileName: file.fileName,
                onRemove: disabled ? null : () => _remove(file.clientId),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _ActionChip extends StatelessWidget {
  const _ActionChip({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      avatar: Icon(icon, size: 16),
      label: Text(label),
      onPressed: onTap,
      visualDensity: VisualDensity.compact,
    );
  }
}

class _AttachmentRow extends StatelessWidget {
  const _AttachmentRow({
    required this.fileName,
    required this.onRemove,
  });

  final String fileName;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.5)),
      ),
      child: Row(
        children: [
          const Icon(Icons.insert_drive_file_rounded, size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              fileName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
          if (onRemove != null)
            IconButton(
              visualDensity: VisualDensity.compact,
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
              icon: const Icon(Icons.close_rounded, size: 18),
              onPressed: onRemove,
            ),
        ],
      ),
    );
  }
}
