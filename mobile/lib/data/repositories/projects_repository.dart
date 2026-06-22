import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../models/project.dart';

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
}
