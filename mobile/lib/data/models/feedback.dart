class FeedbackMedia {
  const FeedbackMedia({
    required this.id,
    required this.fileName,
    required this.fileSize,
    required this.url,
    this.mimeType,
  });

  final String id;
  final String fileName;
  final String? mimeType;
  final int fileSize;
  final String url;

  factory FeedbackMedia.fromJson(Map<String, dynamic> json) {
    return FeedbackMedia(
      id: json['id'] as String,
      fileName: json['fileName'] as String? ?? 'file',
      mimeType: json['mimeType'] as String?,
      fileSize: json['fileSize'] as int? ?? 0,
      url: json['url'] as String? ?? '',
    );
  }
}

class AppFeedback {
  const AppFeedback({
    required this.id,
    required this.organizationId,
    required this.userId,
    required this.title,
    required this.description,
    required this.media,
    required this.createdAt,
    required this.updatedAt,
    this.authorName,
  });

  final String id;
  final String organizationId;
  final String userId;
  final String? authorName;
  final String title;
  final String description;
  final List<FeedbackMedia> media;
  final String createdAt;
  final String updatedAt;

  factory AppFeedback.fromJson(Map<String, dynamic> json) {
    final rawMedia = json['media'] as List<dynamic>? ?? const [];
    return AppFeedback(
      id: json['id'] as String,
      organizationId: json['organizationId'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      authorName: json['authorName'] as String?,
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      media: rawMedia
          .whereType<Map<String, dynamic>>()
          .map(FeedbackMedia.fromJson)
          .toList(),
      createdAt: json['createdAt'] as String? ?? '',
      updatedAt: json['updatedAt'] as String? ?? '',
    );
  }
}
