import 'dart:js_interop';
import 'dart:typed_data';

import 'package:web/web.dart' as web;

class BlobAudioData {
  const BlobAudioData({
    required this.bytes,
    required this.mimeType,
  });

  final Uint8List bytes;
  final String mimeType;
}

Future<Uint8List> fetchBlobUrlBytes(String url) async {
  final data = await fetchBlobUrlAudio(url);
  return data.bytes;
}

Future<BlobAudioData> fetchBlobUrlAudio(String url) async {
  final response = await web.window.fetch(url.toJS).toDart;
  final blob = await response.blob().toDart;
  final buffer = await blob.arrayBuffer().toDart;
  final mime = blob.type.trim().isEmpty ? 'audio/webm' : blob.type;
  // Copy bytes — views into transferable buffers can become empty later.
  final view = buffer.toDart.asUint8List();
  return BlobAudioData(
    bytes: Uint8List.fromList(view),
    mimeType: mime,
  );
}
