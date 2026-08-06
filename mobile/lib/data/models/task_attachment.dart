class TaskAttachment {
  const TaskAttachment({
    required this.id,
    required this.fileName,
    this.fileSizeBytes,
    this.mimeType,
    this.fileExtension,
    this.storedFileName,
  });

  final String id;
  final String fileName;
  final int? fileSizeBytes;
  final String? mimeType;
  final String? fileExtension;
  final String? storedFileName;

  factory TaskAttachment.fromJson(Map<String, dynamic> json) {
    final storedFileName = _nullableString(
      json['storedFileName'] ?? json['stored_file_name'],
    );
    final original = _nullableString(
      json['fileName'] ??
          json['file_name'] ??
          json['originalFileName'] ??
          json['original_file_name'],
    );
    final fileExtension = _nullableString(
      json['fileExtension'] ?? json['file_extension'],
    );
    final fileName = (original != null && original.isNotEmpty)
        ? original
        : (storedFileName != null && storedFileName.isNotEmpty
            ? storedFileName
            : 'Attachment');
    return TaskAttachment(
      id: _parseId(json['id'] ?? json['attachmentId']),
      fileName: fileName,
      fileSizeBytes: _parseInt(json['fileSizeBytes'] ??
          json['file_size_bytes'] ??
          json['fileSize'] ??
          json['file_size']),
      mimeType: _nullableString(json['mimeType'] ?? json['mime_type']),
      fileExtension: fileExtension,
      storedFileName: storedFileName,
    );
  }

  static String? _nullableString(dynamic raw) {
    if (raw == null) return null;
    final text = raw.toString().trim();
    return text.isEmpty ? null : text;
  }

  static String _parseId(dynamic raw) {
    if (raw == null) return '';
    if (raw is String) return raw.trim();
    if (raw is Map && raw['data'] is List) {
      final bytes = (raw['data'] as List).map((e) => (e as num).toInt()).toList();
      if (bytes.length == 16) {
        final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
        return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
      }
    }
    return raw.toString().trim();
  }

  static int? _parseInt(dynamic raw) {
    if (raw == null) return null;
    if (raw is int) return raw;
    if (raw is num) return raw.toInt();
    if (raw is String && raw.trim().isNotEmpty) return int.tryParse(raw.trim());
    return null;
  }
}
