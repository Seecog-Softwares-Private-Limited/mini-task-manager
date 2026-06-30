class ProjectMemberUser {
  const ProjectMemberUser({
    required this.id,
    required this.fullName,
    required this.email,
    this.avatarUrl,
  });

  final String id;
  final String fullName;
  final String email;
  final String? avatarUrl;

  factory ProjectMemberUser.fromJson(Map<String, dynamic> json) {
    return ProjectMemberUser(
      id: json['id'] as String? ?? '',
      fullName: json['fullName'] as String? ?? '',
      email: json['email'] as String? ?? '',
      avatarUrl: json['avatarUrl'] as String?,
    );
  }
}

class ProjectMember {
  const ProjectMember({
    required this.id,
    required this.projectId,
    required this.userId,
    required this.role,
    this.user,
  });

  final String id;
  final String projectId;
  final String userId;
  final String role;
  final ProjectMemberUser? user;

  factory ProjectMember.fromJson(Map<String, dynamic> json) {
    final rawUser = json['user'];
    return ProjectMember(
      id: json['id'] as String? ?? '',
      projectId: json['projectId'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      role: json['role'] as String? ?? '',
      user: rawUser is Map<String, dynamic> ? ProjectMemberUser.fromJson(rawUser) : null,
    );
  }
}
