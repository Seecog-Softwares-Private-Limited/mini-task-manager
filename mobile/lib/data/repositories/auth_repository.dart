import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../../core/auth/auth_storage.dart';
import '../models/login_response.dart';
import '../models/signup_result.dart';

class AuthRepository {
  AuthRepository({
    required ApiClient apiClient,
    required AuthStorage authStorage,
  })  : _api = apiClient,
        _storage = authStorage;

  final ApiClient _api;
  final AuthStorage _storage;

  Future<LoginResponse> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/auth/login',
        data: {'email': email.trim(), 'password': password},
      );
      final login = LoginResponse.fromJson(response.data!);
      await _storage.writeToken(login.accessToken);
      await _storage.writeUser(login.user);
      if (login.organizationId != null) {
        await _storage.writeOrgId(login.organizationId);
      }
      return login;
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<void> logout() async {
    try {
      await _api.dio.post<void>('/auth/logout');
    } on DioException catch (error) {
      if (error.response?.statusCode != 401) {
        throw ApiException.fromDio(error);
      }
    } finally {
      await _storage.clearAll();
    }
  }

  Future<String?> readToken() => _storage.readToken();

  Future<String?> readOrgId() => _storage.readOrgId();

  Future<SignupResult> signup({
    required String email,
    required String fullName,
    required String password,
  }) async {
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/auth/signup',
        data: {
          'email': email.trim().toLowerCase(),
          'fullName': fullName.trim(),
          'password': password,
        },
      );
      final data = response.data ?? const <String, dynamic>{};
      final hasToken = data['accessToken'] is String &&
          (data['accessToken'] as String).isNotEmpty &&
          data['user'] is Map;

      LoginResponse? login;
      if (hasToken) {
        login = LoginResponse.fromJson(data);
        await _storage.writeToken(login.accessToken);
        await _storage.writeUser(login.user);
        if (login.organizationId != null) {
          await _storage.writeOrgId(login.organizationId);
        }
      }

      return SignupResult(
        message: data['message'] as String? ??
            (login != null
                ? 'Account created. You are signed in.'
                : 'Verification email sent. Please check your inbox.'),
        emailVerified: data['emailVerified'] == true || login != null,
        login: login,
        devVerificationCode: data['devVerificationCode'] as String?,
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<LoginResponse> verifyEmail(String tokenOrCode) async {
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/auth/verify-email',
        data: {'token': tokenOrCode.trim()},
      );
      final login = LoginResponse.fromJson(response.data!);
      await _storage.writeToken(login.accessToken);
      await _storage.writeUser(login.user);
      if (login.organizationId != null) {
        await _storage.writeOrgId(login.organizationId);
      }
      return login;
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<String> resendVerificationEmail(String email) async {
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/auth/resend-verification',
        data: {'email': email.trim().toLowerCase()},
      );
      return response.data?['message'] as String? ??
          'If an account exists, a verification email was sent.';
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<void> forgotPassword(String email) async {
    try {
      await _api.dio.post<void>(
        '/auth/forgot-password',
        data: {'email': email.trim()},
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<bool> fetchHasPassword() async {
    try {
      final response = await _api.dio.get<Map<String, dynamic>>('/auth/password-status');
      return response.data?['hasPassword'] as bool? ?? true;
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<String> changePassword({
    String? currentPassword,
    required String newPassword,
  }) async {
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/auth/change-password',
        data: {
          if (currentPassword != null && currentPassword.isNotEmpty)
            'currentPassword': currentPassword,
          'newPassword': newPassword,
        },
      );
      return response.data?['message'] as String? ?? 'Password updated';
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<({String message, String pendingEmail, String? devCode})> requestEmailChange(
    String newEmail,
  ) async {
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/auth/request-email-change',
        data: {'newEmail': newEmail.trim()},
      );
      final data = response.data ?? const <String, dynamic>{};
      return (
        message: data['message'] as String? ?? 'Verification code sent',
        pendingEmail: data['pendingEmail'] as String? ?? newEmail.trim(),
        devCode: data['devVerificationCode'] as String?,
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<({String message, LoginResponse login})> verifyEmailChange(String code) async {
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/auth/verify-email-change',
        data: {'token': code.trim()},
      );
      final data = response.data!;
      final login = LoginResponse.fromJson(data);
      await _storage.writeToken(login.accessToken);
      await _storage.writeUser(login.user);
      if (login.organizationId != null) {
        await _storage.writeOrgId(login.organizationId);
      }
      return (
        message: data['message'] as String? ?? 'Email updated successfully',
        login: login,
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }
}
