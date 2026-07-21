import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:http_parser/http_parser.dart';

import '../../core/utils/upload_file_name.dart';

class PendingAttachment {
  PendingAttachment({
    required this.clientId,
    required this.fileName,
    this.path,
    this.bytes,
    this.mimeType,
  });

  final String clientId;
  final String fileName;
  final String? path;
  final Uint8List? bytes;
  final String? mimeType;

  Future<MultipartFile> toMultipartFile() async {
    final uploadName = sanitizeUploadFileName(fileName, mimeType: mimeType);
    final contentType = _mediaType() ?? _mediaTypeFromFileName(uploadName);
    if (bytes != null && bytes!.isNotEmpty) {
      return MultipartFile.fromBytes(
        bytes!,
        filename: uploadName,
        contentType: contentType,
      );
    }
    if (path != null && path!.isNotEmpty) {
      return MultipartFile.fromFile(
        path!,
        filename: uploadName,
        contentType: contentType,
      );
    }
    throw StateError('Attachment has no file data');
  }

  MediaType? _mediaType() {
    final raw = mimeType?.trim();
    if (raw == null || raw.isEmpty) return null;
    final withoutParams = raw.split(';').first.trim();
    final parts = withoutParams.split('/');
    if (parts.length != 2 || parts[0].isEmpty || parts[1].isEmpty) return null;
    // Browsers sometimes label opus/webm as video/webm — treat as audio for notes.
    final type = parts[0].toLowerCase() == 'video' &&
            _audioExtensions.contains(parts[1].toLowerCase())
        ? 'audio'
        : parts[0].toLowerCase();
    return MediaType(type, parts[1].toLowerCase());
  }

  MediaType? _mediaTypeFromFileName(String name) {
    final ext = name.contains('.') ? name.split('.').last.toLowerCase() : '';
    return switch (ext) {
      'webm' => MediaType('audio', 'webm'),
      'm4a' || 'aac' => MediaType('audio', 'mp4'),
      'mp3' => MediaType('audio', 'mpeg'),
      'wav' => MediaType('audio', 'wav'),
      'ogg' => MediaType('audio', 'ogg'),
      'mp4' || 'mov' => MediaType('video', 'mp4'),
      'png' => MediaType('image', 'png'),
      'jpg' || 'jpeg' => MediaType('image', 'jpeg'),
      'gif' => MediaType('image', 'gif'),
      'webp' => MediaType('image', 'webp'),
      'pdf' => MediaType('application', 'pdf'),
      _ => null,
    };
  }

  static const _audioExtensions = {'webm', 'ogg', 'wav', 'mp3', 'm4a', 'aac'};
}
