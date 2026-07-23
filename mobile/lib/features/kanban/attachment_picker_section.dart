import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/utils/client_id.dart';
import '../../data/models/pending_attachment.dart';
import '../../shared/voice_dictation/voice_note_recorder_sheet.dart';
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
    final camera = _ActionChip(
      icon: Icons.photo_camera_rounded,
      label: 'Camera',
      onTap: uploading || disabled
          ? null
          : () => _handle(AttachmentPickerUtils.capturePhoto),
    );
    final file = _ActionChip(
      icon: Icons.attach_file_rounded,
      label: 'File',
      onTap: uploading || disabled
          ? null
          : () => _handle(AttachmentPickerUtils.pickFile),
    );
    final gallery = _ActionChip(
      icon: Icons.photo_library_rounded,
      label: 'Gallery',
      onTap: uploading || disabled
          ? null
          : () => _handle(AttachmentPickerUtils.pickFromGallery),
    );
    final voice = _ActionChip(
      icon: Icons.mic_rounded,
      label: 'Voice',
      onTap: uploading || disabled
          ? null
          : () => _handle(() => showVoiceNoteRecorderSheet(context)),
    );

    final showGalleryChip = showGallery && !compact;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(child: camera),
            const SizedBox(width: 8),
            Expanded(child: file),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            if (showGalleryChip) ...[
              Expanded(child: gallery),
              const SizedBox(width: 8),
            ],
            Expanded(child: voice),
            if (!showGalleryChip) const Expanded(child: SizedBox.shrink()),
          ],
        ),
        if (uploading) ...[
          const SizedBox(height: 8),
          const Center(
            child: SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ),
        ],
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
        Row(
          children: [
            Expanded(
              child: _ActionChip(
                icon: Icons.photo_camera_rounded,
                label: 'Camera',
                onTap: disabled
                    ? null
                    : () => _addAttachment(AttachmentPickerUtils.capturePhoto),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _ActionChip(
                icon: Icons.attach_file_rounded,
                label: 'File',
                onTap: disabled
                    ? null
                    : () => _addAttachment(AttachmentPickerUtils.pickFile),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            if (!compact) ...[
              Expanded(
                child: _ActionChip(
                  icon: Icons.photo_library_rounded,
                  label: 'Gallery',
                  onTap: disabled
                      ? null
                      : () => _addAttachment(
                            AttachmentPickerUtils.pickFromGallery,
                          ),
                ),
              ),
              const SizedBox(width: 8),
            ],
            Expanded(
              child: _ActionChip(
                icon: Icons.mic_rounded,
                label: 'Voice',
                onTap: disabled
                    ? null
                    : () => _addAttachment(
                          () => showVoiceNoteRecorderSheet(context),
                        ),
              ),
            ),
            if (compact) const Expanded(child: SizedBox.shrink()),
          ],
        ),
        if (attachments.isNotEmpty) ...[
          const SizedBox(height: 10),
          ...attachments.map(
            (file) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: _AttachmentRow(
                fileName: file.fileName,
                mimeType: file.mimeType,
                onTap: disabled
                    ? null
                    : () {
                        final isAudio =
                            file.mimeType?.toLowerCase().startsWith('audio/') == true ||
                                file.fileName.toLowerCase().contains('voice-');
                        if (!isAudio || file.bytes == null) return;
                        showPendingVoiceNotePlayerDialog(
                          context,
                          attachment: file,
                          onRemove: () => _remove(file.clientId),
                          onReRecord: () async {
                            final without = attachments
                                .where((a) => a.clientId != file.clientId)
                                .toList();
                            onChanged(without);
                            final picked = await showVoiceNoteRecorderSheet(context);
                            if (picked == null) return;
                            onChanged([...without, picked]);
                          },
                        );
                      },
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
    return SizedBox(
      height: 40,
      width: double.infinity,
      child: OutlinedButton(
        onPressed: onTap,
        style: OutlinedButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          visualDensity: VisualDensity.compact,
          minimumSize: const Size(0, 40),
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(999),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18),
            const SizedBox(width: 6),
            Text(
              label,
              maxLines: 1,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}

class _AttachmentRow extends StatelessWidget {
  const _AttachmentRow({
    required this.fileName,
    required this.onRemove,
    this.mimeType,
    this.onTap,
  });

  final String fileName;
  final String? mimeType;
  final VoidCallback? onRemove;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final isAudio = mimeType?.toLowerCase().startsWith('audio/') == true ||
        fileName.toLowerCase().endsWith('.m4a') ||
        fileName.toLowerCase().endsWith('.mp3') ||
        fileName.toLowerCase().endsWith('.aac') ||
        fileName.toLowerCase().endsWith('.wav') ||
        fileName.toLowerCase().endsWith('.ogg') ||
        fileName.toLowerCase().startsWith('voice-');

    return Material(
      color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.35),
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: isAudio ? onTap : null,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.5)),
          ),
          child: Row(
            children: [
              Icon(
                isAudio ? Icons.play_circle_filled_rounded : Icons.insert_drive_file_rounded,
                size: 18,
                color: isAudio ? Theme.of(context).colorScheme.primary : null,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  isAudio ? 'Voice note — tap to play' : fileName,
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
        ),
      ),
    );
  }
}
