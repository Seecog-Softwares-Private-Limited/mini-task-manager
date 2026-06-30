class TaskCommentUser {
  const TaskCommentUser({
    required this.id,
    required this.fullName,
    required this.email,
    this.avatarUrl,
  });

  final String id;
  final String fullName;
  final String email;
  final String? avatarUrl;

  factory TaskCommentUser.fromJson(Map<String, dynamic> json) {
    return TaskCommentUser(
      id: json['id'] as String? ?? '',
      fullName: json['fullName'] as String? ?? '',
      email: json['email'] as String? ?? '',
      avatarUrl: json['avatarUrl'] as String?,
    );
  }
}

class TaskComment {
  const TaskComment({
    required this.id,
    required this.taskId,
    required this.userId,
    required this.body,
    required this.createdAt,
    required this.updatedAt,
    this.user,
  });

  final String id;
  final String taskId;
  final String userId;
  final String body;
  final String createdAt;
  final String updatedAt;
  final TaskCommentUser? user;

  factory TaskComment.fromJson(Map<String, dynamic> json) {
    final rawUser = json['user'];
    return TaskComment(
      id: json['id'] as String? ?? '',
      taskId: json['taskId'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      body: json['body'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
      updatedAt: json['updatedAt'] as String? ?? '',
      user: rawUser is Map<String, dynamic> ? TaskCommentUser.fromJson(rawUser) : null,
    );
  }
}
