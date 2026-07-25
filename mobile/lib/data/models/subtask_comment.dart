import '../models/task_comment.dart';

/// Author summary reused from task comments.
typedef SubtaskCommentUser = TaskCommentUser;

class SubtaskComment {
  const SubtaskComment({
    required this.id,
    required this.taskId,
    required this.subtaskId,
    required this.userId,
    required this.body,
    required this.createdAt,
    required this.updatedAt,
    this.parentId,
    this.user,
    this.replies = const [],
  });

  final String id;
  final String taskId;
  final String subtaskId;
  final String userId;
  final String body;
  final String? parentId;
  final String createdAt;
  final String updatedAt;
  final SubtaskCommentUser? user;
  final List<SubtaskComment> replies;

  bool get isRoot => parentId == null || parentId!.isEmpty;

  factory SubtaskComment.fromJson(Map<String, dynamic> json) {
    final rawUser = json['user'];
    final rawReplies = json['replies'];
    return SubtaskComment(
      id: json['id'] as String? ?? '',
      taskId: json['taskId'] as String? ?? '',
      subtaskId: json['subtaskId'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      body: json['body'] as String? ?? '',
      parentId: json['parentId'] as String?,
      createdAt: json['createdAt'] as String? ?? '',
      updatedAt: json['updatedAt'] as String? ?? '',
      user: rawUser is Map<String, dynamic>
          ? TaskCommentUser.fromJson(rawUser)
          : null,
      replies: rawReplies is List
          ? rawReplies
              .whereType<Map<String, dynamic>>()
              .map(SubtaskComment.fromJson)
              .toList()
          : const [],
    );
  }

  SubtaskComment copyWith({
    String? body,
    List<SubtaskComment>? replies,
  }) {
    return SubtaskComment(
      id: id,
      taskId: taskId,
      subtaskId: subtaskId,
      userId: userId,
      body: body ?? this.body,
      parentId: parentId,
      createdAt: createdAt,
      updatedAt: updatedAt,
      user: user,
      replies: replies ?? this.replies,
    );
  }
}
