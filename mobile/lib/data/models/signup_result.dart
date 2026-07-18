import 'login_response.dart';

class SignupResult {
  const SignupResult({
    required this.message,
    required this.emailVerified,
    this.login,
    this.devVerificationCode,
  });

  final String message;
  final bool emailVerified;
  final LoginResponse? login;
  final String? devVerificationCode;
}
