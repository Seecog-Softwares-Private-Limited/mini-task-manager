class OrgInvitation {
  const OrgInvitation({
    required this.id,
    required this.organizationId,
    required this.email,
    required this.role,
    required this.status,
    required this.expiresAt,
    required this.createdAt,
    this.organizationName,
  });

  final String id;
  final String organizationId;
  final String? organizationName;
  final String email;
  final String role;
  final String status;
  final String expiresAt;
  final String createdAt;

  bool get isPending => status.toUpperCase() == 'PENDING';

  factory OrgInvitation.fromJson(Map<String, dynamic> json) {
    return OrgInvitation(
      id: json['id'] as String? ?? '',
      organizationId: json['organizationId'] as String? ?? '',
      organizationName: json['organizationName'] as String?,
      email: json['email'] as String? ?? '',
      role: json['role'] as String? ?? 'member',
      status: json['status'] as String? ?? '',
      expiresAt: json['expiresAt'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}
