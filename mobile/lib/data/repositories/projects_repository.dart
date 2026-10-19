import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../models/project.dart';
import '../models/project_member.dart';

class ProjectsRepository {
  ProjectsRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<List<Project>> fetchProjects({required String organizationId}) async {
    try {
      final response = await _api.dio.get<List<dynamic>>(
        '/projects',
        options: _api.withOrgHeader(organizationId),
      );
      final list = response.data ?? const [];
      return list
          .whereType<Map<String, dynamic>>()
          .map(Project.fromJson)
          .where((project) => !project.isArchived)
          .toList()
        ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<Project> createProject({
    required String organizationId,
    required String name,
    String? description,
    String? iconUrl,
    String visibility = 'PRIVATE',
  }) async {
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/projects',
        data: {
          'name': name.trim(),
          if (description != null && description.trim().isNotEmpty)
            'description': description.trim(),
          if (iconUrl != null && iconUrl.trim().isNotEmpty) 'iconUrl': iconUrl,
          'visibility': visibility.toUpperCase(),
        },
        options: _api.withOrgHeader(organizationId),
      );
      return Project.fromJson(response.data!);
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<Project> updateProject({
    required String projectId,
    required String organizationId,
    String? name,
    String? description,
    String? visibility,
    String? iconUrl,
    bool clearIcon = false,
  }) async {
    try {
      final response = await _api.dio.patch<Map<String, dynamic>>(
        '/projects/$projectId',
        data: {
          if (name != null) 'name': name.trim(),
          if (description != null) 'description': description.trim(),
          if (visibility != null) 'visibility': visibility.toUpperCase(),
          if (clearIcon)
            'iconUrl': ''
          else if (iconUrl != null)
            'iconUrl': iconUrl,
        },
        options: _api.withOrgHeader(organizationId),
      );
      return Project.fromJson(response.data!);
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<void> deleteProject({required String projectId}) async {
    try {
      await _api.dio.delete<void>('/projects/$projectId');
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<List<ProjectMember>> fetchProjectMembers({
    required String projectId,
    required String organizationId,
  }) async {
    try {
      final response = await _api.dio.get<List<dynamic>>(
        '/projects/$projectId/members',
        options: _api.withOrgHeader(organizationId),
      );
      final list = response.data ?? const [];
      return list
          .whereType<Map<String, dynamic>>()
          .map(ProjectMember.fromJson)
          .toList();
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<ProjectMember> addProjectMember({
    required String projectId,
    required String organizationId,
    required String userId,
    String role = 'CONTRIBUTOR',
  }) async {
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/projects/$projectId/members',
        data: {
          'userId': userId,
          'role': role,
        },
        options: _api.withOrgHeader(organizationId),
      );
      return ProjectMember.fromJson(response.data!);
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<void> removeProjectMember({
    required String projectId,
    required String organizationId,
    required String memberId,
  }) async {
    try {
      await _api.dio.delete<void>(
        '/projects/$projectId/members/$memberId',
        options: _api.withOrgHeader(organizationId),
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  /// Owner: which projects a workspace user can currently access.
  Future<List<String>> fetchUserProjectAccess({
    required String organizationId,
    required String userId,
  }) async {
    try {
      final response = await _api.dio.get<Map<String, dynamic>>(
        '/projects/users/$userId/access',
        options: _api.withOrgHeader(organizationId),
      );
      final raw = response.data?['projectIds'];
      if (raw is! List) return const [];
      return raw.map((e) => e.toString()).where((id) => id.isNotEmpty).toList();
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  /// Owner: replace a user's project access (visibility updates immediately).
  Future<List<String>> setUserProjectAccess({
    required String organizationId,
    required String userId,
    required Iterable<String> projectIds,
  }) async {
    try {
      final response = await _api.dio.put<Map<String, dynamic>>(
        '/projects/users/$userId/access',
        data: {'projectIds': projectIds.toList()},
        options: _api.withOrgHeader(organizationId),
      );
      final raw = response.data?['projectIds'];
      if (raw is! List) return const [];
      return raw.map((e) => e.toString()).where((id) => id.isNotEmpty).toList();
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }
}
