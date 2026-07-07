import 'dart:typed_data';

import 'package:flutter/material.dart';

Widget buildBlobUrlPreview({
  required String blobUrl,
  required String mimeType,
  required String fileName,
  required double height,
}) {
  return SizedBox(
    height: height,
    child: Center(
      child: Text('Preview is available in the browser build.'),
    ),
  );
}

Widget buildPdfBytesPreview({
  required Uint8List bytes,
  required double height,
}) {
  return SizedBox(
    height: height,
    child: const Center(child: Text('PDF preview is not available.')),
  );
}

Widget buildSvgBytesPreview({
  required Uint8List bytes,
  required double height,
}) {
  return SizedBox(
    height: height,
    child: const Center(child: Text('SVG preview is not available.')),
  );
}
