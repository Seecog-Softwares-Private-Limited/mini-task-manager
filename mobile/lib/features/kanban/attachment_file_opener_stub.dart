import 'dart:typed_data';

Future<void> openAttachmentBytes({
  required Uint8List bytes,
  required String fileName,
  String? mimeType,
  bool download = false,
}) async {
  throw UnsupportedError('Opening attachments is only supported on web.');
}
