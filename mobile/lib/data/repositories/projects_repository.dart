import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../models/project.dart';
import '../models/project_member.dart';

class ProjectsRepository {
  ProjectsRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<List<Project>> fetchProjects({
    required String organizationId,
    bool includeArchived = false,
  }) async {
    try {
      final response = await _api.dio.get<List<dynamic>>(
        '/projects',
        options: _api.withOrgHeader(organizationId),
      );
      final list = response.data ?? const [];
      return list
          .whereType<Map<String, dynamic>>()
          .map(Project.fromJson)
          .where((project) => includeArchived || !project.isArchived)
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
    String visibility = 'PRIVATE',
  }) async {
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/projects',
        data: {
          'name': name.trim(),
          if (description != null && description.trim().isNotEmpty)
            'description': description.trim(),
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
    required String organizationId,
    required String projectId,
    String? name,
    String? description,
    String? visibility,
    bool? isArchived,
  }) async {
    try {
      final data = <String, dynamic>{
        if (name != null) 'name': name.trim(),
        if (description != null) 'description': description.trim(),
        if (visibility != null) 'visibility': visibility.toUpperCase(),
        if (isArchived != null) 'isArchived': isArchived,
      };
      final response = await _api.dio.patch<Map<String, dynamic>>(
        '/projects/$projectId',
        data: data,
        options: _api.withOrgHeader(organizationId),
      );
      return Project.fromJson(response.data!);
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<void> deleteProject({
    required String organizationId,
    required String projectId,
  }) async {
    try {
      await _api.dio.delete<Map<String, dynamic>>(
        '/projects/$projectId',
        options: _api.withOrgHeader(organizationId),
      );
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
}
