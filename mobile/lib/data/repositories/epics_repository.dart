import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../models/epic.dart';

class EpicsRepository {
  EpicsRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<List<Epic>> fetchEpics({
    required String organizationId,
    String? projectId,
  }) async {
    try {
      final response = await _api.dio.get<List<dynamic>>(
        '/epics',
        queryParameters: {
          if (projectId != null && projectId.isNotEmpty) 'projectId': projectId,
        },
        options: _api.withOrgHeader(organizationId),
      );
      final list = response.data ?? const [];
      return list.whereType<Map<String, dynamic>>().map(Epic.fromJson).toList();
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<Epic> createEpic({
    required String organizationId,
    required String projectId,
    required String title,
    String? description,
    String? color,
    String status = 'TODO',
    String? startDate,
    String? dueDate,
  }) async {
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/epics',
        data: {
          'projectId': projectId,
          'title': title.trim(),
          'status': status,
          if (description != null && description.trim().isNotEmpty)
            'description': description.trim(),
          if (color != null && color.isNotEmpty) 'color': color,
          if (startDate != null && startDate.isNotEmpty) 'startDate': startDate,
          if (dueDate != null && dueDate.isNotEmpty) 'dueDate': dueDate,
        },
        options: _api.withOrgHeader(organizationId),
      );
      return Epic.fromJson(response.data!);
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<Epic> updateEpic({
    required String organizationId,
    required String epicId,
    String? title,
    String? description,
    String? color,
    String? status,
    String? startDate,
    String? dueDate,
    bool clearDescription = false,
    bool clearStartDate = false,
    bool clearDueDate = false,
  }) async {
    try {
      final data = <String, dynamic>{};
      if (title != null) data['title'] = title.trim();
      if (clearDescription) {
        data['description'] = null;
      } else if (description != null) {
        data['description'] = description.trim();
      }
      if (color != null) data['color'] = color;
      if (status != null) data['status'] = status;
      if (clearStartDate) {
        data['startDate'] = null;
      } else if (startDate != null) {
        data['startDate'] = startDate;
      }
      if (clearDueDate) {
        data['dueDate'] = null;
      } else if (dueDate != null) {
        data['dueDate'] = dueDate;
      }

      final response = await _api.dio.patch<Map<String, dynamic>>(
        '/epics/$epicId',
        data: data,
        options: _api.withOrgHeader(organizationId),
      );
      return Epic.fromJson(response.data!);
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<void> deleteEpic({
    required String organizationId,
    required String epicId,
  }) async {
    try {
      await _api.dio.delete<void>(
        '/epics/$epicId',
        options: _api.withOrgHeader(organizationId),
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }
}
