import 'dart:async';
import 'dart:js_interop';
import 'dart:typed_data';

import 'package:intl/intl.dart';
import 'package:web/web.dart' as web;

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

const _maxBytes = 10 * 1024 * 1024;

const _allowedTypes = {
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/bmp',
};

/// Web clipboard image paste via capture-phase `paste` + Clipboard API read.
class ClipboardImagePaste {
  ClipboardImagePaste._();

  static bool get isSupported => true;

  static web.EventListener? _handler;
  static final Set<ClipboardImageHandler> _handlers = {};

  /// Attach a capture-phase paste listener. Returns a detach callback.
  ///
  /// Multiple callers can attach; each receives the image and should no-op if
  /// their field is not focused.
  static void Function() attach(ClipboardImageHandler onImage) {
    _handlers.add(onImage);
    _ensureListening();
    return () {
      _handlers.remove(onImage);
      if (_handlers.isEmpty) {
        _removeListening();
      }
    };
  }

  static void detach() {
    _handlers.clear();
    _removeListening();
  }

  static void _ensureListening() {
    if (_handler != null) return;
    final web.EventListener listener = (web.Event event) {
      if (_handlers.isEmpty) return;
      final clipboardEvent = event as web.ClipboardEvent;
      final data = clipboardEvent.clipboardData;
      if (data == null) return;
      final file = _firstImageFile(data);
      if (file == null) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      unawaited(_emitFromFile(file));
    }.toJS;

    _handler = listener;
    // Capture on both — Flutter web's editing host can swallow bubbled paste.
    web.window.addEventListener('paste', listener, true.toJS);
    web.document.addEventListener('paste', listener, true.toJS);
  }

  static void _removeListening() {
    final handler = _handler;
    if (handler == null) return;
    web.window.removeEventListener('paste', handler, true.toJS);
    web.document.removeEventListener('paste', handler, true.toJS);
    _handler = null;
  }

  /// Explicit read for a Paste chip (requires secure context + permission).
  static Future<ClipboardImage?> readImage() async {
    try {
      final clipboard = web.window.navigator.clipboard;
      final items = (await clipboard.read().toDart).toDart;
      for (final item in items) {
        final types = item.types.toDart;
        for (final typeJs in types) {
          final type = typeJs.toDart.toLowerCase();
          if (!_isAllowedImageType(type)) continue;
          final blob = await item.getType(type).toDart;
          final buffer = await blob.arrayBuffer().toDart;
          final bytes = Uint8List.fromList(buffer.toDart.asUint8List());
          if (bytes.isEmpty || bytes.length > _maxBytes) return null;
          final mime = blob.type.trim().isEmpty ? type : blob.type;
          return ClipboardImage(
            bytes: bytes,
            mimeType: mime,
            fileName: _screenshotFileName(mime),
          );
        }
      }
    } catch (_) {
      return null;
    }
    return null;
  }

  static web.File? _firstImageFile(web.DataTransfer data) {
    final items = data.items;
    for (var i = 0; i < items.length; i++) {
      final item = items[i];
      if (item.kind != 'file') continue;
      final type = item.type.toLowerCase();
      // Some browsers leave type empty for screenshots; still try getAsFile.
      if (type.isNotEmpty && !type.startsWith('image/')) continue;
      if (type.isNotEmpty && !_isAllowedImageType(type)) continue;
      final file = item.getAsFile();
      if (file != null) return file;
    }

    final files = data.files;
    for (var i = 0; i < files.length; i++) {
      final file = files.item(i);
      if (file == null) continue;
      final type = file.type.toLowerCase();
      if (type.isNotEmpty && !_isAllowedImageType(type)) continue;
      if (type.isEmpty && !_looksLikeImageName(file.name)) continue;
      return file;
    }
    return null;
  }

  static bool _isAllowedImageType(String type) {
    final normalized = type.toLowerCase();
    if (_allowedTypes.contains(normalized)) return true;
    return normalized.startsWith('image/') &&
        !normalized.contains('svg') &&
        !normalized.contains('heic');
  }

  static bool _looksLikeImageName(String name) {
    final lower = name.toLowerCase();
    return lower.endsWith('.png') ||
        lower.endsWith('.jpg') ||
        lower.endsWith('.jpeg') ||
        lower.endsWith('.gif') ||
        lower.endsWith('.webp') ||
        lower.endsWith('.bmp');
  }

  static Future<void> _emitFromFile(web.File file) async {
    try {
      final buffer = await file.arrayBuffer().toDart;
      final bytes = Uint8List.fromList(buffer.toDart.asUint8List());
      if (bytes.isEmpty || bytes.length > _maxBytes) return;
      var mime = file.type.trim();
      if (mime.isEmpty) {
        mime = _mimeFromName(file.name) ?? 'image/png';
      }
      if (!_isAllowedImageType(mime)) return;
      final image = ClipboardImage(
        bytes: bytes,
        mimeType: mime,
        fileName: _normalizeFileName(file.name, mime),
      );
      for (final handler in List<ClipboardImageHandler>.of(_handlers)) {
        handler(image);
      }
    } catch (_) {
      // Ignore unreadable clipboard files.
    }
  }

  static String? _mimeFromName(String name) {
    final lower = name.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.bmp')) return 'image/bmp';
    return null;
  }

  static String _normalizeFileName(String rawName, String mimeType) {
    final name = rawName.trim();
    final lower = name.toLowerCase();
    if (name.isNotEmpty &&
        lower != 'image.png' &&
        lower != 'blob' &&
        lower != 'image.jpg' &&
        lower != 'image.jpeg') {
      return name;
    }
    return _screenshotFileName(mimeType);
  }

  static String _screenshotFileName(String mimeType) {
    final stamp = DateFormat('yyyy-MM-dd-HHmm').format(DateTime.now());
    final ext = switch (mimeType.toLowerCase()) {
      'image/jpeg' || 'image/jpg' => 'jpg',
      'image/gif' => 'gif',
      'image/webp' => 'webp',
      'image/bmp' => 'bmp',
      _ => 'png',
    };
    return 'screenshot-$stamp.$ext';
  }
}
