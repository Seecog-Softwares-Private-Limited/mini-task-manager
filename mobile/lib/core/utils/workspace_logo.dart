import 'dart:convert';
import 'dart:typed_data';

import 'package:image_picker/image_picker.dart';

const int kWorkspaceLogoMaxBytes = 100 * 1024;

String workspaceInitials(String? name) {
  final trimmed = (name ?? '').trim();
  if (trimmed.isEmpty) return '—';
  final parts = trimmed.split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
  if (parts.length >= 2) {
    return '${parts.first[0]}${parts[1][0]}'.toUpperCase();
  }
  return trimmed.substring(0, trimmed.length >= 2 ? 2 : 1).toUpperCase();
}

Uint8List? decodeDataUrlBytes(String dataUrl) {
  final comma = dataUrl.indexOf(',');
  if (comma < 0) return null;
  final meta = dataUrl.substring(0, comma);
  final payload = dataUrl.substring(comma + 1);
  if (meta.contains(';base64')) {
    try {
      return base64Decode(payload);
    } catch (_) {
      return null;
    }
  }
  try {
    return Uint8List.fromList(Uri.decodeComponent(payload).codeUnits);
  } catch (_) {
    return null;
  }
}

String bytesToDataUrl(Uint8List bytes, String mimeType) {
  return 'data:$mimeType;base64,${base64Encode(bytes)}';
}

Future<String> pickWorkspaceLogoDataUrl() async {
  final picker = ImagePicker();
  final file = await picker.pickImage(
    source: ImageSource.gallery,
    maxWidth: 320,
    maxHeight: 320,
    imageQuality: 82,
  );
  if (file == null) {
    throw const WorkspaceLogoException('No image selected');
  }

  final bytes = await file.readAsBytes();
  if (bytes.length > kWorkspaceLogoMaxBytes) {
    throw WorkspaceLogoException(
      'Image must be ${kWorkspaceLogoMaxBytes ~/ 1024}KB or smaller (selected ${(bytes.length / 1024).ceil()}KB)',
    );
  }

  final mime = file.mimeType ?? 'image/jpeg';
  return bytesToDataUrl(bytes, mime);
}

class WorkspaceLogoException implements Exception {
  const WorkspaceLogoException(this.message);
  final String message;

  @override
  String toString() => message;
}
