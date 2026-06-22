import 'package:equatable/equatable.dart';

class AuthUser extends Equatable {
  const AuthUser({
    required this.id,
    required this.email,
    required this.fullName,
    this.avatarUrl,
  });

  final String id;
  final String email;
  final String fullName;
  final String? avatarUrl;

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String,
      email: json['email'] as String,
      fullName: json['fullName'] as String? ?? json['email'] as String,
      avatarUrl: json['avatarUrl'] as String?,
    );
  }

  @override
  List<Object?> get props => [id, email, fullName, avatarUrl];
}

class LoginResponse extends Equatable {
  const LoginResponse({
    required this.accessToken,
    required this.user,
    this.organizationId,
  });

  final String accessToken;
  final AuthUser user;
  final String? organizationId;

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      accessToken: json['accessToken'] as String,
      user: AuthUser.fromJson(json['user'] as Map<String, dynamic>),
      organizationId: json['organizationId'] as String?,
    );
  }

  @override
  List<Object?> get props => [accessToken, user, organizationId];
}
