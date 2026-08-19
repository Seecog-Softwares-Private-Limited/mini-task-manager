import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../../data/models/login_response.dart';

class UsersRepository {
  UsersRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<AuthUser> fetchCurrentUser() async {
    try {
      final response = await _api.dio.get<Map<String, dynamic>>('/users/me');
      final data = response.data;
      if (data == null) {
        throw const ApiException(message: 'Profile not found');
      }
      return AuthUser.fromJson(data);
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<AuthUser> updateProfile({required String fullName}) async {
    try {
      final response = await _api.dio.patch<Map<String, dynamic>>(
        '/users/me',
        data: {'fullName': fullName.trim()},
      );
      return AuthUser.fromJson(response.data!);
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<AuthUser> uploadAvatar({
    required List<int> bytes,
    required String filename,
    String? mimeType,
  }) async {
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/users/me/avatar',
        data: FormData.fromMap({
          'file': MultipartFile.fromBytes(bytes, filename: filename),
        }),
      );
      return AuthUser.fromJson(response.data!);
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<void> deleteAvatar() async {
    try {
      await _api.dio.delete<void>('/users/me/avatar');
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<void> deleteAccount() async {
    try {
      await _api.dio.delete<void>('/users/me');
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }
}

final usersRepositoryProvider = Provider<UsersRepository>((ref) {
  return UsersRepository(apiClient: ref.watch(apiClientProvider));
});
