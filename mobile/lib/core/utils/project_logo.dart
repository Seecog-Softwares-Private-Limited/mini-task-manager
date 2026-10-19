import 'package:flutter/painting.dart';
import 'package:image_picker/image_picker.dart';

import 'workspace_logo.dart';

/// Max logo size accepted for project create/edit (within the 5–10 MB guidance).
const int kProjectLogoMaxBytes = 10 * 1024 * 1024;

Future<String> pickProjectLogoDataUrl() async {
  final picker = ImagePicker();
  final file = await picker.pickImage(
    source: ImageSource.gallery,
    maxWidth: 1024,
    maxHeight: 1024,
    imageQuality: 88,
  );
  if (file == null) {
    throw const ProjectLogoException('No image selected');
  }

  final length = await file.length();
  if (length > kProjectLogoMaxBytes) {
    throw ProjectLogoException(
      'Image must be 10 MB or smaller (selected ${_formatMb(length)})',
    );
  }

  final bytes = await file.readAsBytes();
  if (bytes.lengthInBytes > kProjectLogoMaxBytes) {
    throw ProjectLogoException(
      'Image must be 10 MB or smaller (selected ${_formatMb(bytes.lengthInBytes)})',
    );
  }

  final mime = file.mimeType ?? 'image/jpeg';
  return bytesToDataUrl(bytes, mime);
}

String _formatMb(int bytes) {
  final mb = bytes / (1024 * 1024);
  return '${mb.toStringAsFixed(mb >= 10 ? 0 : 1)} MB';
}

class ProjectLogoException implements Exception {
  const ProjectLogoException(this.message);
  final String message;

  @override
  String toString() => message;
}

ImageProvider? projectLogoImageProvider(String? logo) {
  final value = logo?.trim();
  if (value == null || value.isEmpty) return null;
  if (value.startsWith('data:')) {
    final bytes = decodeDataUrlBytes(value);
    if (bytes == null || bytes.isEmpty) return null;
    return MemoryImage(bytes);
  }
  return NetworkImage(value);
}
