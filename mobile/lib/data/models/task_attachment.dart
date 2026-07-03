class TaskAttachment {
  const TaskAttachment({
    required this.id,
    required this.fileName,
    this.fileSizeBytes,
    this.mimeType,
  });

  final String id;
  final String fileName;
  final int? fileSizeBytes;
  final String? mimeType;

  factory TaskAttachment.fromJson(Map<String, dynamic> json) {
    return TaskAttachment(
      id: _parseId(json['id'] ?? json['attachmentId']),
      fileName: (json['fileName'] ??
              json['file_name'] ??
              json['originalFileName'] ??
              json['original_file_name'] ??
              'Attachment')
          .toString(),
      fileSizeBytes: _parseInt(json['fileSizeBytes'] ??
          json['file_size_bytes'] ??
          json['fileSize'] ??
          json['file_size']),
      mimeType: (json['mimeType'] ?? json['mime_type']) as String?,
    );
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
