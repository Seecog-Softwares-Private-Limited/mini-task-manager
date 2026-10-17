import 'dart:typed_data';

/// Image bytes read from the system clipboard.
class ClipboardImage {
  const ClipboardImage({
    required this.bytes,
    required this.mimeType,
    required this.fileName,
  });

  final Uint8List bytes;
  final String mimeType;
  final String fileName;
}

typedef ClipboardImageHandler = void Function(ClipboardImage image);

/// Reads / listens for clipboard images. Stub: unsupported on this platform.
class ClipboardImagePaste {
  ClipboardImagePaste._();

  static bool get isSupported => false;

  /// Attach a document-level paste listener. Returns a detach callback.
  static void Function() attach(ClipboardImageHandler onImage) => () {};

  static void detach() {}

  /// Explicit read (e.g. Paste button). Returns null when unsupported/empty.
  static Future<ClipboardImage?> readImage() async => null;
}
