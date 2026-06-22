class AppNotification {
  const AppNotification({
    required this.id,
    required this.userId,
    required this.isRead,
    required this.createdAt,
    this.title,
    this.message,
  });

  final String id;
  final String userId;
  final String? title;
  final String? message;
  final bool isRead;
  final String createdAt;

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'] as String,
      userId: json['userId'] as String,
      title: json['title'] as String?,
      message: json['message'] as String?,
      isRead: json['isRead'] as bool? ?? false,
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}
