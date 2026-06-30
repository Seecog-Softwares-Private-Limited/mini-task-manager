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
      id: json['id'] as String? ?? '',
      fileName: (json['fileName'] ?? json['originalFileName'] ?? 'Attachment').toString(),
      fileSizeBytes: (json['fileSizeBytes'] as num?)?.toInt(),
      mimeType: json['mimeType'] as String?,
    );
  }
}
