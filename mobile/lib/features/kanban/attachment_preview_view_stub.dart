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
