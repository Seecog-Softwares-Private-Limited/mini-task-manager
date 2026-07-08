import 'dart:io';
import 'dart:typed_data';

import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';

Future<void> openAttachmentBytes({
  required Uint8List bytes,
  required String fileName,
  String? mimeType,
  bool download = false,
}) async {
  final safeName = fileName.trim().isEmpty ? 'attachment' : fileName.trim();
  final directory = download
      ? await getApplicationDocumentsDirectory()
      : await getTemporaryDirectory();
  final file = File('${directory.path}/$safeName');
  await file.writeAsBytes(bytes, flush: true);

  final result = await OpenFilex.open(
    file.path,
    type: mimeType,
  );
  if (result.type != ResultType.done) {
    throw UnsupportedError(result.message);
  }
}
