import 'dart:typed_data';

import 'package:dio/dio.dart';

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
    if (bytes != null && bytes!.isNotEmpty) {
      return MultipartFile.fromBytes(bytes!, filename: uploadName);
    }
    if (path != null && path!.isNotEmpty) {
      return MultipartFile.fromFile(path!, filename: uploadName);
    }
    throw StateError('Attachment has no file data');
  }
}
