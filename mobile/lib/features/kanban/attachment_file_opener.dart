export 'attachment_file_opener_stub.dart'
    if (dart.library.io) 'attachment_file_opener_native.dart'
    if (dart.library.js_interop) 'attachment_file_opener_web.dart';
