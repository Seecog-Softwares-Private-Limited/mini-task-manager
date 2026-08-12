class AppNotification {
  const AppNotification({
    required this.id,
    required this.userId,
    required this.isRead,
    required this.createdAt,
    this.title,
    this.message,
    this.data = const {},
  });

  final String id;
  final String userId;
  final String? title;
  final String? message;
  final bool isRead;
  final String createdAt;

  /// Deep-link payload from API (`taskId`, `subtaskId`, `projectId`, `type`, …).
  final Map<String, String> data;

  String? get taskId {
    final value = data['taskId']?.trim();
    return (value != null && value.isNotEmpty) ? value : null;
  }

  String? get subtaskId {
    final value = data['subtaskId']?.trim();
    return (value != null && value.isNotEmpty) ? value : null;
  }

  String? get projectId {
    final value = data['projectId']?.trim();
    return (value != null && value.isNotEmpty) ? value : null;
  }

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'] as String,
      userId: json['userId'] as String,
      title: json['title'] as String?,
      message: json['message'] as String?,
      isRead: json['isRead'] as bool? ?? false,
      createdAt: json['createdAt'] as String? ?? '',
      data: _parseData(json['data']),
    );
  }

  static Map<String, String> _parseData(dynamic raw) {
    if (raw is! Map) return const {};
    final out = <String, String>{};
    raw.forEach((key, value) {
      if (key == null || value == null) return;
      final text = value.toString().trim();
      if (text.isEmpty) return;
      out[key.toString()] = text;
    });
    return out;
  }
}
