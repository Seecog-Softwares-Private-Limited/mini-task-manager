import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:pdfx/pdfx.dart';

Widget buildBlobUrlPreview({
  required String blobUrl,
  required String mimeType,
  required String fileName,
  required double height,
}) {
  return SizedBox(
    height: height,
    child: const Center(
      child: Text('Preview is not available for this file type.'),
    ),
  );
}

Widget buildPdfBytesPreview({
  required Uint8List bytes,
  required double height,
}) {
  return SizedBox(
    height: height,
    child: PdfViewPinch(
      controller: PdfControllerPinch(
        document: PdfDocument.openData(bytes),
      ),
    ),
  );
}

Widget buildSvgBytesPreview({
  required Uint8List bytes,
  required double height,
}) {
  return SizedBox(
    height: height,
    child: InteractiveViewer(
      minScale: 0.5,
      maxScale: 4,
      child: Center(
        child: SvgPicture.memory(
          bytes,
          fit: BoxFit.contain,
        ),
      ),
    ),
  );
}
