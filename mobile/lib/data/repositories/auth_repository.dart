import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../../core/auth/auth_storage.dart';
import '../models/login_response.dart';

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
}
