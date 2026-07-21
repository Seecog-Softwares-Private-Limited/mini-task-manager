import 'dart:typed_data';

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

Future<BlobAudioData> fetchBlobUrlAudio(String url) {
  throw UnsupportedError('fetchBlobUrlAudio is only supported on web.');
}
