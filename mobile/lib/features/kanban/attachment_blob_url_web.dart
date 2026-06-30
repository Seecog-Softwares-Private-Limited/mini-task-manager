import 'dart:js_interop';
import 'dart:typed_data';

import 'package:web/web.dart' as web;

String? createAttachmentBlobUrl(Uint8List bytes, String mimeType) {
  final blobParts = <web.BlobPart>[bytes.toJS].toJS;
  final blob = web.Blob(
    blobParts,
    web.BlobPropertyBag(type: mimeType),
  );
  return web.URL.createObjectURL(blob);
}

void revokeAttachmentBlobUrl(String? url) {
  if (url == null || url.isEmpty) return;
  web.URL.revokeObjectURL(url);
}
