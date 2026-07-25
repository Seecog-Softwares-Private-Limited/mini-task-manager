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

  int get descendantCount {
    var n = replies.length;
    for (final r in replies) {
      n += r.descendantCount;
    }
    return n;
  }

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

  /// Depth-first id walk for attachment loading.
  Iterable<String> get allIds sync* {
    yield id;
    for (final r in replies) {
      yield* r.allIds;
    }
  }

  static List<SubtaskComment> removeById(
    List<SubtaskComment> nodes,
    String id,
  ) {
    return [
      for (final n in nodes)
        if (n.id != id)
          n.copyWith(replies: removeById(n.replies, id)),
    ];
  }

  static List<SubtaskComment> replaceById(
    List<SubtaskComment> nodes,
    String id,
    SubtaskComment Function(SubtaskComment current) map,
  ) {
    return [
      for (final n in nodes)
        if (n.id == id)
          map(n)
        else
          n.copyWith(replies: replaceById(n.replies, id, map)),
    ];
  }

  static List<SubtaskComment> insertReply(
    List<SubtaskComment> nodes,
    String parentId,
    SubtaskComment reply,
  ) {
    return [
      for (final n in nodes)
        if (n.id == parentId)
          n.copyWith(replies: [...n.replies, reply])
        else
          n.copyWith(replies: insertReply(n.replies, parentId, reply)),
    ];
  }
}
