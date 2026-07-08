import 'dart:typed_data';
import 'dart:ui_web' as ui_web;

import 'package:flutter/material.dart';
import 'package:web/web.dart' as web;

import 'attachment_file_meta.dart';

Widget buildBlobUrlPreview({
  required String blobUrl,
  required String mimeType,
  required String fileName,
  required double height,
}) {
  final viewType = 'attachment-preview-${blobUrl.hashCode}-${fileName.hashCode}';
  ui_web.platformViewRegistry.registerViewFactory(viewType, (int viewId) {
    if (isPdfMime(mimeType, fileName)) {
      final iframe = web.HTMLIFrameElement()
        ..src = blobUrl
        ..style.border = 'none'
        ..style.width = '100%'
        ..style.height = '100%';
      return iframe;
    }

    final image = web.HTMLImageElement()
      ..src = blobUrl
      ..alt = fileName
      ..style.maxWidth = '100%'
      ..style.maxHeight = '100%'
      ..style.objectFit = 'contain'
      ..style.display = 'block'
      ..style.margin = 'auto';
    final container = web.HTMLDivElement()
      ..style.width = '100%'
      ..style.height = '100%'
      ..style.display = 'flex'
      ..style.alignItems = 'center'
      ..style.justifyContent = 'center'
      ..style.backgroundColor = '#000';
    container.append(image);
    return container;
  });

  return SizedBox(
    width: double.infinity,
    height: height,
    child: HtmlElementView(viewType: viewType),
  );
}

Widget buildPdfBytesPreview({
  required Uint8List bytes,
  required double height,
}) {
  return buildBlobUrlPreview(
    blobUrl: '',
    mimeType: 'application/pdf',
    fileName: 'preview.pdf',
    height: height,
  );
}

Widget buildSvgBytesPreview({
  required Uint8List bytes,
  required double height,
}) {
  return buildBlobUrlPreview(
    blobUrl: '',
    mimeType: 'image/svg+xml',
    fileName: 'preview.svg',
    height: height,
  );
}
